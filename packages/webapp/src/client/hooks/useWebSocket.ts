import { notifications } from '@mantine/notifications';
import { useEffect, useRef, useState, useCallback } from 'react';

import {
  ClientMessage,
  ServerMessage,
  LogEvent,
  Movie,
  WorkflowStatus,
  EnhancedUserCriteria,
} from '../../shared/types';

interface WebSocketCallbacks {
  onWorkflowStarted?: (data: { workflowId: string }) => void;
  onWorkflowStatus?: (data: { status: WorkflowStatus }) => void;
  onNodeActivated?: (data: { nodeId: string; nodeName: string }) => void;
  onNodeCompleted?: (data: { nodeId: string; nodeName: string }) => void;
  onNodeError?: (data: { nodeId: string; error: string }) => void;
  onMovieFound?: (data: { movie: Movie }) => void;
  onProgressUpdate?: (data: { nodeId: string; progress: number }) => void;
  onLogEvent?: (logEvent: LogEvent) => void;
  onEnhancementComplete?: (data: { enhancement: EnhancedUserCriteria }) => void;
  onWorkflowComplete?: (data: { recommendations: Movie[] }) => void;
  onError?: (error: { message: string; details?: unknown }) => void;
}

interface WebSocketHookReturn {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: ClientMessage) => void;
  disconnect: () => void;
}

export const useWebSocket = (url: string, callbacks: WebSocketCallbacks): WebSocketHookReturn => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<WebSocketHookReturn['connectionStatus']>('disconnected');
  const reconnectAttempts = useRef(0);
  const lastConnectedTime = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] WebSocket already connected, skipping connection attempt');
      return;
    }

    if (ws.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WS] WebSocket already connecting, skipping connection attempt');
      return;
    }

    console.log('[WS] Attempting to connect to WebSocket:', url);
    setConnectionStatus('connecting');

    try {
      // Add a small delay to ensure server is ready
      setTimeout(() => {
        try {
          console.log('[WS] Creating new WebSocket connection...');
          ws.current = new WebSocket(url);

          ws.current.onopen = () => {
            console.log('[WS] WebSocket connected to', url);
            setConnectionStatus('connected');
            reconnectAttempts.current = 0;

            // Prevent duplicate notifications if reconnecting too quickly
            const now = Date.now();
            if (now - lastConnectedTime.current > 2000) {
              // Only show if last connection was more than 2 seconds ago
              notifications.show({
                title: 'Connected',
                message: 'Successfully connected to the server',
                color: 'green',
                autoClose: 3000,
              });
            }
            lastConnectedTime.current = now;
          };

          ws.current.onmessage = (event) => {
            console.log('[WS] Raw message received:', event.data);
            try {
              const message: ServerMessage = JSON.parse(event.data);
              console.log('[WS] Parsed message:', message);
              handleServerMessage(message);
            } catch (error) {
              console.error('[WS] Error parsing WebSocket message:', error, event.data);
            }
          };

          ws.current.onclose = (event) => {
            console.log('[WS] WebSocket disconnected:', event.code, event.reason);
            setConnectionStatus('disconnected');

            // Attempt to reconnect if not a manual disconnect
            if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
              const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current);
              reconnectAttempts.current++;

              notifications.show({
                title: 'Connection Lost',
                message: `Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`,
                color: 'orange',
                autoClose: 5000,
              });

              reconnectTimeoutRef.current = setTimeout(() => {
                connect();
              }, delay);
            } else if (reconnectAttempts.current >= maxReconnectAttempts) {
              setConnectionStatus('error');
              notifications.show({
                title: 'Connection Failed',
                message: 'Unable to reconnect to the server. Please refresh the page.',
                color: 'red',
                autoClose: false,
              });
            }
          };

          ws.current.onerror = (error) => {
            console.error('[WS] WebSocket error during connection:', error);
            console.error('[WS] WebSocket readyState:', ws.current?.readyState);
            setConnectionStatus('error');
          };
        } catch (innerError) {
          console.error('[WS] Error creating WebSocket connection:', innerError);
          setConnectionStatus('error');
        }
      }, 1000); // 1 second delay
    } catch (error) {
      console.error('[WS] Error in connect function:', error);
      setConnectionStatus('error');
    }
  }, [url]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleServerMessage = (message: any): void => {
    console.log('[WS] handleServerMessage', message);
    // Filter out webpack-dev-server messages
    if (
      message.type &&
      [
        'hot',
        'liveReload',
        'reconnect',
        'overlay',
        'hash',
        'ok',
        'static-changed',
        'invalid',
        'still-ok',
      ].includes(message.type)
    ) {
      // These are webpack-dev-server HMR messages, ignore them silently
      console.log('[WS] Ignoring webpack HMR message:', message.type);
      return;
    }

    // Ensure this is a proper ServerMessage structure
    if (!message.type) {
      console.warn('[WS] Invalid message format received:', message);
      return;
    }

    console.log('[WS] Processing application message:', message);
    const serverMessage = message as ServerMessage;

    switch (serverMessage.type) {
      case 'workflow_started':
        console.log('[WS] Event: workflow_started', serverMessage.payload);
        if (serverMessage.payload && 'workflowId' in serverMessage.payload) {
          callbacks.onWorkflowStarted?.(serverMessage.payload);
          notifications.show({
            title: 'Workflow Started',
            message: 'Movie recommendation workflow has begun',
            color: 'blue',
            autoClose: 3000,
          });
        }
        break;

      case 'workflow_status':
        console.log('[WS] Event: workflow_status', serverMessage.payload);
        if (serverMessage.payload && 'status' in serverMessage.payload) {
          callbacks.onWorkflowStatus?.(serverMessage.payload);
        }
        break;

      case 'node_activated':
        console.log('[WS] Event: node_activated', serverMessage.payload);
        if (
          serverMessage.payload &&
          'nodeId' in serverMessage.payload &&
          'nodeName' in serverMessage.payload
        ) {
          callbacks.onNodeActivated?.(serverMessage.payload);
        }
        break;

      case 'node_completed':
        console.log('[WS] Event: node_completed', serverMessage.payload);
        if (
          serverMessage.payload &&
          'nodeId' in serverMessage.payload &&
          'nodeName' in serverMessage.payload
        ) {
          callbacks.onNodeCompleted?.(serverMessage.payload);
        }
        break;

      case 'node_error':
        console.log('[WS] Event: node_error', serverMessage.payload);
        if (
          serverMessage.payload &&
          'nodeId' in serverMessage.payload &&
          'error' in serverMessage.payload
        ) {
          callbacks.onNodeError?.(serverMessage.payload);
          notifications.show({
            title: 'Workflow Error',
            message: `Error in ${serverMessage.payload.nodeId}: ${serverMessage.payload.error}`,
            color: 'red',
            autoClose: 5000,
          });
        }
        break;

      case 'movie_found':
        console.log('[WS] Event: movie_found', serverMessage.payload);
        if (serverMessage.payload && 'movie' in serverMessage.payload) {
          callbacks.onMovieFound?.(serverMessage.payload);
        }
        break;

      case 'progress_update':
        console.log('[WS] Event: progress_update', serverMessage.payload);
        if (
          serverMessage.payload &&
          'nodeId' in serverMessage.payload &&
          'progress' in serverMessage.payload
        ) {
          callbacks.onProgressUpdate?.(serverMessage.payload);
        }
        break;

      case 'log_event':
        // Optionally log all log events
        // console.log('[WS] Event: log_event', serverMessage.payload);
        if (
          serverMessage.payload &&
          'timestamp' in serverMessage.payload &&
          'level' in serverMessage.payload &&
          'message' in serverMessage.payload
        ) {
          callbacks.onLogEvent?.(serverMessage.payload);
        }
        break;

      case 'enhancement_complete':
        console.log('[WS] Event: enhancement_complete', serverMessage.payload);
        if (serverMessage.payload && 'enhancement' in serverMessage.payload) {
          callbacks.onEnhancementComplete?.(serverMessage.payload);
        }
        break;

      case 'workflow_complete':
        console.log('[WS] Event: workflow_complete', serverMessage.payload);
        if (serverMessage.payload && 'recommendations' in serverMessage.payload) {
          callbacks.onWorkflowComplete?.(serverMessage.payload);
          notifications.show({
            title: 'Workflow Complete',
            message: `Found ${serverMessage.payload.recommendations.length} movie recommendations`,
            color: 'green',
            autoClose: 5000,
          });
        }
        break;

      case 'error':
        console.log('[WS] Event: error', serverMessage.payload);
        if (serverMessage.payload && 'message' in serverMessage.payload) {
          callbacks.onError?.(serverMessage.payload);
          notifications.show({
            title: 'Error',
            message: serverMessage.payload.message,
            color: 'red',
            autoClose: 5000,
          });
        }
        break;

      default:
        console.warn('[WS] Unknown application message type:', message);
    }
  };

  const sendMessage = useCallback((message: ClientMessage): void => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
      notifications.show({
        title: 'Connection Error',
        message: 'Not connected to server. Please wait for reconnection.',
        color: 'orange',
        autoClose: 3000,
      });
    }
  }, []);

  const disconnect = useCallback((): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }

    setConnectionStatus('disconnected');
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      console.log('useWebSocket cleanup: disconnecting');
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping periodically to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval);
    };
  }, [sendMessage]);

  return {
    connectionStatus,
    sendMessage,
    disconnect,
  };
};
