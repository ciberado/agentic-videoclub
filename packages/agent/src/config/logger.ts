import * as fs from 'fs';
import * as path from 'path';

import * as winston from 'winston';

// Define log levels with priorities
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  silly: 5,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  silly: 'cyan',
};

// Add colors to winston
winston.addColors(logColors);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, nodeId, operation, duration, ...meta } = info;
    
    let logMessage = `${timestamp} [${level}]`;
    
    // Add service context if available
    if (service) {
      logMessage += ` [${service}]`;
    }
    
    // Add node context if available
    if (nodeId) {
      logMessage += ` [${nodeId}]`;
    }
    
    // Add operation context if available
    if (operation) {
      logMessage += ` [${operation}]`;
    }
    
    logMessage += `: ${message}`;
    
    // Add duration if available
    if (duration !== undefined) {
      logMessage += ` (${duration}ms)`;
    }
    
    // Add additional metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine log level from environment variable, default to DEBUG
const logLevel = process.env.LOG_LEVEL || 'debug';

// Create logs directory if it doesn't exist
const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Generate unique filename for this execution
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
const executionLogFile = path.join(logsDir, `execution_${timestamp}.log`);

// Create console transport with increased listener limit
// Note: We reuse the same transport instance to avoid creating multiple console listeners
// which would trigger MaxListenersExceededWarning during concurrent operations
const consoleTransport = new winston.transports.Console({
  stderrLevels: ['error'],
});

// Increase max listeners to handle concurrent logging operations (default is 30)
// This prevents "MaxListenersExceededWarning" during heavy logging with LLM calls
consoleTransport.setMaxListeners(50);

// Create file transport for this execution with clean JSON format
const fileTransport = new winston.transports.File({
  filename: executionLogFile,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.uncolorize(), // Remove ANSI color codes for file output
    winston.format.json()
  ),
});

// Create the logger configuration
const logger = winston.createLogger({
  level: logLevel,
  levels: logLevels,
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'video-recommendation-agent' },
  transports: [
    // Console transport for all environments
    consoleTransport,
    
    // File transport for this execution - logs all levels
    fileTransport,
    
    // Additional file transports for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ] : []),
  ],
  
  // Handle uncaught exceptions and promise rejections
  exceptionHandlers: [
    consoleTransport,
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
    ] : []),
  ],
  
  rejectionHandlers: [
    consoleTransport,
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
    ] : []),
  ],
});

// Log initialization message with file location
logger.info('Logger initialized', { 
  logFile: executionLogFile,
  logLevel,
  nodeEnv: process.env.NODE_ENV || 'development'
});

// Create specialized loggers for different components
export const nodeLogger = (nodeId: string) => logger.child({ nodeId });
export const httpLogger = logger.child({ component: 'http' });
export const llmLogger = logger.child({ component: 'llm' });
export const evaluationLogger = logger.child({ component: 'evaluation' });

export default logger;