import { SchemaMetadata } from '../types/database';

export function parseSqlSchema(sql: string): SchemaMetadata {
    const metadata: SchemaMetadata = { tables: [], relations: [] };

    // Remove comments (single line and multi-line)
    const cleanSql = sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

    // Regex to extract table creation blocks.
    // Assumes pattern: CREATE TABLE [IF NOT EXISTS] table_name ( ... )
    // and captures the 'table_name' and the 'content_inside_parentheses'.
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)\s*\(([\s\S]*?)\);/gi;
    let match;

    while ((match = createTableRegex.exec(cleanSql)) !== null) {
        // Clean up table names e.g., "public"."users" -> users or just capture it as is
        const tableName = match[1].replace(/["']/g, '').trim();
        const columnsString = match[2];

        // Split by commas, but ignore commas inside parentheses (like decimal(10,2))
        // A simplified split logic:
        const lines = columnsString.split(/,(?![^(]*\))/);

        const columns: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Extract inline foreign keys
            if (/FOREIGN\s+KEY/.test(trimmedLine.toUpperCase())) {
                const fkMatch = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^(]+)\s*\(([^)]+)\)/i.exec(trimmedLine);
                if (fkMatch) {
                    const col = fkMatch[1].replace(/["']/g, '').trim();
                    const refTable = fkMatch[2].replace(/["']/g, '').trim();
                    const refCol = fkMatch[3].replace(/["']/g, '').trim();
                    metadata.relations.push(`${tableName}.${col} -> ${refTable}.${refCol}`);
                }
            }
            // Extract PRIMARY KEY constraints
            else if (/PRIMARY\s+KEY\s*\(/.test(trimmedLine.toUpperCase())) {
                // It's a constraint line, not a column
                continue;
            }
            else if (/CONSTRAINT\s+/i.test(trimmedLine)) {
                // Table constraint (often used for FKs or PKs)
                const fkMatch = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^(]+)\s*\(([^)]+)\)/i.exec(trimmedLine);
                if (fkMatch) {
                    const col = fkMatch[1].replace(/["']/g, '').trim();
                    const refTable = fkMatch[2].replace(/["']/g, '').trim();
                    const refCol = fkMatch[3].replace(/["']/g, '').trim();
                    metadata.relations.push(`${tableName}.${col} -> ${refTable}.${refCol}`);
                }
            }
            else {
                // It's a standard column definition. Usually: column_name data_type [constraints]
                const colParts = trimmedLine.split(/\s+/);
                // Clean column name
                const colName = colParts[0].replace(/["']/g, '');
                if (colName && colParts.length > 1 && !/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|CHECK)$/i.test(colName)) {
                    columns.push(colName);
                }
            }
        }

        if (tableName) {
            metadata.tables.push({
                name: tableName,
                columns,
            });
        }
    }

    // Extract ALTER TABLE ADD CONSTRAINT FOREIGN KEY relations separately
    const alterTableFkRegex = /ALTER\s+TABLE\s+(?:ONLY\s+)?([^\s]+)\s+ADD\s+CONSTRAINT\s+[^\s]+\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^(]+)\s*\(([^)]+)\)/gi;
    let alterMatch;
    while ((alterMatch = alterTableFkRegex.exec(cleanSql)) !== null) {
        const sourceTable = alterMatch[1].replace(/["']/g, '').trim();
        const sourceCol = alterMatch[2].replace(/["']/g, '').trim();
        const refTable = alterMatch[3].replace(/["']/g, '').trim();
        const refCol = alterMatch[4].replace(/["']/g, '').trim();

        metadata.relations.push(`${sourceTable}.${sourceCol} -> ${refTable}.${refCol}`);
    }

    return metadata;
}
