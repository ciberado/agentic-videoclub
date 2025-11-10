import {
  AppShell,
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Badge,
  Progress,
  Text,
} from '@mantine/core';
import React, { useState, useMemo } from 'react';

import { UserRequirements, WorkflowStatus, Movie, LogEvent } from '../shared/types';

import NodeVisualization from './components/NodeVisualization';
import ProgressLog from './components/ProgressLog';
import RequirementsForm from './components/RequirementsForm';
import ResultsSection from './components/ResultsSection';
import { useWebSocket } from './hooks/useWebSocket';

const App: React.FC = () => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);

  // Memoize WebSocket URL to prevent unnecessary reconnections
  const websocketUrl = useMemo((): string => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      // In development with webpack dev server, use the same host and let webpack proxy handle it
      if (host.includes('localhost:3000') || host.includes('3000.uks1.devtunnels.ms')) {
        // Use same host as the web page - webpack will proxy to the backend
        return `${protocol}//${host}/ws`;
      }

      // For production or direct backend access
      return `${protocol}//${host}/ws`;
    }
    // Fallback for SSR
    return 'ws://localhost:3000/ws'; // Use webpack dev server in development
  }, []);

  const { sendMessage, connectionStatus } = useWebSocket(websocketUrl, {
    onWorkflowStarted: (data) => {
      setWorkflowStatus({
        id: data.workflowId,
        status: 'running',
        nodes: [
          {
            id: 'prompt_enhancement',
            name: 'Prompt Enhancement',
            description: 'Analyzing and enhancing user requirements',
            status: 'pending',
          },
          {
            id: 'movie_discovery',
            name: 'Movie Discovery',
            description: 'Discovering and fetching movie data',
            status: 'pending',
          },
          {
            id: 'movie_evaluation',
            name: 'Movie Evaluation',
            description: 'Evaluating movies against user criteria',
            status: 'pending',
          },
          {
            id: 'final_selection',
            name: 'Final Selection',
            description: 'Selecting and ranking final recommendations',
            status: 'pending',
          },
        ],
        progress: 0,
        startTime: new Date(),
      });
      setRecommendations([]);
    },
    onWorkflowStatus: (data) => {
      // Sync with existing workflow status (for reconnections)
      setWorkflowStatus(data.status);
      setRecommendations(data.status.results || []);
    },
    onNodeActivated: (data) => {
      setWorkflowStatus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentNode: data.nodeId,
          nodes: prev.nodes.map((node) =>
            node.id === data.nodeId ? { ...node, status: 'active' } : node,
          ),
        };
      });
    },
    onNodeCompleted: (data) => {
      setWorkflowStatus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          nodes: prev.nodes.map((node) =>
            node.id === data.nodeId ? { ...node, status: 'completed' } : node,
          ),
        };
      });
    },
    onProgressUpdate: (data) => {
      setWorkflowStatus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          progress: data.progress,
          nodes: prev.nodes.map((node) =>
            node.id === data.nodeId ? { ...node, progress: data.progress } : node,
          ),
        };
      });
    },
    onWorkflowComplete: (data) => {
      setWorkflowStatus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'completed',
          endTime: new Date(),
          progress: 100,
          results: data.recommendations,
        };
      });
      setRecommendations(data.recommendations);
    },
    onLogEvent: (logEvent) => {
      setLogs((prev) => [...prev, logEvent].slice(-100)); // Keep last 100 logs
    },
    onError: (error) => {
      console.error('Workflow error:', error);
      setWorkflowStatus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'error',
          endTime: new Date(),
        };
      });
    },
  });

  const handleStartWorkflow = (requirements: UserRequirements): void => {
    sendMessage({
      type: 'start_workflow',
      payload: requirements,
    });
  };

  const handleCancelWorkflow = (): void => {
    sendMessage({ type: 'cancel_workflow' });
    setWorkflowStatus(null);
    setRecommendations([]);
  };

  return (
    <AppShell padding="md" header={{ height: 70 }}>
      <AppShell.Header>
        <Container size="xl" py="md">
          <Group justify="space-between" align="center">
            <Title order={2}>VideoClub - AI Movie Recommendations</Title>
            <Group>
              <Badge color={connectionStatus === 'connected' ? 'green' : 'red'} variant="light">
                {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </Badge>
              {workflowStatus && (
                <Badge
                  color={
                    workflowStatus.status === 'running'
                      ? 'blue'
                      : workflowStatus.status === 'completed'
                        ? 'green'
                        : workflowStatus.status === 'error'
                          ? 'red'
                          : 'gray'
                  }
                  variant="filled"
                >
                  {workflowStatus.status}
                </Badge>
              )}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Stack gap="xl">
            {/* Requirements Form */}
            <Paper p="lg" withBorder>
              <RequirementsForm
                onSubmit={handleStartWorkflow}
                onCancel={handleCancelWorkflow}
                isLoading={workflowStatus?.status === 'running'}
              />
            </Paper>

            {/* Workflow Progress */}
            {workflowStatus && (
              <Paper p="lg" withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="lg" fw={500}>
                      Workflow Progress
                    </Text>
                    <Text size="sm" c="dimmed">
                      {Math.round(workflowStatus.progress)}%
                    </Text>
                  </Group>
                  <Progress value={workflowStatus.progress} animated />
                  <NodeVisualization nodes={workflowStatus.nodes} />
                </Stack>
              </Paper>
            )}

            {/* Real-time Logs */}
            {logs.length > 0 && (
              <Paper p="lg" withBorder>
                <ProgressLog logs={logs} />
              </Paper>
            )}

            {/* Results */}
            {recommendations.length > 0 && (
              <Paper p="lg" withBorder>
                <ResultsSection movies={recommendations} />
              </Paper>
            )}
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default App;
