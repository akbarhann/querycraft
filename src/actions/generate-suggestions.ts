'use server';

import Groq from 'groq-sdk';
import { SchemaMetadata, SuggestionResponse, TokenUsage } from '../types/database';
import { compressSchema } from '../utils/schemaCompressor';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const SUGGESTION_PROMPT = `
You are a Database Expert Architect.
Target Goal: Generate 4 natural language questions based STRICTLY on the provided schema metadata.

Rules:
1. ONLY use tables and columns present in the schema.
2. Ensure questions are diverse:
   - One simple retrieval (e.g. Find all X where Y...)
   - One aggregation (e.g. Total count of A, or average of B...)
   - One JOIN-based question (e.g. Find names of X who have Y...)
   - One ordering/top-N question (e.g. Top 5 X by Z...)
3. Keep it professional and concise.
4. Output MUST be a JSON object with a "suggestions" key containing an array of strings.

Example Output:
{
  "suggestions": [
    "List all employees in the Sales department.",
    "What is the total revenue for the year 2023?",
    "Find the top 3 products by total units sold.",
    "Which customers have placed more than 5 orders?"
  ]
}
`;

export async function generateSuggestions(schemaMetadata: SchemaMetadata): Promise<SuggestionResponse> {
    try {
        const compressedSchema = compressSchema(schemaMetadata);

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: SUGGESTION_PROMPT },
                { role: 'user', content: `Provided Schema:\n${compressedSchema}` },
            ],
            model: 'llama-3.1-8b-instant',
            temperature: 0.6,
            max_tokens: 512,
            response_format: { type: 'json_object' }
        });

        const content = chatCompletion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

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

        return {
            suggestions: parsed.suggestions && Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
            usage
        };
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return { suggestions: [] };
    }
}
