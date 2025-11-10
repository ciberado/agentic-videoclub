import React, { useState } from 'react';
import {
    Stack,
    Textarea,
    Button,
    Group,
    Title,
    Text,
    NumberInput
} from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

import { UserRequirements } from '../../shared/types';

interface RequirementsFormProps {
    onSubmit: (requirements: UserRequirements) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const RequirementsForm: React.FC<RequirementsFormProps> = ({
    onSubmit,
    onCancel,
    isLoading = false
}) => {
    const [prompt, setPrompt] = useState('');
    const [maxResults, setMaxResults] = useState<number | string>(10);

    const handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();

        if (!prompt.trim()) {
            return;
        }

        const requirements: UserRequirements = {
            prompt: prompt.trim(),
            preferences: {
                maxResults: typeof maxResults === 'number' ? maxResults : 10,
                includeAdult: false
            }
        };

        onSubmit(requirements);
    };

    const handleReset = (): void => {
        setPrompt('');
        setMaxResults(10);
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <Title order={3}>Movie Preferences</Title>
                <Text size="sm" c="dimmed">
                    Describe what kind of movies you're looking for. Be as specific as possible about genres,
                    themes, mood, or any particular preferences you have.
                </Text>

                <Textarea
                    label="What movies are you in the mood for?"
                    placeholder="e.g., I want to watch a sci-fi thriller with time travel elements, or a romantic comedy set in New York..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.currentTarget.value)}
                    minRows={3}
                    maxRows={6}
                    required
                    disabled={isLoading}
                />

                <NumberInput
                    label="Maximum number of recommendations"
                    placeholder="10"
                    value={maxResults}
                    onChange={setMaxResults}
                    min={1}
                    max={50}
                    disabled={isLoading}
                />

                <Group justify="flex-end" mt="md">
                    {isLoading && (
                        <Button
                            variant="outline"
                            color="red"
                            leftSection={<IconX size={16} />}
                            onClick={handleReset}
                        >
                            Cancel
                        </Button>
                    )}

                    <Button
                        type="submit"
                        leftSection={<IconSearch size={16} />}
                        loading={isLoading}
                        disabled={!prompt.trim()}
                    >
                        {isLoading ? 'Finding Movies...' : 'Find Movies'}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
};

export default RequirementsForm;