'use client';

import { Container, Title, Text, Box, Paper, Divider, Alert, SimpleGrid, Badge, Group, Collapse, ActionIcon, Stack, Textarea, Button, Select } from '@mantine/core';
import { SchemaUploader } from '../components/SchemaUploader';
import { ChatInput } from '../components/ChatInput';
import { SqlOutput } from '../components/SqlOutput';
import { useState } from 'react';
import { SchemaMetadata, TokenUsage } from '../types/database';
import { parseSqlSchema } from '../utils/parser';
import { generateSql } from '../actions/generate-sql';
import { generateSuggestions } from '../actions/generate-suggestions';
import { parsePrismaSchema, parseCsvSchema } from '../actions/parse-schema';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function Home() {
    const [schemaMetadata, setSchemaMetadata] = useState<SchemaMetadata | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isParsingSchema, setIsParsingSchema] = useState(false);
    const [sqlResult, setSqlResult] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [isSchemaOpen, setIsSchemaOpen] = useState(true);
    const [dialect, setDialect] = useState<'postgres' | 'mysql' | 'sqlite' | 'duckdb'>('postgres');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [sqlUsage, setSqlUsage] = useState<TokenUsage | null>(null);
    const [suggestionUsage, setSuggestionUsage] = useState<TokenUsage | null>(null);

    const handleUpload = async (content: string, uploadedName: string) => {
        try {
            setErrorMsg('');
            setUploadSuccess(false);
            setSqlUsage(null);

            let metadata: SchemaMetadata;

            if (uploadedName.toLowerCase().endsWith('.prisma') || uploadedName === 'Raw Prisma') {
                setIsParsingSchema(true);
                const result = await parsePrismaSchema(content);
                metadata = result.schema;
                setIsParsingSchema(false);
            } else if (uploadedName.toLowerCase().endsWith('.csv') || uploadedName === 'Raw CSV') {
                setIsParsingSchema(true);
                metadata = await parseCsvSchema(content);
                setIsParsingSchema(false);
            } else {
                metadata = parseSqlSchema(content);
            }

            if (!metadata.tables || metadata.tables.length === 0) {
                setErrorMsg("No tables found in the uploaded content. Ensure it contains standard CREATE TABLE or Prisma model syntax.");
            } else {
                setSchemaMetadata(metadata);
                setFileName(uploadedName);
                setSqlResult('');
                setUploadSuccess(true);
                setIsSchemaOpen(true);

                // Fetch suggestions using the cheap model
                generateSuggestions(metadata).then(res => {
                    setSuggestions(res.suggestions);
                    setSuggestionUsage(res.usage || null);
                });
            }
        } catch (e: any) {
            setErrorMsg("Failed to parse schema: " + e.message);
            setSchemaMetadata(null);
            setFileName(null);
            setIsParsingSchema(false);
        }
    };

    const handleClearSchema = () => {
        setSchemaMetadata(null);
        setFileName(null);
        setSqlResult('');
        setErrorMsg('');
        setUploadSuccess(false);
        setSuggestions([]);
        setSqlUsage(null);
        setSuggestionUsage(null);
    };

    const handleChatSubmit = async (question: string) => {
        if (!schemaMetadata) {
            setErrorMsg("Please upload a schema first.");
            return;
        }

        setIsLoading(true);
        setErrorMsg('');
        setSqlUsage(null);
        try {
            const response = await generateSql(question, schemaMetadata, dialect);
            setSqlResult(response.sql);
            if (response.usage) setSqlUsage(response.usage);
        } catch (e: any) {
            setErrorMsg('Error generating SQL: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container size="md" py="xl">
            <Box mb="xl">
                <Title order={1} mb="xs" c="blue.5">
                    QueryCraft Powered By AI
                </Title>
                <Text c="dimmed">
                    Secure, zero-DB Text-to-SQL system. Upload your `.sql` structure file, then ask questions about the data.
                </Text>
            </Box>

            {errorMsg && (
                <Alert icon={<AlertCircle size={16} />} title="Error" color="red" mb="md" variant="light">
                    {errorMsg}
                </Alert>
            )}

            <Box style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Paper withBorder p="md" radius="md" bg="dark.6">
                    <Group align="center" mb="sm">
                        <Title order={5} fw={500}>1. Upload Schema Metadata</Title>
                        {isParsingSchema && <Loader2 size={16} className="animate-spin" color="blue" />}
                    </Group>
                    <SchemaUploader
                        fileName={fileName}
                        onUpload={handleUpload}
                        onClear={handleClearSchema}
                    />

                    {uploadSuccess && schemaMetadata && (
                        <Box mt="md">
                            <Group align="flex-start" mb="md" wrap="nowrap">
                                <Alert icon={<CheckCircle size={16} />} title="Schema Uploaded" color="teal" variant="light" style={{ flex: 1 }}>
                                    Successfully parsed {schemaMetadata.tables.length} tables from {fileName}.
                                </Alert>
                                <ActionIcon onClick={() => setIsSchemaOpen((o) => !o)} variant="default" size="lg" aria-label="Toggle schema list">
                                    {isSchemaOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </ActionIcon>
                            </Group>

                            <Collapse in={isSchemaOpen}>
                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                    {schemaMetadata.tables.map((table, i) => (
                                        <Paper key={i} withBorder p="xs" radius="sm" bg="dark.7" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <Title order={6} c="blue.4">{table.name}</Title>
                                            <Group gap={4}>
                                                {table.columns.map((col, idx) => (
                                                    <Badge key={idx} variant="dot" color="blue" size="xs" styles={{ label: { textTransform: 'none' } }}>
                                                        {col}
                                                    </Badge>
                                                ))}
                                            </Group>
                                        </Paper>
                                    ))}
                                </SimpleGrid>
                            </Collapse>
                        </Box>
                    )}
                </Paper>

                <Paper withBorder p="md" radius="md" bg="dark.6" className="relative">
                    <Title order={5} mb="sm" fw={500}>Query Prompt</Title>
                    <ChatInput
                        onSubmit={handleChatSubmit}
                        isLoading={isLoading}
                        disabled={!schemaMetadata}
                        dialect={dialect}
                        onDialectChange={setDialect}
                        suggestions={suggestions}
                    />
                </Paper>

                {sqlResult && (
                    <Box mt="md">
                        <Divider mb="xl" label="Result" labelPosition="center" />
                        <SqlOutput sql={sqlResult} />

                        {sqlUsage && (
                            <Group justify="flex-end" mt="xs" gap="xs">
                                <Text size="xs" c="dimmed" span>
                                    Model: <Badge size="xs" variant="light" color="gray">{sqlUsage.model_name}</Badge>
                                </Text>
                                <Text size="xs" c="dimmed" span>
                                    Tokens: <Badge size="xs" variant="outline" color="blue">{sqlUsage.total_tokens}</Badge>
                                    <Text span size="xs" ml={4}>({sqlUsage.prompt_tokens} in, {sqlUsage.completion_tokens} out)</Text>
                                </Text>
                            </Group>
                        )}
                    </Box>
                )}
            </Box>
        </Container>
    );
}
