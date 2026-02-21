'use client';

import { Textarea, Button, Box, Select, Group, Text, Badge } from '@mantine/core';
import { SendHorizontal } from 'lucide-react';
import { useState } from 'react';

interface ChatInputProps {
    onSubmit: (question: string) => void;
    isLoading: boolean;
    disabled: boolean;
    dialect: 'postgres' | 'mysql' | 'sqlite';
    onDialectChange: (dialect: 'postgres' | 'mysql' | 'sqlite') => void;
    suggestions: string[];
}

export function ChatInput({ onSubmit, isLoading, disabled, dialect, onDialectChange, suggestions }: ChatInputProps) {
    const [value, setValue] = useState('');

    const handleSend = () => {
        if (!value.trim()) return;
        onSubmit(value);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setValue(suggestion);
        // Automatically submit? Or just fill? Usually just fill is safer.
    };

    return (
        <Box className="flex flex-col gap-2 w-full">
            <Group justify="flex-start" align="center" mb="xs">
                <Text size="xs" c="dimmed" fw={500}>Target Dialect:</Text>
                <Select
                    size="xs"
                    placeholder="Dialect"
                    data={[
                        { value: 'postgres', label: 'PostgreSQL' },
                        { value: 'mysql', label: 'MySQL' },
                        { value: 'sqlite', label: 'SQLite' },
                    ]}
                    value={dialect}
                    onChange={(val) => onDialectChange(val as 'postgres' | 'mysql' | 'sqlite')}
                    disabled={disabled || isLoading}
                    style={{ width: 120 }}
                />
            </Group>

            {suggestions.length > 0 && (
                <Group gap="xs" mb="xs">
                    {suggestions.map((s, i) => (
                        <Badge
                            key={i}
                            variant="light"
                            color="gray"
                            size="sm"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSuggestionClick(s)}
                        >
                            {s}
                        </Badge>
                    ))}
                </Group>
            )}

            <Box className="flex gap-2 items-end w-full">
                <Textarea
                    className="flex-grow"
                    placeholder={disabled ? "Please upload a schema first..." : "e.g. Find the names of users who bought shoes"}
                    value={value}
                    onChange={(event) => setValue(event.currentTarget.value)}
                    disabled={disabled}
                    autosize
                    minRows={2}
                    maxRows={4}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <Button
                    onClick={handleSend}
                    loading={isLoading}
                    disabled={disabled || !value.trim()}
                    color="blue"
                    px="sm"
                    style={{ height: '54px' }}
                >
                    <SendHorizontal size={20} />
                </Button>
            </Box>
        </Box>
    );
}
