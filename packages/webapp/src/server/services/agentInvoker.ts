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

    // Initialize workflow status with proper nodes
    this.workflowStatus = {
      id: workflowId,
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

    const { message } = logEvent;
    console.log('🔍 Checking log message for progress:', message);

    // Map log events to workflow nodes using actual log messages from the agentic package
    // Prompt Enhancement Phase
    if (message.includes('🎯 Starting prompt enhancement analysis')) {
      this.updateNodeStatus('prompt_enhancement', 'active');
      this.updateOverallProgress(10);
    } else if (message.includes('✨ Prompt enhancement completed successfully')) {
      this.updateNodeStatus('prompt_enhancement', 'completed');
      this.updateOverallProgress(25);
    }

    // Movie Discovery Phase
    else if (
      message.includes('🎬 Starting movie discovery and data fetching') ||
      message.includes('🌐 Initial movie discovery from Prime Video')
    ) {
      this.updateNodeStatus('movie_discovery', 'active');
      this.updateOverallProgress(30);
    } else if (message.includes('Movie discovery completed')) {
      this.updateNodeStatus('movie_discovery', 'completed');
      this.updateOverallProgress(50);
    }

    // Movie Evaluation Phase
    else if (
      message.includes('🧠 Starting intelligent batch evaluation') ||
      message.includes('Starting movie evaluation') ||
      message.includes('Evaluating batch')
    ) {
      this.updateNodeStatus('movie_evaluation', 'active');
      this.updateOverallProgress(60);
    } else if (
      message.includes('📊 Intelligent evaluation completed') ||
      message.includes('Movie evaluation completed')
    ) {
      this.updateNodeStatus('movie_evaluation', 'completed');
      this.updateOverallProgress(75);
    }

    // Final Selection Phase
    else if (message.includes('🎉 Video Recommendation Agent completed successfully')) {
      this.updateNodeStatus('final_selection', 'active');
      this.updateOverallProgress(90);
    }

    // Also track progress updates from specific progress logs
    if (message.includes('Data fetching progress') || message.includes('progress:')) {
      // Extract progress from messages like "Data fetching progress 3/10 (30.0%)"
      const progressMatch = message.match(/(\d+)\/(\d+)\s*\((\d+(?:\.\d+)?)%\)/);
      if (progressMatch) {
        const currentProgress = parseFloat(progressMatch[3]);
        // Scale the progress within the current phase
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
    if (node && node.status !== 'completed' && node.status !== status) {
      const previousStatus = node.status;
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
          nodeId: 'final_selection',
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
