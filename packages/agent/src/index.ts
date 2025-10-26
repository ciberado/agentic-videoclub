import logger from './config/logger';
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

// Initialize the video recommendation agent
logger.info('Video Recommendation Agent starting up', {
  version: '0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',
});

// Example usage of different logging functions
async function exampleAgentFlow() {
  // Example: Prompt Enhancement Node
  const promptStartTime = logNodeStart('prompt_enhancement', 'enhance_user_prompt', {
    userInput: "I'm a 49 years old guy that loves science fiction and hates cheesy stories"
  });
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  logNodeExecution('prompt_enhancement', 'enhance_user_prompt', promptStartTime, {
    enhancedGenres: ['Science Fiction', 'Thriller', 'Drama'],
    excludeGenres: ['Romance', 'Comedy'],
    familyFriendly: false
  });

  // Example: Movie Discovery & Data Fetching Node
  const discoveryStartTime = logNodeStart('movie_discovery_fetching', 'fetch_movie_batch');
  
  // Example HTTP logging
  logHttpRequest('https://example-movie-site.com/search?genre=sci-fi', 'GET');
  await new Promise(resolve => setTimeout(resolve, 200));
  logHttpResponse('https://example-movie-site.com/search?genre=sci-fi', 200, 200, 15420);

  logNodeExecution('movie_discovery_fetching', 'fetch_movie_batch', discoveryStartTime, {
    moviesFound: 12,
    batchSize: 12
  });

  // Example: LLM Evaluation
  const evaluationStartTime = logNodeStart('intelligent_evaluation', 'evaluate_movie_batch');
  
  logLlmRequest('claude-3-haiku', 'Evaluate these movies for a 49yo sci-fi fan...', 1500);
  await new Promise(resolve => setTimeout(resolve, 300));
  logLlmResponse('claude-3-haiku', 'Analysis complete with scores...', 800, 300);

  // Log evaluation results
  logEvaluationBatch(12, true, 4, 7.8);
  logQualityGate(true, 3, 4, 12);

  logNodeExecution('intelligent_evaluation', 'evaluate_movie_batch', evaluationStartTime, {
    highConfidenceMatches: 4,
    qualityGatePassed: true
  });

  logger.info('Agent flow example completed successfully');
}

// Run the example
exampleAgentFlow().catch(error => {
  logger.error('Agent flow example failed', {
    error: error.message,
    stack: error.stack
  });
});