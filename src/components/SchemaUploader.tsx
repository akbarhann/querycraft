'use client';

import { FileInput, Box, ActionIcon, Tooltip, Select, Textarea, Button, Group, Stack } from '@mantine/core';
import { Upload, Trash, Code2 } from 'lucide-react';
import { useState } from 'react';

interface SchemaUploaderProps {
    onUpload: (sqlContent: string, fileName: string) => void;
    fileName: string | null;
    onClear: () => void;
}

export function SchemaUploader({ onUpload, fileName, onClear }: SchemaUploaderProps) {
    const [inputMethod, setInputMethod] = useState<'sql' | 'raw' | 'prisma' | 'raw_prisma' | 'csv' | 'raw_csv'>('sql');
    const [rawDdl, setRawDdl] = useState('');

    const handleFileChange = async (payload: File | null) => {
        if (!payload) return;

        let text = '';
        if (payload.name.toLowerCase().endsWith('.csv')) {
            // Optimization: Read only the first 16KB of CSV to get headers
            const chunk = payload.slice(0, 16384);
            text = await chunk.text();
        } else {
            text = await payload.text();
        }

        onUpload(text, payload.name);
    };

    const handleRawSubmit = () => {
        if (!rawDdl.trim()) return;
        let fileName = 'Raw DDL';
        if (inputMethod === 'raw_prisma') fileName = 'Raw Prisma';
        if (inputMethod === 'raw_csv') fileName = 'Raw CSV';
        onUpload(rawDdl, fileName);
    };

    return (
        <Stack gap="xs" className="w-full">
            <Group align="flex-start" wrap="nowrap" gap="xs">
                <Box style={{ width: 140 }}>
                    <Select
                        size="sm"
                        placeholder="Source"
                        data={[
                            { value: 'sql', label: '.sql File' },
                            { value: 'prisma', label: 'Prisma File' },
                            { value: 'csv', label: 'CSV File' },
                            { value: 'raw', label: 'Raw DDL' },
                            { value: 'raw_prisma', label: 'Raw Prisma' },
                            { value: 'raw_csv', label: 'Raw CSV' },
                        ]}
                        value={inputMethod}
                        onChange={(val) => setInputMethod(val as any)}
                    />
                </Box>

                <Box style={{ flexGrow: 1 }}>
                    {inputMethod === 'sql' || inputMethod === 'prisma' || inputMethod === 'csv' ? (
                        <FileInput
                            size="sm"
                            placeholder={`Select ${inputMethod === 'sql' ? '.sql' : inputMethod === 'prisma' ? '.prisma' : '.csv'} file`}
                            accept={inputMethod === 'sql' ? '.sql' : inputMethod === 'prisma' ? '.prisma' : '.csv'}
                            leftSection={<Upload size={16} />}
                            onChange={handleFileChange}
                            value={null}
                            description={fileName ? `Active: ${fileName}` : undefined}
                        />
                    ) : (
                        <Stack gap={4}>
                            <Textarea
                                size="sm"
                                placeholder={
                                    inputMethod === 'raw_prisma' ? "Paste Prisma model User { ... }" :
                                        inputMethod === 'raw_csv' ? "Paste headers e.g. id, name, email" :
                                            "Paste DDL e.g. CREATE TABLE users (...);"
                                }
                                value={rawDdl}
                                onChange={(e) => setRawDdl(e.currentTarget.value)}
                                autosize
                                minRows={1}
                                maxRows={6}
                                description={fileName && (fileName === 'Raw DDL' || fileName === 'Raw Prisma' || fileName === 'Raw CSV') ? `Active: ${fileName}` : undefined}
                            />
                            <Button
                                variant="light"
                                size="xs"
                                onClick={handleRawSubmit}
                                disabled={!rawDdl.trim()}
                                leftSection={<Code2 size={14} />}
                                fullWidth
                            >
                                Parse {inputMethod === 'raw_prisma' ? 'Prisma' : inputMethod === 'raw_csv' ? 'CSV' : 'DDL'}
                            </Button>
                        </Stack>
                    )}
                </Box>

                {fileName && (
                    <Tooltip label="Clear Schema">
                        <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={onClear}
                            size="lg"
                        >
                            <Trash size={20} />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Group>
        </Stack>
    );
}
