import logger, { nodeLogger, httpLogger, llmLogger, evaluationLogger } from '../config/logger';
import {
  logNodeStart,
  logNodeExecution,
  logHttpRequest,
  logHttpResponse,
  logLlmRequest,
  logLlmResponse,
  logEvaluationBatch,
  logQualityGate,
} from '../utils/logging';

describe('Winston Logger Configuration', () => {
  beforeEach(() => {
    // Suppress console output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should create logger instances without errors', () => {
    expect(logger).toBeDefined();
    expect(nodeLogger('test-node')).toBeDefined();
    expect(httpLogger).toBeDefined();
    expect(llmLogger).toBeDefined();
    expect(evaluationLogger).toBeDefined();
  });

  test('should log different levels correctly', () => {
    expect(() => {
      logger.debug('Test debug message');
      logger.info('Test info message');
      logger.warn('Test warn message');
      logger.error('Test error message');
    }).not.toThrow();
  });

  test('should handle node execution logging', () => {
    const startTime = logNodeStart('test-node', 'test-operation', { input: 'test' });

    expect(typeof startTime).toBe('number');
    expect(startTime).toBeLessThanOrEqual(Date.now());

    // Wait a bit to ensure duration is > 0
    setTimeout(() => {
      logNodeExecution('test-node', 'test-operation', startTime, { output: 'success' });
    }, 10);
  });

  test('should handle HTTP request logging', () => {
    expect(() => {
      logHttpRequest('https://example.com', 'GET');
      logHttpResponse('https://example.com', 200, 150, 1024);
    }).not.toThrow();
  });

  test('should handle LLM interaction logging', () => {
    expect(() => {
      logLlmRequest('claude-3-haiku', 'Test prompt', 100);
      logLlmResponse('claude-3-haiku', 'Test response', 50, 200);
    }).not.toThrow();
  });

  test('should handle evaluation logging', () => {
    expect(() => {
      logEvaluationBatch(10, true, 4, 8.5);
      logQualityGate(true, 3, 4, 10);
    }).not.toThrow();
  });

  test('should create child loggers with correct context', () => {
    const testNodeLogger = nodeLogger('test-node-id');
    expect(testNodeLogger).toBeDefined();

    // Test that child logger works without throwing
    expect(() => {
      testNodeLogger.info('Test message with node context');
    }).not.toThrow();
  });
});
