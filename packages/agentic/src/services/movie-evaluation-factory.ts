import logger from '../config/logger';
import type { Movie, UserCriteria, MovieEvaluation } from '../types';

// Import both evaluation strategies
import { evaluateMoviesBatchWithPipeline } from './movie-evaluation-pipeline';
import { evaluateMoviesBatch as evaluateMoviesBatchSingleAgent } from './movie-evaluation-single-agent';

/**
 * Movie Evaluation Strategy Factory
 *
 * This factory provides a unified interface for movie evaluation that can switch
 * between different evaluation strategies at runtime. Implements the Factory design
 * pattern for creating appropriate evaluation strategies based on configuration.
 *
 * FACTORY PATTERN BENEFITS:
 * - Strategy instantiation based on configuration
 * - A/B testing different approaches
 * - Performance comparison and optimization
 * - Fallback mechanisms for robustness
 * - Development and debugging flexibility
 *
 * AVAILABLE STRATEGIES:
 * 1. 'single-agent' - Single React agent handles enrichment and evaluation
 * 2. 'pipeline' - Multi-step pipeline with specialized React agents
 *
 * CONFIGURATION:
 * Set MOVIE_EVALUATION_STRATEGY environment variable to control which strategy to use.
 * Defaults to 'pipeline' (current production strategy).
 */

export type EvaluationStrategy = 'single-agent' | 'pipeline';

/**
 * Get the current evaluation strategy from environment configuration
 */
function getEvaluationStrategy(): EvaluationStrategy {
  const strategy = process.env.MOVIE_EVALUATION_STRATEGY?.toLowerCase() as EvaluationStrategy;

  // Validate the strategy
  if (strategy && ['single-agent', 'pipeline'].includes(strategy)) {
    return strategy;
  }

  // Default to pipeline (current production approach)
  return 'pipeline';
}

/**
 * Factory function that creates the appropriate evaluation strategy
 *
 * @param movies - Array of movies to evaluate
 * @param userCriteria - Enhanced user criteria from prompt enhancement
 * @param strategy - Optional strategy override (for testing/debugging)
 * @returns Promise<MovieEvaluation[]>
 */
export async function evaluateMoviesBatch(
  movies: Movie[],
  userCriteria: UserCriteria,
  strategy?: EvaluationStrategy,
): Promise<MovieEvaluation[]> {
  const selectedStrategy = strategy || getEvaluationStrategy();
  const startTime = Date.now();

  logger.info('🏭 Starting movie evaluation factory', {
    component: 'movie-evaluation-factory',
    strategy: selectedStrategy,
    batchSize: movies.length,
    strategySetting: process.env.MOVIE_EVALUATION_STRATEGY || 'default',
  });

  try {
    let results: MovieEvaluation[];

    switch (selectedStrategy) {
      case 'single-agent':
        logger.debug('🤖 Using single React agent strategy', {
          component: 'movie-evaluation-factory',
          batchSize: movies.length,
        });
        results = await evaluateMoviesBatchSingleAgent(movies, userCriteria);
        break;

      case 'pipeline':
        logger.debug('🏭 Using pipeline strategy with specialized React agents', {
          component: 'movie-evaluation-factory',
          batchSize: movies.length,
        });
        results = await evaluateMoviesBatchWithPipeline(movies, userCriteria);
        break;

      default:
        throw new Error(`Unsupported evaluation strategy: ${selectedStrategy}`);
    }

    const processingTime = Date.now() - startTime;

    logger.info('✅ Movie evaluation factory completed', {
      component: 'movie-evaluation-factory',
      strategy: selectedStrategy,
      batchSize: movies.length,
      resultsCount: results.length,
      processingTime: `${processingTime}ms`,
      avgConfidenceScore:
        results.length > 0
          ? (results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length).toFixed(2)
          : '0.00',
      highConfidenceCount: results.filter((r) => r.confidenceScore >= 0.65).length,
    });

    return results;
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('❌ Movie evaluation factory failed', {
      component: 'movie-evaluation-factory',
      strategy: selectedStrategy,
      batchSize: movies.length,
      processingTime: `${processingTime}ms`,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Get information about the current evaluation strategy
 */
export function getEvaluationStrategyInfo(): {
  strategy: EvaluationStrategy;
  description: string;
  isDefault: boolean;
} {
  const strategy = getEvaluationStrategy();
  const isDefault = !process.env.MOVIE_EVALUATION_STRATEGY;

  const descriptions = {
    'single-agent':
      'Single React agent handles both enrichment and evaluation - simpler architecture',
    pipeline: 'Multi-step pipeline with specialized React agents - more robust production approach',
  };

  return {
    strategy,
    description: descriptions[strategy],
    isDefault,
  };
}

/**
 * Factory method for testing/debugging - allows explicit strategy comparison
 */
export async function compareEvaluationStrategies(
  movies: Movie[],
  userCriteria: UserCriteria,
): Promise<{
  singleAgent: MovieEvaluation[];
  pipeline: MovieEvaluation[];
  comparison: {
    singleAgentAvgScore: number;
    pipelineAvgScore: number;
    singleAgentProcessingTime: number;
    pipelineProcessingTime: number;
  };
}> {
  logger.info('🔬 Running evaluation strategy comparison via factory', {
    component: 'movie-evaluation-factory',
    batchSize: movies.length,
  });

  const startSingleAgent = Date.now();
  const singleAgent = await evaluateMoviesBatch(movies, userCriteria, 'single-agent');
  const singleAgentProcessingTime = Date.now() - startSingleAgent;

  const startPipeline = Date.now();
  const pipeline = await evaluateMoviesBatch(movies, userCriteria, 'pipeline');
  const pipelineProcessingTime = Date.now() - startPipeline;

  const singleAgentAvgScore =
    singleAgent.length > 0
      ? singleAgent.reduce((sum, r) => sum + r.confidenceScore, 0) / singleAgent.length
      : 0;
  const pipelineAvgScore =
    pipeline.length > 0
      ? pipeline.reduce((sum, r) => sum + r.confidenceScore, 0) / pipeline.length
      : 0;

  logger.info('📊 Evaluation strategy comparison completed via factory', {
    component: 'movie-evaluation-factory',
    singleAgentAvgScore: singleAgentAvgScore.toFixed(2),
    pipelineAvgScore: pipelineAvgScore.toFixed(2),
    singleAgentTime: `${singleAgentProcessingTime}ms`,
    pipelineTime: `${pipelineProcessingTime}ms`,
  });

  return {
    singleAgent,
    pipeline,
    comparison: {
      singleAgentAvgScore,
      pipelineAvgScore,
      singleAgentProcessingTime,
      pipelineProcessingTime,
    },
  };
}

// Re-export the original functions for backward compatibility if needed
export { evaluateMoviesBatchSingleAgent, evaluateMoviesBatchWithPipeline };
