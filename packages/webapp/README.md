# VideoClub WebApp

A React-based web interface for the VideoClub agentic movie recommendation system.

## Features

- **Simple Interface**: Clean, single-page design for entering movie preferences
- **Real-time Progress**: Live updates showing workflow progress through WebSocket connection
- **Node Visualization**: Stepper component showing current workflow stage
- **Activity Log**: Real-time log events from the agentic system
- **Results Display**: Both card and table views for movie recommendations
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

### Frontend (React + Mantine)
- **React 18** with TypeScript for type safety
- **Mantine UI** for polished, accessible components
- **WebSocket** connection for real-time updates
- **Webpack** for bundling and development server

### Backend (Express + WebSocket)
- **Express.js** server serving React app and API
- **WebSocket** server for real-time communication
- **Integration** with agentic package for workflow execution
- **Log monitoring** for real-time activity tracking

## Getting Started

### Prerequisites
- Node.js 18+
- The agentic package must be built and available

### Installation

```bash
# From the webapp directory
npm install

# Install dependencies for the entire monorepo (if not done already)
cd ../..
npm install
```

### Development

```bash
# Start both server and client in development mode
npm run dev

# Or start them separately:
npm run dev:server  # Express server on port 3001
npm run dev:client  # Webpack dev server on port 3000
```

### Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Usage

1. **Enter Requirements**: Describe the type of movies you want in the text area
2. **Submit**: Click "Find Movies" to start the workflow
3. **Monitor Progress**: Watch the real-time progress through the stepper and activity log
4. **View Results**: Browse recommendations in both card and table formats

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)

### WebSocket Connection
The client connects to `ws://localhost:3001` by default. For production, update the WebSocket URL in `src/client/App.tsx`.

## Integration with Agentic Package

The webapp integrates with the agentic package through:

1. **Direct Import**: Imports and calls the agentic workflow functions
2. **Log Monitoring**: Watches log files in `../agentic/logs/` for real-time updates
3. **Event Broadcasting**: Converts agentic events to WebSocket messages

### Customizing Integration

To modify the integration:

1. Update `src/server/services/agentInvoker.ts` to call your specific agentic functions
2. Modify `src/server/services/logWatcher.ts` to parse your log format
3. Adjust the WebSocket message types in `src/shared/types.ts`

## Development Notes

### File Structure
```
src/
├── client/           # React frontend
│   ├── components/   # UI components
│   ├── hooks/        # Custom React hooks
│   ├── App.tsx       # Main app component
│   └── index.tsx     # Entry point
├── server/           # Express backend
│   ├── services/     # Business logic
│   ├── websocket/    # WebSocket handling
│   └── server.ts     # Server entry point
└── shared/           # Shared types and utilities
    └── types.ts      # TypeScript interfaces
```

### Real-time Communication

The app uses WebSocket for real-time updates:

- **Client → Server**: User actions (start/cancel workflow)
- **Server → Client**: Progress updates, log events, results

### Error Handling

- **Connection Issues**: Automatic reconnection with exponential backoff
- **Workflow Errors**: Displayed in notifications and activity log
- **Validation**: Client and server-side input validation

## Troubleshooting

### Common Issues

1. **Dependencies not found**: Run `npm install` in both the webapp and root directories
2. **WebSocket connection fails**: Check that the server is running on port 3001
3. **Agentic package not found**: Ensure the agentic package is built and properly linked

### Development Tips

- Use the browser dev tools to monitor WebSocket messages
- Check the server logs for agentic package integration issues
- The activity log shows real-time events from the workflow

## Future Enhancements

- [ ] User authentication and session management
- [ ] Workflow history and saved searches
- [ ] Advanced filtering and sorting options
- [ ] Movie watchlist and favorites
- [ ] Integration with streaming service APIs
- [ ] Mobile app version