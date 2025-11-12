import logger from '../config/logger';
import { evaluateMoviesBatchWithReactAgentIntegration } from '../services/movie-evaluation-llm-react-integration';
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
 *   - Minimum confidence score of 0.4
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

  // Filter out already evaluated movies to prevent duplicates
  const alreadyEvaluated = state.allAcceptableCandidates || [];
  const evaluatedMovieKeys = new Set(
    alreadyEvaluated.map(
      (evaluation) => `${evaluation.movie.title.toLowerCase().trim()}_${evaluation.movie.year}`,
    ),
  );

  const moviesToEvaluate = state.discoveredMoviesBatch.filter((movie) => {
    const movieKey = `${movie.title.toLowerCase().trim()}_${movie.year}`;
    return !evaluatedMovieKeys.has(movieKey);
  });

  const duplicatesFiltered = state.discoveredMoviesBatch.length - moviesToEvaluate.length;

  logger.info('🧠 Starting intelligent batch evaluation', {
    nodeId,
    originalBatchSize: state.discoveredMoviesBatch.length,
    duplicatesFiltered,
    moviesToEvaluate: moviesToEvaluate.length,
    targetGenres: state.enhancedUserCriteria?.enhancedGenres,
    familyFriendly: state.enhancedUserCriteria?.familyFriendly,
    evaluationThemes: state.enhancedUserCriteria?.preferredThemes,
    batchTitles: moviesToEvaluate.map((m) => m.title),
  });

  // Skip LLM evaluation if no new movies to evaluate
  if (moviesToEvaluate.length === 0) {
    logger.info('⚡ All movies in batch already evaluated - skipping LLM evaluation', {
      nodeId,
      duplicatesSkipped: duplicatesFiltered,
    });

    return {
      evaluatedMoviesBatch: [],
      allAcceptableCandidates: alreadyEvaluated,
      qualityGatePassedSuccessfully: alreadyEvaluated.length >= 3,
      highConfidenceMatchCount: alreadyEvaluated.filter((e) => e.confidenceScore >= 0.65).length,
      movieBatchOffset: (state.movieBatchOffset || 0) + (state.movieBatchSize || 10),
    };
  }

  // Use real LLM evaluation of the movie batch with React agent integration (includes poster URL extraction)
  const evaluatedMovies = await evaluateMoviesBatchWithReactAgentIntegration(
    moviesToEvaluate,
    state.enhancedUserCriteria!,
  );

  const averageScore =
    evaluatedMovies.length > 0
      ? evaluatedMovies.reduce((sum, e) => sum + e.confidenceScore, 0) / evaluatedMovies.length
      : 0;
  const highConfidenceThreshold = 0.65; // Lowered from 0.75 to allow reasonable matches
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

  // Add high-confidence matches to all acceptable candidates
  const allAcceptableCandidates = state.allAcceptableCandidates || [];
  const updatedAcceptableCandidates = [...allAcceptableCandidates, ...highConfidenceMatches];

  logger.info('📊 Intelligent evaluation completed', {
    nodeId,
    originalBatchSize: state.discoveredMoviesBatch.length,
    duplicatesFiltered,
    newMoviesEvaluated: evaluatedMovies.length,
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
    totalAcceptableCandidates: updatedAcceptableCandidates.length,
  });

  logNodeExecution(nodeId, 'evaluate_movie_batch_quality', startTime, {
    originalBatchSize: state.discoveredMoviesBatch.length,
    duplicatesFiltered,
    moviesEvaluated: evaluatedMovies.length,
    averageScore: averageScore.toFixed(2),
    highConfidenceCount: highConfidenceMatches.length,
    qualityGatePassed,
    evaluationQuality: 'llm-powered',
    totalAcceptableCandidates: updatedAcceptableCandidates.length,
  });

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
