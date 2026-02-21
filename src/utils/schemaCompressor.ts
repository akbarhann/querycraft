import { SchemaMetadata } from '../types/database';

export function compressSchema(schema: SchemaMetadata): string {
    const compressedTables = schema.tables.map(table => {
        return `Table: ${table.name}\nColumns: ${table.columns.join(', ')}`;
    }).join('\n\n');

    const compressedRelations = schema.relations.length > 0
        ? `Relations:\n${schema.relations.join('\n')}`
        : '';

    return `${compressedTables}\n\n${compressedRelations}`.trim();
}
