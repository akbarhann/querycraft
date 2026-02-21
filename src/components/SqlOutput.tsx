'use client';

import { Paper, Title, Box, ActionIcon, CopyButton, Tooltip, ScrollArea } from '@mantine/core';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SqlOutputProps {
    sql: string;
}

export function SqlOutput({ sql }: SqlOutputProps) {
    if (!sql) return null;

    return (
        <Paper shadow="sm" p="md" radius="md" withBorder mt="xl" bg="dark.7">
            <Box className="flex justify-between items-center mb-4">
                <Title order={4} c="dimmed">Generated Query</Title>
                <CopyButton value={sql} timeout={2000}>
                    {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy SQL'} withArrow position="right">
                            <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy} variant="subtle">
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </ActionIcon>
                        </Tooltip>
                    )}
                </CopyButton>
            </Box>
            <ScrollArea style={{ height: 250 }} type="auto" mt="sm">
                <SyntaxHighlighter
                    language="sql"
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1rem',
                        borderRadius: '8px',
                        fontSize: '14px',
                    }}
                >
                    {sql}
                </SyntaxHighlighter>
            </ScrollArea>
        </Paper>
    );
}
