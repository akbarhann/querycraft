export interface SchemaMetadata {
    tables: {
        name: string;
        columns: string[];
    }[];
    relations: string[];
}

export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    model_name: string;
}

export interface SqlGenerationResponse {
    sql: string;
    usage?: TokenUsage;
}

export interface SuggestionResponse {
    suggestions: string[];
    usage?: TokenUsage;
}
