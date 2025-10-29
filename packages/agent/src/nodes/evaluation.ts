import logger from '../config/logger';
import { 
  logNodeStart, 
  logNodeExecution,
  logEvaluationBatch,
  logQualityGate
} from '../utils/logging';
import { evaluateMoviesBatch } from '../services/movie-evaluation-llm';
import type { VideoRecommendationAgentState } from '../state/definition';

/**
 * Intelligent Evaluation Node - LLM-Powered Quality Assessment & Matching
 * 
 * Evaluates a batch of discovered movies against enhanced user criteria using LLM analysis
 * (Claude 3.5 Sonnet via AWS Bedrock). Each movie receives a confidence score (0.0-1.0)
 * indicating how well it matches user preferences.
 * 
 * CORE PROCESSING:
 * 1. Takes discoveredMoviesBatch and enhancedUserCriteria from state
 * 2. Calls evaluateMoviesBatch() service for LLM evaluation
 * 3. Calculates average confidence score across all evaluated movies
 * 4. Applies quality gate: requires ≥3 movies with confidence ≥0.8
 * 5. Adds high-confidence matches to allAcceptableCandidates accumulator
 * 6. Updates movieBatchOffset for next iteration
 * 
  * QUALITY GATE LOGIC:
 * - High Confidence Threshold: ≥0.8 confidence score (claude-3-haiku standard)
 * - Quality Gate Threshold: ≥8 high-confidence matches required (hardcoded - TESTING RECURSIVE DISCOVERY)
 * - Batch Processing: Evaluate up to X movies per batch for performance
 * 
 * STATE UPDATES:
 * - evaluatedMoviesBatch: Complete evaluation results with scores
 * - allAcceptableCandidates: Accumulates high-confidence matches across batches
 * - qualityGatePassedSuccessfully: Boolean indicating if batch meets standards
 * - highConfidenceMatchCount: Count of movies scoring ≥0.8
 * - movieBatchOffset: Updated for next batch iteration (currentOffset + batchSize)
 * 
 * LOGGING & MONITORING:
 * - Structured logging with node execution metrics
 * - Evaluation batch statistics (count, scores, quality gate status)
 * - Performance tracking with start/end times
 * - Top-performing movie identification for debugging
 * 
 * DEPENDENCIES:
 * - evaluateMoviesBatch() service handles LLM interaction
 * - Enhanced user criteria from prompt enhancement node
 * - Logging utilities for structured observability
 * 
 * NOTE: This is a stateful accumulation node that builds up acceptable candidates
 * across multiple batch iterations until quality gate passes or search completes.
 */
export async function intelligentEvaluationNode(
  state: typeof VideoRecommendationAgentState.State
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'intelligent_evaluation_node';
  const startTime = logNodeStart(nodeId, 'evaluate_movie_batch_quality', {
    batchSize: state.discoveredMoviesBatch.length,
    userCriteria: state.enhancedUserCriteria
  });

  logger.info('🧠 Starting intelligent batch evaluation', {
    nodeId,
    batchSize: state.discoveredMoviesBatch.length,
    targetGenres: state.enhancedUserCriteria?.enhancedGenres,
    familyFriendly: state.enhancedUserCriteria?.familyFriendly,
    evaluationThemes: state.enhancedUserCriteria?.preferredThemes
  });

  // Use real LLM evaluation of the movie batch
  const evaluatedMovies = await evaluateMoviesBatch(
    state.discoveredMoviesBatch, 
    state.enhancedUserCriteria!
  );

  const averageScore = evaluatedMovies.length > 0 ? 
    evaluatedMovies.reduce((sum, e) => sum + e.confidenceScore, 0) / evaluatedMovies.length : 0;
  const highConfidenceThreshold = 0.75; // High confidence threshold as requested
  const highConfidenceMatches = evaluatedMovies.filter(e => e.confidenceScore >= highConfidenceThreshold);
  const qualityGateThreshold = 3; // Require at least 3 high-confidence matches
  const qualityGatePassed = highConfidenceMatches.length >= qualityGateThreshold;

  // Log evaluation results
  logEvaluationBatch(evaluatedMovies.length, qualityGatePassed, highConfidenceMatches.length, averageScore * 10);
  logQualityGate(qualityGatePassed, qualityGateThreshold, highConfidenceMatches.length, evaluatedMovies.length);

  logger.info('📊 Intelligent evaluation completed', {
    nodeId,
    totalMoviesEvaluated: evaluatedMovies.length,
    averageConfidenceScore: averageScore.toFixed(2),
    highConfidenceMatches: highConfidenceMatches.length,
    qualityGateStatus: qualityGatePassed ? 'PASSED' : 'FAILED',
    qualityGateThreshold: qualityGateThreshold,
    highConfidenceThreshold: highConfidenceThreshold,
    topMovie: evaluatedMovies.length > 0 ? 
      evaluatedMovies.sort((a, b) => b.confidenceScore - a.confidenceScore)[0]?.movie.title : 'none',
    llmModel: 'claude-3.5-sonnet'
  });

  logNodeExecution(nodeId, 'evaluate_movie_batch_quality', startTime, {
    moviesEvaluated: evaluatedMovies.length,
    averageScore: averageScore.toFixed(2),
    highConfidenceCount: highConfidenceMatches.length,
    qualityGatePassed,
    evaluationQuality: 'llm-powered'
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
    movieBatchOffset: nextOffset
  };
}