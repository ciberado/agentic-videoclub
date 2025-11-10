import logger from '../config/logger';
import { evaluateMoviesBatch } from '../services/movie-evaluation-llm';
import type { VideoRecommendationAgentState } from '../state/definition';
import {
  logNodeStart,
  logNodeExecution,
  logEvaluationBatch,
  logQualityGate,
} from '../utils/logging';

/**
 * Evaluates movies using an intelligent agent powered by LLMs
 *
 * This node processes batches of discovered movies using Claude 3.5 Sonnet to:
 * - Analyze each movie against user criteria
 * - Enrich movie data from TMDB when needed
 * - Score movies based on genre, themes, and content
 * - Build up a collection of high-quality matches
 *
 * Key features:
 * - Parallel batch processing for performance
 * - Quality gates to ensure good matches:
 *   - Minimum confidence score of 0.75
 *   - At least 3 high-confidence matches needed
 * - Family-friendly content validation
 * - Token usage monitoring
 *
 * The node:
 * 1. Takes in discovered movies and user preferences
 * 2. Evaluates each movie with the LLM
 * 3. Tracks quality metrics and confidence scores
 * 4. Accumulates good matches for recommendations
 * 5. Updates the batch offset for the next round
 *
 * State updates include:
 * - Evaluation results with confidence scores
 * - Collection of acceptable candidates
 * - Quality gate status
 * - Match counts and batch position
 */

export async function intelligentEvaluationNode(
  state: typeof VideoRecommendationAgentState.State,
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'intelligent_evaluation_node';
  const startTime = logNodeStart(nodeId, 'evaluate_movie_batch_quality', {
    batchSize: state.discoveredMoviesBatch.length,
    userCriteria: state.enhancedUserCriteria,
  });

  logger.info('🧠 Starting intelligent batch evaluation', {
    nodeId,
    batchSize: state.discoveredMoviesBatch.length,
    targetGenres: state.enhancedUserCriteria?.enhancedGenres,
    familyFriendly: state.enhancedUserCriteria?.familyFriendly,
    evaluationThemes: state.enhancedUserCriteria?.preferredThemes,
    batchTitles: state.discoveredMoviesBatch.map((m) => m.title),
  });

  // Use real LLM evaluation of the movie batch
  const evaluatedMovies = await evaluateMoviesBatch(
    state.discoveredMoviesBatch,
    state.enhancedUserCriteria!,
  );

  const averageScore =
    evaluatedMovies.length > 0
      ? evaluatedMovies.reduce((sum, e) => sum + e.confidenceScore, 0) / evaluatedMovies.length
      : 0;
  const highConfidenceThreshold = 0.75; // High confidence threshold as requested
  const highConfidenceMatches = evaluatedMovies.filter(
    (e) => e.confidenceScore >= highConfidenceThreshold,
  );
  const qualityGateThreshold = 3; // Require at least 3 high-confidence matches
  const qualityGatePassed = highConfidenceMatches.length >= qualityGateThreshold;

  // Log evaluation results
  logEvaluationBatch(
    evaluatedMovies.length,
    qualityGatePassed,
    highConfidenceMatches.length,
    averageScore * 10,
  );
  logQualityGate(
    qualityGatePassed,
    qualityGateThreshold,
    highConfidenceMatches.length,
    evaluatedMovies.length,
  );

  logger.info('📊 Intelligent evaluation completed', {
    nodeId,
    totalMoviesEvaluated: evaluatedMovies.length,
    averageConfidenceScore: averageScore.toFixed(2),
    highConfidenceMatches: highConfidenceMatches.length,
    qualityGateStatus: qualityGatePassed ? 'PASSED' : 'FAILED',
    qualityGateThreshold: qualityGateThreshold,
    highConfidenceThreshold: highConfidenceThreshold,
    topMovie:
      evaluatedMovies.length > 0
        ? evaluatedMovies.sort((a, b) => b.confidenceScore - a.confidenceScore)[0]?.movie.title
        : 'none',
    llmModel: 'claude-3.5-sonnet',
  });

  logNodeExecution(nodeId, 'evaluate_movie_batch_quality', startTime, {
    moviesEvaluated: evaluatedMovies.length,
    averageScore: averageScore.toFixed(2),
    highConfidenceCount: highConfidenceMatches.length,
    qualityGatePassed,
    evaluationQuality: 'llm-powered',
  });

  // Add high-confidence matches to all acceptable candidates
  const allAcceptableCandidates = state.allAcceptableCandidates || [];
  const updatedAcceptableCandidates = [...allAcceptableCandidates, ...highConfidenceMatches];

  // Update batch offset for next iteration
  const currentOffset = state.movieBatchOffset || 0;
  const batchSize = state.movieBatchSize || 10;
  const nextOffset = currentOffset + batchSize;

  return {
    evaluatedMoviesBatch: evaluatedMovies,
    allAcceptableCandidates: updatedAcceptableCandidates,
    qualityGatePassedSuccessfully: qualityGatePassed,
    highConfidenceMatchCount: highConfidenceMatches.length,
    movieBatchOffset: nextOffset,
  };
}
