import { Stack, Text, ScrollArea, Group, Badge, Code, Timeline } from '@mantine/core';
import { IconInfoCircle, IconAlertTriangle, IconX, IconBug } from '@tabler/icons-react';
import React from 'react';

import { LogEvent } from '../../shared/types';

interface ProgressLogProps {
  logs: LogEvent[];
}

const ProgressLog: React.FC<ProgressLogProps> = ({ logs }) => {
  // Function to remove ANSI escape codes
  const cleanAnsiCodes = (text: string): string => {
    // Remove ANSI escape sequences in multiple formats
    return (
      text
        // Remove actual escape sequences (case insensitive)
        // eslint-disable-next-line no-control-regex
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        // Remove Unicode escape sequences (like \u001b[34m or \u001b[34M)
        .replace(/\\u001b\[[0-9;]*[a-zA-Z]/g, '')
        // Remove bracket-only sequences like [34M or [39M
        .replace(/\[[0-9;]*[a-zA-Z]/g, '')
    );
  };

  const getLogIcon = (level: LogEvent['level']): React.ReactNode => {
    switch (level) {
      case 'error':
        return <IconX size={16} color="red" />;
      case 'warn':
        return <IconAlertTriangle size={16} color="orange" />;
      case 'debug':
        return <IconBug size={16} color="gray" />;
      default:
        return <IconInfoCircle size={16} color="blue" />;
    }
  };

  const getLogColor = (level: LogEvent['level']): string => {
    switch (level) {
      case 'error':
        return 'red';
      case 'warn':
        return 'orange';
      case 'debug':
        return 'gray';
      default:
        return 'blue';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return timestamp;
      }
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const renderLogDetails = (details: unknown): React.ReactNode => {
    if (!details) return null;

    if (typeof details === 'string') {
      return (
        <Text size="xs" c="dimmed">
          {cleanAnsiCodes(details)}
        </Text>
      );
    }

    if (typeof details === 'object' && details !== null) {
      try {
        const jsonString = JSON.stringify(details, null, 2);
        return (
          <Code block mt="xs" fz="xs">
            {cleanAnsiCodes(jsonString)}
          </Code>
        );
      } catch {
        return (
          <Text size="xs" c="dimmed">
            [Object - could not stringify]
          </Text>
        );
      }
    }

    return null;
  };
  if (logs.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No log events yet...
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Text size="lg" fw={500}>
        Real-time Activity Log
      </Text>

      <ScrollArea h={300} scrollbarSize={8}>
        <Timeline active={logs.length} bulletSize={24} lineWidth={2}>
          {logs.map((log, index) => (
            <Timeline.Item
              key={`${log.timestamp}-${index}`}
              bullet={getLogIcon(log.level)}
              title={
                <Group gap="xs">
                  <Badge variant="light" color={getLogColor(log.level)} size="xs">
                    {cleanAnsiCodes(log.level.toUpperCase())}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {formatTimestamp(log.timestamp)}
                  </Text>
                  {log.nodeId && (
                    <Badge variant="outline" size="xs">
                      {cleanAnsiCodes(log.nodeId)}
                    </Badge>
                  )}
                </Group>
              }
            >
              <Text size="sm" mb="xs">
                {cleanAnsiCodes(log.message)}
              </Text>

              {renderLogDetails(log.details)}
            </Timeline.Item>
          ))}
        </Timeline>
      </ScrollArea>
    </Stack>
  );
};

export default ProgressLog;
