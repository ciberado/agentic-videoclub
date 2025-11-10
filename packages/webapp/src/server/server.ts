import { createServer } from 'http';
import path from 'path';

import express from 'express';
import { WebSocketServer } from 'ws';

import { AgentInvoker } from './services/agentInvoker';
import { LogWatcher } from './services/logWatcher';
import { WebSocketHandler } from './websocket/handler';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({
    server,
    path: '/ws'
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Serve React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Initialize services
const agentInvoker = new AgentInvoker();
const logWatcher = new LogWatcher();
const wsHandler = new WebSocketHandler(agentInvoker, logWatcher);

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    wsHandler.handleConnection(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        wsHandler.handleDisconnection(ws);
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

export default app;