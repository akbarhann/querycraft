'use server';

import Groq from 'groq-sdk';
import { SchemaMetadata, TokenUsage, SqlGenerationResponse } from '../types/database';
import { compressSchema } from '../utils/schemaCompressor';
import { validateSql } from '../utils/sqlValidator';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `
You are an expert SQL Architect. Your job is to construct precise SELECT-only SQL queries.

Core Rules:
- Generate SELECT-only queries. Never INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE.
- Use ONLY the tables and columns listed in the provided Schema Metadata. Do NOT invent column names.
- If destructive queries are requested, return: -- ERROR: Destructive queries are not permitted.
- If the question is impossible to answer from the schema, return a friendly explanation starting with -- INFO:. 
  Example: "-- INFO: It looks like your database doesn't have a 'Department' table. I can only see [List relevant tables]."
- Output raw SQL or the -- INFO/-- ERROR message only. No explanations, no markdown fences, no code blocks.

Handling Derived / Calculated Values:
- Words like "revenue", "total sales", "profit", "earnings", "income", "pendapatan" are NOT real columns.
  They must be CALCULATED using aggregate functions (SUM, COUNT, AVG) combined with the appropriate JOINs.
- Example: "revenue per artist" → JOIN Artist → Album → Track → InvoiceLine, then SUM(il.UnitPrice * il.Quantity).
- Always use column aliases (AS revenue, AS total_sales, etc.) for calculated expressions.
- You may reference those aliases in ORDER BY clauses.

JOIN Strategy:
- Always trace the full FK chain from the schema relations to join tables correctly.
- Prefer INNER JOIN unless the question implies optionality.
- Always use table aliases for clarity.
`;

export async function generateSql(
    userQuestion: string,
    schemaMetadata: SchemaMetadata,
    dialect: 'postgres' | 'mysql' | 'sqlite' = 'postgres'
): Promise<SqlGenerationResponse> {
    try {
        const compressedSchema = compressSchema(schemaMetadata);

        const dialectPrompt = `You must generate valid ${dialect.toUpperCase()} SQL. 
        Note the quoting and syntax specific to ${dialect.toUpperCase()} (e.g. ${dialect === 'mysql' ? 'backticks for identifiers, LIMIT offset, count' :
                dialect === 'sqlite' ? 'double quotes or no quotes for identifiers, LIMIT count OFFSET offset' :
                    'double quotes for identifiers, LIMIT count OFFSET offset'
            }).`;

        const userPrompt = `
Schema Metadata:
${compressedSchema}

Target SQL Dialect: ${dialect.toUpperCase()}
${dialectPrompt}

User Question:
${userQuestion}

Construct the SQL query based strictly on the above details.
`;

        let responseContent = '';
        let usage: TokenUsage | undefined;

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                model: 'llama-3.3-70b-versatile', // Primary Llama 3.3 model
                temperature: 0.1,
                max_tokens: 1024,
                top_p: 1,
            });

            responseContent = chatCompletion.choices[0]?.message?.content || '';
            const gUsage = chatCompletion.usage;
            if (gUsage) {
                usage = {
                    prompt_tokens: gUsage.prompt_tokens,
                    completion_tokens: gUsage.completion_tokens,
                    total_tokens: gUsage.total_tokens,
                    model_name: chatCompletion.model || 'llama-3.3-70b-versatile'
                };
            }
        } catch (error: any) {
            console.warn('Groq API Error on Llama, falling back to moonshotai/kimi-k2-instruct-0905:', error.message);

            // Fallback via OpenRouter
            try {
                const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'moonshotai/kimi-k2-instruct-0905',
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: userPrompt },
                        ],
                        temperature: 0.1,
                        max_tokens: 1024,
                        top_p: 1
                    })
                });

                if (!openRouterResponse.ok) {
                    const errorText = await openRouterResponse.text();
                    throw new Error(`OpenRouter API responded with status: ${openRouterResponse.status}, details: ${errorText}`);
                }

                const fallbackData = await openRouterResponse.json();
                responseContent = fallbackData.choices[0]?.message?.content || '';
                const fUsage = fallbackData.usage;
                if (fUsage) {
                    usage = {
                        prompt_tokens: fUsage.prompt_tokens,
                        completion_tokens: fUsage.completion_tokens,
                        total_tokens: fUsage.total_tokens,
                        model_name: fallbackData.model || 'moonshotai/kimi-k2-instruct-0905'
                    };
                }
            } catch (fallbackError: any) {
                console.error('Fallback API Error:', fallbackError);
                return {
                    sql: `-- Error generating SQL: Both primary and fallback models failed. ${error.message} | ${fallbackError.message}`
                };
            }
        }

        return {
            sql: validateSql(responseContent, schemaMetadata, dialect),
            usage
        };
    } catch (globalError: any) {
        console.error('Unexpected Error:', globalError);
        return {
            sql: `-- Error: ${globalError.message}`
        };
    }
}
