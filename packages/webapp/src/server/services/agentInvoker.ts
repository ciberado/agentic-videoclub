import { EventEmitter } from 'events';

import { runVideoRecommendationAgent } from '@videoclub/agentic';

import { UserRequirements, Movie, WorkflowStatus } from '../../shared/types';

// Import the agentic package - this will need to be adjusted based on the actual export
// import { runWorkflow } from '@videoclub/agentic';

export class AgentInvoker extends EventEmitter {
  private currentWorkflow: string | null = null;
  private workflowStatus: WorkflowStatus | null = null;

  constructor() {
    super();
  }

  async startWorkflow(requirements: UserRequirements): Promise<string> {
    if (this.currentWorkflow) {
      throw new Error('Workflow already running');
    }

    const workflowId = `workflow_${Date.now()}`;
    this.currentWorkflow = workflowId;

    // Initialize workflow status with proper nodes (matching actual LangGraph node IDs)
    this.workflowStatus = {
      id: workflowId,
      status: 'running',
      nodes: [
        {
          id: 'prompt_enhancement_node',
          name: 'Prompt Enhancement',
          description: 'Analyzing and enhancing user requirements',
          status: 'pending',
        },
        {
          id: 'movie_discovery_and_data_fetching_node',
          name: 'Movie Discovery',
          description: 'Discovering and fetching movie data',
          status: 'pending',
        },
        {
          id: 'intelligent_evaluation_node',
          name: 'Movie Evaluation',
          description: 'Evaluating movies against user criteria',
          status: 'pending',
        },
        {
          id: 'batch_control_and_routing_node',
          name: 'Final Selection',
          description: 'Selecting and ranking final recommendations',
          status: 'pending',
        },
      ],
      progress: 0,
      startTime: new Date(),
    };

    this.emit('workflow_started', { workflowId });

    try {
      // Create an EventEmitter to receive log events from the agentic package
      const logEmitter = new EventEmitter();

      // Forward log events from agentic package and track progress
      logEmitter.on('log_event', (logEvent) => {
        console.log('🔍 AgentInvoker received log event:', {
          level: logEvent.level,
          message: logEvent.message.substring(0, 100) + '...',
          nodeId: logEvent.nodeId,
        });
        this.emit('log_event', logEvent);
        this.updateProgress(logEvent);
      });

      // Start the real agentic workflow
      this.runAgenticWorkflow(requirements, logEmitter);

      return workflowId;
    } catch (error) {
      this.currentWorkflow = null;
      this.workflowStatus = null;
      throw error;
    }
  }

  async cancelWorkflow(): Promise<void> {
    if (this.currentWorkflow && this.workflowStatus) {
      this.workflowStatus.status = 'error';
      this.workflowStatus.endTime = new Date();
      this.emit('workflow_error', { message: 'Workflow cancelled by user' });
      this.currentWorkflow = null;
      this.workflowStatus = null;
    }
  }

  getStatus(): WorkflowStatus | null {
    return this.workflowStatus;
  }

  // Update progress based on log events
  private updateProgress(logEvent: { nodeId?: string; message: string; level: string }): void {
    if (!this.workflowStatus) return;

    const { message, nodeId } = logEvent;
    console.log('🔍 Processing log for progress:', { nodeId, message: message.substring(0, 100) });

    // Direct node ID mapping from logs
    if (nodeId) {
      // Check if this is a start message for a node
      if (message.includes('started') || message.includes('Starting')) {
        this.updateNodeStatus(nodeId, 'active');

        // Update progress based on which node is starting
        switch (nodeId) {
          case 'prompt_enhancement_node':
            this.updateOverallProgress(10);
            break;
          case 'movie_discovery_and_data_fetching_node':
            this.updateOverallProgress(30);
            break;
          case 'intelligent_evaluation_node':
            this.updateOverallProgress(60);
            break;
          case 'batch_control_and_routing_node':
            this.updateOverallProgress(85);
            break;
        }
      }

      // Check if this is a completion message for a node
      else if (message.includes('completed') || message.includes('successful')) {
        this.updateNodeStatus(nodeId, 'completed');

        // Update progress based on which node completed
        switch (nodeId) {
          case 'prompt_enhancement_node':
            this.updateOverallProgress(25);
            break;
          case 'movie_discovery_and_data_fetching_node':
            this.updateOverallProgress(50);
            break;
          case 'intelligent_evaluation_node':
            this.updateOverallProgress(75);
            break;
          case 'batch_control_and_routing_node':
            this.updateOverallProgress(100);
            break;
        }
      }
    }

    // Fallback: Handle cases based on message content for additional precision
    // eslint-disable-next-line no-control-regex
    const cleanMessage = message.replace(/\x1b\[[0-9;]*m/g, '');

    // Prompt Enhancement Phase
    if (cleanMessage.includes('Starting prompt enhancement')) {
      this.updateNodeStatus('prompt_enhancement_node', 'active');
      this.updateOverallProgress(10);
    } else if (cleanMessage.includes('Prompt enhancement completed')) {
      this.updateNodeStatus('prompt_enhancement_node', 'completed');
      this.updateOverallProgress(25);
    }

    // Movie Discovery Phase
    else if (
      cleanMessage.includes('Starting movie discovery') ||
      cleanMessage.includes('Initial movie discovery')
    ) {
      this.updateNodeStatus('movie_discovery_and_data_fetching_node', 'active');
      this.updateOverallProgress(30);
    } else if (cleanMessage.includes('Movie discovery completed')) {
      this.updateNodeStatus('movie_discovery_and_data_fetching_node', 'completed');
      this.updateOverallProgress(50);
    }

    // Movie Evaluation Phase
    else if (
      cleanMessage.includes('Starting intelligent') ||
      cleanMessage.includes('Starting movie evaluation') ||
      cleanMessage.includes('Evaluating batch')
    ) {
      this.updateNodeStatus('intelligent_evaluation_node', 'active');
      this.updateOverallProgress(60);
    } else if (
      cleanMessage.includes('Intelligent evaluation completed') ||
      cleanMessage.includes('Movie evaluation completed')
    ) {
      this.updateNodeStatus('intelligent_evaluation_node', 'completed');
      this.updateOverallProgress(75);
    }

    // Final Selection Phase
    else if (
      cleanMessage.includes('Starting final recommendation') ||
      cleanMessage.includes('compile_final_recommendations')
    ) {
      this.updateNodeStatus('batch_control_and_routing_node', 'active');
      this.updateOverallProgress(85);
    } else if (cleanMessage.includes('Agent completed successfully')) {
      this.updateNodeStatus('batch_control_and_routing_node', 'completed');
      this.updateOverallProgress(100);
    }

    // Progress updates within phases
    if (cleanMessage.includes('Data fetching progress') || cleanMessage.includes('progress:')) {
      const progressMatch = cleanMessage.match(/(\d+)\/(\d+)\s*\((\d+(?:\.\d+)?)%\)/);
      if (progressMatch) {
        const currentProgress = parseFloat(progressMatch[3]);
        const activeNode = this.workflowStatus.nodes.find((n) => n.status === 'active');
        if (activeNode) {
          this.emit('progress_update', {
            nodeId: activeNode.id,
            progress: Math.min(currentProgress, 100),
          });
        }
      }
    }
  }

  // Helper method to update node status
  private updateNodeStatus(
    nodeId: string,
    status: 'pending' | 'active' | 'completed' | 'error',
  ): void {
    if (!this.workflowStatus) return;

    const node = this.workflowStatus.nodes.find((n) => n.id === nodeId);
    if (node && node.status !== status) {
      const previousStatus = node.status;

      // In cyclic workflows, allow nodes to transition from completed back to active
      if (status === 'active') {
        // Deactivate any currently active nodes
        this.workflowStatus.nodes.forEach((n) => {
          if (n.status === 'active' && n.id !== nodeId) {
            n.status = 'completed'; // Mark previously active nodes as completed
          }
        });
      }

      node.status = status;

      if (status === 'active') {
        this.emit('node_activated', { nodeId, nodeName: node.name });
      } else if (status === 'completed') {
        this.emit('node_completed', { nodeId, nodeName: node.name });
      } else if (status === 'error') {
        this.emit('node_error', { nodeId, error: 'Node execution failed' });
      }

      console.log(`🔄 Node ${nodeId} status changed from ${previousStatus} to ${status}`);
    }
  }

  // Helper method to update overall progress
  private updateOverallProgress(progress: number): void {
    if (!this.workflowStatus) return;

    if (progress > this.workflowStatus.progress) {
      console.log(`📈 Updating progress from ${this.workflowStatus.progress}% to ${progress}%`);
      this.workflowStatus.progress = progress;
      // Find the current active node
      const activeNode = this.workflowStatus.nodes.find((n) => n.status === 'active');
      this.emit('progress_update', {
        nodeId: activeNode?.id || 'unknown',
        progress,
      });
    }
  } // Run the actual agentic workflow
  private async runAgenticWorkflow(
    requirements: UserRequirements,
    logEmitter: EventEmitter,
  ): Promise<void> {
    try {
      // Run the agentic package workflow and get the real results
      const movieEvaluations = await runVideoRecommendationAgent(requirements.prompt, logEmitter);

      // Mark workflow as completed
      if (this.workflowStatus?.status === 'running') {
        this.workflowStatus.status = 'completed';
        this.workflowStatus.endTime = new Date();
        this.workflowStatus.progress = 100;

        // Mark all nodes as completed
        this.workflowStatus.nodes.forEach((node) => {
          if (node.status !== 'completed') {
            node.status = 'completed';
          }
        });

        // Send final progress update
        this.emit('progress_update', {
          nodeId: 'batch_control_and_routing_node',
          progress: 100,
        });

        // Convert MovieEvaluation[] to Movie[] for the webapp
        const recommendations: Movie[] = movieEvaluations.map((evaluation, index) => ({
          id: (index + 1).toString(),
          title: evaluation.movie.title,
          year: evaluation.movie.year,
          rating: evaluation.movie.rating,
          overview: evaluation.movie.description || 'No description available',
          genre: evaluation.movie.genre || [],
          posterUrl: evaluation.movie.posterUrl,
          reasoning: evaluation.matchReasoning,
          confidenceScore: evaluation.confidenceScore,
        }));

        this.workflowStatus.results = recommendations;
        this.emit('workflow_complete', { recommendations });
        this.currentWorkflow = null;
      }
    } catch (error) {
      // Handle workflow error
      if (this.workflowStatus) {
        this.workflowStatus.status = 'error';
        this.workflowStatus.endTime = new Date();

        // Mark the current active node as error
        const activeNode = this.workflowStatus.nodes.find((n) => n.status === 'active');
        if (activeNode) {
          activeNode.status = 'error';
        }
      }

      this.emit('workflow_error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      });
      this.currentWorkflow = null;
    }
  }
}
