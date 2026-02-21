'use client';

import { FileInput, Box, ActionIcon, Tooltip } from '@mantine/core';
import { Upload, Trash } from 'lucide-react';

interface SchemaUploaderProps {
    onUpload: (sqlContent: string, fileName: string) => void;
    fileName: string | null;
    onClear: () => void;
}

export function SchemaUploader({ onUpload, fileName, onClear }: SchemaUploaderProps) {
    const handleFileChange = async (payload: File | null) => {
        if (!payload) return;
        const text = await payload.text();
        onUpload(text, payload.name);
    };

    return (
        <Box className="w-full flex items-center gap-2">
            <FileInput
                className="flex-grow"
                placeholder="Upload your .sql schema file"
                accept=".sql"
                leftSection={<Upload size={16} />}
                onChange={handleFileChange}
                value={null}
                description={fileName ? `Currently active: ${fileName}` : 'Limit 1 file. Metadata only, no DB connection needed.'}
            />
            {fileName && (
                <Tooltip label="Clear Schema">
                    <ActionIcon color="red" variant="subtle" onClick={onClear} mt="md">
                        <Trash size={20} />
                    </ActionIcon>
                </Tooltip>
            )}
        </Box>
    );
}
