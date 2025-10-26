# Winston Logging Implementation

This package includes a comprehensive Winston logging configuration designed specifically for the Video Recommendation Agent architecture.

## Features

- **Structured Logging**: JSON format in production, colorized console format in development
- **Multiple Log Levels**: `error`, `warn`, `info`, `http`, `debug`, `silly`
- **Context-Aware Logging**: Node-specific, HTTP, LLM, and evaluation loggers
- **Performance Tracking**: Built-in timing and duration tracking
- **Environment-Based Configuration**: Different behavior in development vs production
- **File Rotation**: Automatic log file management in production

## Configuration

### Log Levels
Default log level is `DEBUG`. Override with the `LOG_LEVEL` environment variable:

```bash
LOG_LEVEL=info npm run dev     # Info and above
LOG_LEVEL=debug npm run dev    # Debug and above (default)
LOG_LEVEL=silly npm run dev    # All levels including full LLM prompts/responses
```

### Environment Variables
- `LOG_LEVEL`: Controls logging verbosity (default: `debug`)
- `NODE_ENV`: Switches between development and production formats

## Usage

### Basic Logging
```typescript
import logger from './config/logger';

logger.info('Application started');
logger.debug('Debug information');
logger.error('Something went wrong', { error: error.message });
```

### Node-Specific Logging
```typescript
import { nodeLogger } from './config/logger';

const promptLogger = nodeLogger('prompt_enhancement');
promptLogger.info('Processing user input', { userId: '123' });
```

### Specialized Loggers
```typescript
import { httpLogger, llmLogger, evaluationLogger } from './config/logger';

// HTTP operations
httpLogger.debug('Making API request', { url: 'https://api.example.com' });

// LLM interactions
llmLogger.info('LLM request completed', { model: 'claude-3', tokenCount: 150 });

// Evaluation results
evaluationLogger.info('Quality gate passed', { matches: 4, threshold: 3 });
```

### Utility Functions
The package includes pre-built utility functions for common logging scenarios:

```typescript
import { 
  logNodeStart, 
  logNodeExecution,
  logHttpRequest,
  logHttpResponse,
  logLlmRequest,
  logLlmResponse,
  logEvaluationBatch,
  logQualityGate
} from './utils/logging';

// Node execution tracking
const startTime = logNodeStart('movie_discovery', 'fetch_batch', { criteria: '...' });
// ... do work ...
logNodeExecution('movie_discovery', 'fetch_batch', startTime, { moviesFound: 12 });

// HTTP request tracking
logHttpRequest('https://moviedb.com/search', 'GET');
logHttpResponse('https://moviedb.com/search', 200, 150, 1024);

// LLM interaction tracking
logLlmRequest('claude-3-haiku', 'Analyze these movies...', 500);
logLlmResponse('claude-3-haiku', 'Analysis complete...', 200, 300);

// Evaluation tracking
logEvaluationBatch(10, true, 4, 7.8);
logQualityGate(true, 3, 4, 10);
```

## Log Output Examples

### Development Format (Colorized)
```
2025-10-26 10:51:03:513 [info] [video-recommendation-agent] [prompt_enhancement]: User input processed (45ms) {"genres":["Science Fiction"],"familyFriendly":false}
2025-10-26 10:51:03:600 [debug] [video-recommendation-agent]: HTTP GET request {"component":"http","url":"https://moviedb.com/search","method":"GET"}
2025-10-26 10:51:03:750 [info] [video-recommendation-agent]: Quality gate passed {"component":"evaluation","passed":true,"threshold":3,"actualCount":4}
```

### Production Format (JSON)
```json
{"timestamp":"2025-10-26T10:51:03.513Z","level":"info","message":"User input processed","service":"video-recommendation-agent","nodeId":"prompt_enhancement","duration":45,"genres":["Science Fiction"],"familyFriendly":false}
{"timestamp":"2025-10-26T10:51:03.600Z","level":"debug","message":"HTTP GET request","service":"video-recommendation-agent","component":"http","url":"https://moviedb.com/search","method":"GET"}
```

## File Structure

```
src/
├── config/
│   └── logger.ts          # Main Winston configuration
├── utils/
│   └── logging.ts         # Utility functions for common logging patterns
├── __tests__/
│   └── logger.test.ts     # Comprehensive test suite
└── index.ts               # Example usage
```

## Production Considerations

In production (`NODE_ENV=production`):
- Logs are written to files in the `logs/` directory
- JSON format for better parsing and analysis
- Log rotation with 5MB max file size, 5 files retained
- Exception and rejection handlers write to separate files
- Console output is still available for container environments

## Testing

Run the test suite to verify logging functionality:
```bash
npm test
```

The tests verify:
- Logger instantiation
- Different log levels
- Context-aware logging
- Utility function behavior
- Error handling