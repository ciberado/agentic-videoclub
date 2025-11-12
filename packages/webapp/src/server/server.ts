// Load environment variables from .env file
import 'dotenv/config';

import { createServer } from 'http';
import path from 'path';

import express from 'express';
import { WebSocketServer } from 'ws';

import { serverLogger } from '../config/logger';

import { AgentInvoker } from './services/agentInvoker';
import { WebSocketHandler } from './websocket/handler';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/api/ws',
});

// Middleware
// eslint-disable-next-line import/no-named-as-default-member
app.use(express.json());
// eslint-disable-next-line import/no-named-as-default-member
app.use(express.static(path.join(__dirname, '../../public')));

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Initialize services
const agentInvoker = new AgentInvoker();
const wsHandler = new WebSocketHandler(agentInvoker);

// WebSocket connection handling
wss.on('connection', (ws) => {
  serverLogger.info('Client connected', {
    totalConnections: wss.clients.size,
    clientAddress: ws.url || 'unknown',
  });
  wsHandler.handleConnection(ws);

  ws.on('close', () => {
    serverLogger.info('Client disconnected', {
      totalConnections: wss.clients.size,
    });
    wsHandler.handleDisconnection(ws);
  });
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  serverLogger.info('Server started successfully', {
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  serverLogger.info('SIGTERM received, initiating graceful shutdown');
  server.close(() => {
    serverLogger.info('Server shutdown completed');
    process.exit(0);
  });
});

export default app;
