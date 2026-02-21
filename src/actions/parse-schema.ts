'use server';

import Groq from 'groq-sdk';
import { SchemaMetadata, TokenUsage } from '../types/database';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Pre-processor to clean the Prisma schema before sending to AI.
 * Strips generators, datasources, and comments.
 */
function preprocessPrisma(schema: string): string {
    return schema
        .replace(/generator\s+[^{]+\{[^}]+\}/gi, '')
        .replace(/datasource\s+[^{]+\{[^}]+\}/gi, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

export async function parsePrismaSchema(prismaContent: string): Promise<{ schema: SchemaMetadata; usage?: TokenUsage }> {
    try {
        const cleanedSchema = preprocessPrisma(prismaContent);

        const systemPrompt = `
You are a specialized Prisma Schema Parser. 
Your goal is to extract Table names, Column names, and Relationships from a Prisma schema and return them in a strict JSON format.

Output Format:
{
  "tables": [
    { "name": "TableName", "columns": ["col1", "col2"] }
  ],
  "relations": ["TableA.col -> TableB.id"]
}

Rules:
1. Return ONLY the JSON object. No explanation, no markdown backticks.
2. In 'relations', use the format "SourceTable.SourceColumn -> TargetTable.TargetColumn".
3. Extract @relation fields carefully to map the correct FKs.
`;

        const userPrompt = `
Prisma Schema:
${cleanedSchema}

Extract the metadata according to the rules.
`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            max_tokens: 2048,
            top_p: 1,
            response_format: { type: 'json_object' }
        });

        const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
        const schema = JSON.parse(responseContent) as SchemaMetadata;

        let usage: TokenUsage | undefined;
        const gUsage = chatCompletion.usage;
        if (gUsage) {
            usage = {
                prompt_tokens: gUsage.prompt_tokens,
                completion_tokens: gUsage.completion_tokens,
                total_tokens: gUsage.total_tokens,
                model_name: chatCompletion.model || 'llama-3.1-8b-instant'
            };
        }

        return { schema, usage };
    } catch (error: any) {
        console.error('Prisma Parsing Error:', error);
        throw new Error('Failed to parse Prisma schema: ' + error.message);
    }
}

export async function parseCsvSchema(csvContent: string): Promise<SchemaMetadata> {
    try {
        const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 0) throw new Error('CSV is empty');

        const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));

        return {
            tables: [
                {
                    name: 'data',
                    columns: headers
                }
            ],
            relations: []
        };
    } catch (error: any) {
        console.error('CSV Parsing Error:', error);
        throw new Error('Failed to parse CSV: ' + error.message);
    }
}
