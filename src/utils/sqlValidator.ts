import { parse, astVisitor } from 'pgsql-ast-parser';
import { SchemaMetadata } from '../types/database';

export function sanitizeSql(sql: string): string {
    return sql.replace(/```sql/gi, '').replace(/```/g, '').trim();
}

function cleanSqlIdentifier(name: string): string {
    return name.replace(/["'\[\]`]/g, '').toLowerCase().trim();
}

export function validateSql(rawSql: string, schema: SchemaMetadata, dialect: 'postgres' | 'mysql' | 'sqlite' | 'duckdb' = 'postgres'): string {
    const sanitizedSql = rawSql.trim().replace(/^```(sql)?\n?|```$/gi, '');

    // For non-postgres dialects, we skip AST validation for now
    // as pgsql-ast-parser is postgres-specific.
    if (dialect !== 'postgres') {
        return sanitizedSql;
    }

    const upperSql = sanitizedSql.toUpperCase();

    // 1. Security check: Block destructive keywords
    const destructiveKeywords = [
        'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER',
        'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'
    ];

    const hasDestructive = destructiveKeywords.some(
        keyword => upperSql.includes(keyword + ' ') || upperSql.startsWith(keyword)
    );

    if (hasDestructive) {
        return '-- ERROR: Destructive queries are not permitted.';
    }

    if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('-- ERROR') && !upperSql.startsWith('-- INFO')) {
        return '-- ERROR: Query must start with SELECT.';
    }

    // For non-postgres dialects, we skip AST validation for now
    // as pgsql-ast-parser is postgres-specific.
    if (dialect !== 'postgres') {
        return sanitizedSql;
    }

    // 2. AST Parse
    let ast;
    try {
        ast = parse(sanitizedSql);
    } catch (e) {
        return '-- ERROR: Invalid SQL syntax.';
    }

    if (ast.length === 0) {
        return '-- ERROR: Empty query.';
    }

    // 3. Prepare Schema Metadata sets for fast lookup
    const schemaTables = new Map<string, Set<string>>();
    schema.tables.forEach(t => {
        schemaTables.set(cleanSqlIdentifier(t.name), new Set(t.columns.map(c => cleanSqlIdentifier(c))));
    });

    let validationError: string | null = null;

    // 4. Collect SELECT-level aliases so they are NOT falsely flagged as unknown columns.
    //    e.g. SUM(il.UnitPrice * il.Quantity) AS revenue → "revenue" is a valid alias in ORDER BY
    //    We inspect the raw AST JSON directly since pgsql-ast-parser uses 'columns' on select statements.
    const selectAliases = new Set<string>();
    try {
        const stmt = ast[0] as any;
        // pgsql-ast-parser represents SELECT columns under stmt.columns[]
        // Each column may have: { expr: ..., alias: { name: '...' } } or { expr: ..., alias: '...' }
        const columns = stmt?.columns ?? stmt?.selectStatement?.columns ?? [];
        for (const col of columns) {
            const alias = col?.alias;
            if (alias) {
                const aliasName = typeof alias === 'object' ? alias.name : alias;
                if (aliasName) selectAliases.add(cleanSqlIdentifier(String(aliasName)));
            }
        }
    } catch (_) { /* ignore alias collection errors */ }

    // 5. Validate table references
    const aliasMapper = astVisitor(mapper => ({
        tableRef: t => {
            const tableName = cleanSqlIdentifier(t.name);
            if (!schemaTables.has(tableName)) {
                validationError = `-- ERROR: Table '${t.name}' not found in schema.`;
            }
            return mapper.super().tableRef(t);
        },
    }));

    // 6. Validate column references
    const columnMapper = astVisitor(mapper => ({
        ref: r => {
            if (validationError) return mapper.super().ref(r);

            const cleanedColName = cleanSqlIdentifier(r.name);

            // Skip validation for SELECT-level aliases used in ORDER BY / HAVING
            // e.g. ORDER BY revenue  where  revenue = SUM(il.UnitPrice * il.Quantity)
            if (selectAliases.has(cleanedColName)) {
                return mapper.super().ref(r);
            }

            // In pgsql-ast-parser, r.table could be a QName object if qualified
            const tableNameStr = typeof r.table === 'object' && r.table !== null ? r.table.name : (r.table as string | undefined);

            if (tableNameStr) {
                const prefixName = cleanSqlIdentifier(tableNameStr);
                if (schemaTables.has(prefixName)) {
                    // Prefix is a real table name → enforce strict column check
                    if (!schemaTables.get(prefixName)!.has(cleanedColName)) {
                        validationError = `-- ERROR: Column '${r.name}' does not exist in table '${tableNameStr}'.`;
                    }
                }
                // Prefix is a table alias (not a raw table name) → skip, cannot resolve here
            } else {
                // No table prefix → check if column exists in ANY table in schema
                let columnExistsAnywhere = false;
                const allColumnsSets = Array.from(schemaTables.values());
                for (let i = 0; i < allColumnsSets.length; i++) {
                    if (allColumnsSets[i].has(cleanedColName)) {
                        columnExistsAnywhere = true;
                        break;
                    }
                }
                if (!columnExistsAnywhere) {
                    validationError = `-- ERROR: Column '${r.name}' does not exist in the schema.`;
                }
            }
            return mapper.super().ref(r);
        }
    }));

    try {
        aliasMapper.statement(ast[0]);
        if (validationError) return validationError;

        columnMapper.statement(ast[0]);
        if (validationError) return validationError;

    } catch (e) {
        return '-- ERROR: Failed to parse SQL AST tree.';
    }

    return sanitizedSql;
}
