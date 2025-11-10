import { Stack, Stepper, Text, Group, Progress } from '@mantine/core';
import { IconCheck, IconLoader, IconX, IconClock } from '@tabler/icons-react';
import React from 'react';

import { WorkflowNode } from '../../shared/types';

interface NodeVisualizationProps {
  nodes: WorkflowNode[];
}

const NodeVisualization: React.FC<NodeVisualizationProps> = ({ nodes }) => {
  const getActiveStep = (): number => {
    const activeIndex = nodes.findIndex((node) => node.status === 'active');
    if (activeIndex !== -1) return activeIndex;

    const completedCount = nodes.filter((node) => node.status === 'completed').length;
    return completedCount;
  };

  const getStepIcon = (node: WorkflowNode): React.ReactElement => {
    switch (node.status) {
      case 'completed':
        return <IconCheck size={16} />;
      case 'active':
        return <IconLoader size={16} />;
      case 'error':
        return <IconX size={16} />;
      default:
        return <IconClock size={16} />;
    }
  };

  const getStepColor = (node: WorkflowNode): string => {
    switch (node.status) {
      case 'completed':
        return 'green';
      case 'active':
        return 'blue';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (nodes.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No workflow steps available
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Text size="lg" fw={500}>
        Workflow Progress
      </Text>

      <Stepper
        active={getActiveStep()}
        orientation="horizontal"
        size="sm"
        allowNextStepsSelect={false}
      >
        {nodes.map((node, _index) => (
          <Stepper.Step
            key={node.id}
            label={node.name}
            description={node.description}
            icon={getStepIcon(node)}
            color={getStepColor(node)}
            loading={node.status === 'active'}
          >
            {node.status === 'active' && node.progress !== undefined && (
              <Group gap="xs" mt="xs">
                <Text size="xs" c="dimmed">
                  Progress: {Math.round(node.progress)}%
                </Text>
                <Progress value={node.progress} size="xs" style={{ flex: 1 }} animated />
              </Group>
            )}

            {node.details && (
              <Text size="xs" c="dimmed" mt="xs">
                {node.details}
              </Text>
            )}
          </Stepper.Step>
        ))}
      </Stepper>
    </Stack>
  );
};

export default NodeVisualization;
