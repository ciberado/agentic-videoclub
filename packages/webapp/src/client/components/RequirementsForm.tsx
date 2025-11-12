import { Stack, Textarea, Button, Group, Title, Text, Card } from '@mantine/core';
import { IconSearch, IconX, IconBrain } from '@tabler/icons-react';
import React, { useState, useEffect } from 'react';

import { UserRequirements, EnhancedUserCriteria } from '../../shared/types';

interface RequirementsFormProps {
  onSubmit: (requirements: UserRequirements) => void;
  onCancel: () => void;
  isLoading?: boolean;
  enhancedCriteria?: EnhancedUserCriteria | null;
}

const RequirementsForm: React.FC<RequirementsFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  enhancedCriteria,
}) => {
  const [prompt, setPrompt] = useState('');
  // Maximum results is now fixed at 5
  const maxResults = 5;

  // Debug log to see when enhancement data changes
  useEffect(() => {
    console.log('[RequirementsForm] Enhancement criteria changed:', enhancedCriteria);
  }, [enhancedCriteria]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!prompt.trim()) {
      return;
    }

    const requirements: UserRequirements = {
      prompt: prompt.trim(),
      preferences: {
        maxResults: maxResults,
        includeAdult: false,
      },
    };

    onSubmit(requirements);
  };

  const handleReset = (): void => {
    setPrompt('');
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
        <Card
          padding="md"
          radius="md"
          withBorder
          style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}
        >
          <Group gap="xs" mb="xs">
            <IconBrain size={20} style={{ color: 'var(--mantine-color-blue-6)' }} />
            <Text fw={500} c="blue.6">
              {enhancedCriteria ? 'AI Enhancement Results' : 'AI Enhancement Process'}
            </Text>
          </Group>
          {enhancedCriteria ? (
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Your request has been intelligently enhanced:
              </Text>
              {enhancedCriteria.enhancedGenres.length > 0 && (
                <Text size="sm">
                  <strong>Genres:</strong> {enhancedCriteria.enhancedGenres.join(', ')}
                </Text>
              )}
              {enhancedCriteria.preferredThemes.length > 0 && (
                <Text size="sm">
                  <strong>Themes:</strong> {enhancedCriteria.preferredThemes.join(', ')}
                </Text>
              )}
              {enhancedCriteria.excludeGenres.length > 0 && (
                <Text size="sm">
                  <strong>Avoiding:</strong> {enhancedCriteria.excludeGenres.join(', ')}
                </Text>
              )}
              <Text size="sm">
                <strong>Family Friendly:</strong> {enhancedCriteria.familyFriendly ? 'Yes' : 'No'}
              </Text>
              <Text size="sm">
                <strong>Target Audience:</strong> {enhancedCriteria.ageGroup}
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Your request will be intelligently enhanced by our AI system to provide 5 carefully
              selected recommendations. The AI analyzes your preferences to identify suitable
              genres, themes, and content appropriateness, while automatically excluding content
              that doesn't match your preferences.
            </Text>
          )}
        </Card>{' '}
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
