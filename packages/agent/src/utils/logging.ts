import { nodeLogger, httpLogger, llmLogger, evaluationLogger } from '../config/logger';

/**
 * Utility functions for logging different types of operations in the video recommendation agent
 */

/**
 * Log node execution with timing
 */
export const logNodeExecution = (nodeId: string, operation: string, startTime: number, metadata?: any) => {
  const duration = Date.now() - startTime;
  const logger = nodeLogger(nodeId);
  
  logger.info(`${operation} completed`, {
    operation,
    duration,
    ...metadata,
  });
};

/**
 * Log node start
 */
export const logNodeStart = (nodeId: string, operation: string, input?: any) => {
  const logger = nodeLogger(nodeId);
  logger.debug(`${operation} started`, {
    operation,
    input: input ? JSON.stringify(input) : undefined,
  });
  return Date.now();
};

/**
 * Log HTTP requests and responses
 */
export const logHttpRequest = (url: string, method: string = 'GET', headers?: any) => {
  httpLogger.debug(`HTTP ${method} request`, {
    url,
    method,
    headers: headers ? JSON.stringify(headers) : undefined,
  });
};

export const logHttpResponse = (url: string, statusCode: number, duration: number, responseSize?: number) => {
  const level = statusCode >= 400 ? 'warn' : 'debug';
  httpLogger[level](`HTTP response`, {
    url,
    statusCode,
    duration,
    responseSize,
  });
};

export const logHttpError = (url: string, error: Error, retryAttempt?: number) => {
  httpLogger.error(`HTTP request failed`, {
    url,
    error: error.message,
    stack: error.stack,
    retryAttempt,
  });
};

/**
 * Log LLM interactions
 */
export const logLlmRequest = (model: string, prompt: string, tokenCount?: number) => {
  llmLogger.debug(`LLM request`, {
    model,
    promptLength: prompt.length,
    tokenCount,
    prompt: process.env.LOG_LEVEL === 'silly' ? prompt : undefined, // Only log full prompt in silly mode
  });
};

export const logLlmResponse = (model: string, response: string, tokenCount?: number, duration?: number) => {
  llmLogger.debug(`LLM response`, {
    model,
    responseLength: response.length,
    tokenCount,
    duration,
    response: process.env.LOG_LEVEL === 'silly' ? response : undefined, // Only log full response in silly mode
  });
};

export const logLlmError = (model: string, error: Error, retryAttempt?: number) => {
  llmLogger.error(`LLM request failed`, {
    model,
    error: error.message,
    stack: error.stack,
    retryAttempt,
  });
};

/**
 * Log evaluation results
 */
export const logEvaluationBatch = (batchSize: number, qualityGatePassed: boolean, highConfidenceCount: number, averageScore?: number) => {
  evaluationLogger.info(`Batch evaluation completed`, {
    batchSize,
    qualityGatePassed,
    highConfidenceCount,
    averageScore,
  });
};

export const logMovieEvaluation = (movieTitle: string, score: number, reasoning?: string) => {
  evaluationLogger.debug(`Movie evaluated`, {
    movieTitle,
    score,
    reasoning: process.env.LOG_LEVEL === 'silly' ? reasoning : undefined,
  });
};

/**
 * Log search strategy adaptations
 */
export const logSearchAdaptation = (attempt: number, originalCriteria: any, adaptedCriteria: any, reason: string) => {
  const logger = nodeLogger('batch_control_routing');
  logger.info(`Search strategy adapted`, {
    attempt,
    reason,
    originalCriteria: JSON.stringify(originalCriteria),
    adaptedCriteria: JSON.stringify(adaptedCriteria),
  });
};

/**
 * Log quality gate results
 */
export const logQualityGate = (passed: boolean, threshold: number, actualCount: number, totalMovies: number) => {
  const level = passed ? 'info' : 'warn';
  evaluationLogger[level](`Quality gate ${passed ? 'passed' : 'failed'}`, {
    passed,
    threshold,
    actualCount,
    totalMovies,
    successRate: totalMovies > 0 ? (actualCount / totalMovies * 100).toFixed(1) + '%' : '0%',
  });
};

/**
 * Log data fetching progress
 */
export const logDataFetchingProgress = (current: number, total: number, movieTitle?: string) => {
  const logger = nodeLogger('movie_discovery_fetching');
  logger.debug(`Data fetching progress`, {
    current,
    total,
    progress: `${current}/${total} (${((current / total) * 100).toFixed(1)}%)`,
    movieTitle,
  });
};

/**
 * Log structured data generation
 */
export const logStructuredDataGeneration = (movieCount: number, fieldsExtracted: string[], errors?: string[]) => {
  const logger = nodeLogger('movie_discovery_fetching');
  logger.debug(`Structured data generated`, {
    movieCount,
    fieldsExtracted,
    errors: errors?.length ? errors : undefined,
  });
};