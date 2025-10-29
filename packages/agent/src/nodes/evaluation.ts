import logger from '../config/logger';
import { evaluateMoviesBatch } from '../services/movie-evaluation-llm';
import type { VideoRecommendationAgentState } from '../state/definition';
import { 
  logNodeStart, 
  logNodeExecution,
  logEvaluationBatch,
  logQualityGate
} from '../utils/logging';

/**
 * Intelligent Evaluation Node - Claude 3.5 Sonnet-Powered Quality Assessment & Matching
 * 
 * PURPOSE:
 * Evaluates batches of discovered movies against enhanced user criteria using advanced
 * LLM analysis (Claude 3.5 Sonnet via AWS Bedrock). Each movie receives a comprehensive
 * multi-dimensional confidence score (0.0-1.0) indicating match quality.
 * 
 * CURRENT IMPLEMENTATION:
 * - Model: Claude 3.5 Sonnet (superior reasoning for complex movie analysis)
 * - Processing: Parallel batch evaluation using Promise.allSettled for performance
 * - Token Tracking: Integrated consumption monitoring across all evaluation operations
 * - Quality Gate: Configurable thresholds with intelligent candidate accumulation
 * - Multi-dimensional Analysis: Genre alignment, theme matching, age appropriateness,
 *   quality indicators, and cultural relevance scoring
 * 
 * CORE PROCESSING FLOW:
 * 1. Receives discoveredMoviesBatch and enhancedUserCriteria from workflow state
 * 2. Executes parallel LLM evaluation using evaluateMoviesBatch() service
 * 3. Calculates comprehensive confidence scores with detailed reasoning
 * 4. Applies quality gate thresholds (≥0.75 high confidence, ≥3 candidates minimum)
 * 5. Accumulates acceptable candidates (≥0.75 confidence) in workflow state
 * 6. Updates pagination offset for next batch iteration
 * 
 * QUALITY GATE LOGIC:
 * - High Confidence Threshold: ≥0.75 confidence score (optimized for quality)
 * - Quality Gate Minimum: ≥3 high-confidence matches required for completion
 * - Family Appropriateness: Validates family-friendly requirements when specified
 * - Batch Processing: Evaluates 10 movies per batch for optimal LLM performance
 * - Adaptive Termination: Continues until minimum candidates found or movies exhausted
 * 
 * TOKEN CONSUMPTION TRACKING:
 * - Monitors input/output tokens for all Claude 3.5 Sonnet operations
 * - Provides cost analysis and performance optimization insights
 * - Typical usage: ~3,000-4,000 tokens per 10-movie batch evaluation
 * 
 * STATE UPDATES:
 * - evaluatedMoviesBatch: Complete evaluation results with confidence scores and reasoning
 * - allAcceptableCandidates: Accumulates high-confidence matches across all batches
 * - qualityGatePassedSuccessfully: Boolean indicating if batch meets quality standards
 * - highConfidenceMatchCount: Count of movies scoring ≥0.75 confidence
 * - movieBatchOffset: Updated pagination offset for next batch iteration
 * 
 * PERFORMANCE MONITORING:
 * - Structured logging with comprehensive node execution metrics
 * - Evaluation batch statistics including success rates and average scores
 * - Performance tracking with detailed timing and token consumption data
 * - Top-performing movie identification for quality assurance and debugging
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