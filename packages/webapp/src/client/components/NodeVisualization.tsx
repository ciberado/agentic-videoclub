import { Stack, Stepper, Text } from '@mantine/core';
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
    const iconSize = node.status === 'active' ? 20 : 16;

    switch (node.status) {
      case 'completed':
        return <IconCheck size={iconSize} />;
      case 'active':
        return <IconLoader size={iconSize} />;
      case 'error':
        return <IconX size={iconSize} />;
      default:
        return <IconClock size={iconSize} />;
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
    <>
      {/* CSS keyframes for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
          }
        }
        .active-step {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>

      <Stack gap="md">
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
              className={node.status === 'active' ? 'active-step' : ''}
              style={{
                fontWeight: node.status === 'active' ? 600 : 400,
              }}
            >
              {node.details && node.status !== 'active' && (
                <Text size="xs" c="dimmed" mt="xs">
                  {node.details}
                </Text>
              )}
            </Stepper.Step>
          ))}
        </Stepper>
      </Stack>
    </>
  );
};

export default NodeVisualization;
