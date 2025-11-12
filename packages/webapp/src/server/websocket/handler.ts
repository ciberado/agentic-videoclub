import { WebSocket } from 'ws';

import { ClientMessage, ServerMessage, UserRequirements } from '../../shared/types';
import { AgentInvoker } from '../services/agentInvoker';

export class WebSocketHandler {
  private clients: Set<WebSocket> = new Set();
  private agentInvoker: AgentInvoker;

  constructor(agentInvoker: AgentInvoker) {
    this.agentInvoker = agentInvoker;

    // Set up event listeners
    this.setupAgentListeners();
  }

  handleConnection(ws: WebSocket): void {
    console.log('🔗 New WebSocket connection established. Total clients:', this.clients.size + 1);
    this.clients.add(ws);

    // Send current workflow status if any
    const status = this.agentInvoker.getStatus();
    if (status) {
      // Send full status to reconnecting clients
      this.sendToClient(ws, {
        type: 'workflow_status',
        payload: { status },
      });
    }

    ws.on('message', (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        this.handleClientMessage(ws, message);
      } catch (error) {
        console.error('Error parsing client message:', error);
        this.sendToClient(ws, {
          type: 'error',
          payload: { message: 'Invalid message format' },
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  handleDisconnection(ws: WebSocket): void {
    this.clients.delete(ws);
    console.log('🔗 WebSocket connection closed. Total clients:', this.clients.size);
  }

  private async handleClientMessage(ws: WebSocket, message: ClientMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'start_workflow':
          await this.handleStartWorkflow(ws, message.payload);
          break;

        case 'cancel_workflow':
          await this.handleCancelWorkflow(ws);
          break;

        case 'ping':
          // Simple ping/pong for connection health
          break;

        default:
          this.sendToClient(ws, {
            type: 'error',
            payload: { message: 'Unknown message type' },
          });
      }
    } catch (error) {
      console.error('Error handling client message:', error);
      this.sendToClient(ws, {
        type: 'error',
        payload: {
          message: 'Failed to process message',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async handleStartWorkflow(ws: WebSocket, requirements: UserRequirements): Promise<void> {
    try {
      // Just start the workflow - the AgentInvoker will emit workflow_started event
      await this.agentInvoker.startWorkflow(requirements);
      // Don't send workflow_started here - it will be sent via the event listener
    } catch (error) {
      this.sendToClient(ws, {
        type: 'error',
        payload: {
          message: 'Failed to start workflow',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async handleCancelWorkflow(ws: WebSocket): Promise<void> {
    try {
      await this.agentInvoker.cancelWorkflow();
      this.sendToClient(ws, {
        type: 'workflow_complete',
        payload: { recommendations: [] },
      });
    } catch (error) {
      this.sendToClient(ws, {
        type: 'error',
        payload: {
          message: 'Failed to cancel workflow',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private setupAgentListeners(): void {
    this.agentInvoker.on('workflow_started', (data) => {
      console.log('🔔 AgentInvoker emitted workflow_started:', data);
      this.broadcast({ type: 'workflow_started', payload: data });
    });

    this.agentInvoker.on('node_activated', (data) => {
      this.broadcast({ type: 'node_activated', payload: data });
    });

    this.agentInvoker.on('node_completed', (data) => {
      this.broadcast({ type: 'node_completed', payload: data });
    });

    this.agentInvoker.on('node_error', (data) => {
      this.broadcast({ type: 'node_error', payload: data });
    });

    this.agentInvoker.on('movie_found', (data) => {
      this.broadcast({ type: 'movie_found', payload: data });
    });

    this.agentInvoker.on('progress_update', (data) => {
      console.log('📊 AgentInvoker emitted progress_update:', data);
      this.broadcast({ type: 'progress_update', payload: data });
    });

    this.agentInvoker.on('enhancement_complete', (data) => {
      console.log('🎯 AgentInvoker emitted enhancement_complete:', data);
      this.broadcast({ type: 'enhancement_complete', payload: data });
    });

    this.agentInvoker.on('workflow_complete', (data) => {
      this.broadcast({ type: 'workflow_complete', payload: data });
    });

    this.agentInvoker.on('workflow_error', (data) => {
      this.broadcast({ type: 'error', payload: data });
    });

    // Listen for log events directly from AgentInvoker
    this.agentInvoker.on('log_event', (logEvent) => {
      this.broadcast({ type: 'log_event', payload: logEvent });
    });
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerMessage): void {
    this.clients.forEach((client) => {
      this.sendToClient(client, message);
    });
  }

  destroy(): void {
    this.clients.clear();
  }
}
