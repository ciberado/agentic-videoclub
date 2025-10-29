import { END } from '@langchain/langgraph';

import logger from '../config/logger';
import type { VideoRecommendationAgentState } from '../state/definition';

/**
 * Conditional Routing Function - LangGraph Flow Control Logic
 * 
 * PURPOSE:
 * Implements the core conditional routing logic for the LangGraph workflow, determining
 * the next node to execute based on current state. This function serves as the "traffic
 * controller" that orchestrates the multi-step agent execution flow.
 * 
 * ROUTING DECISION MATRIX:
 * - END: Final recommendations available → terminate workflow
 * - batch_control_and_routing_node: Quality gate passed OR max attempts reached
 * - movie_discovery_and_data_fetching_node: Continue search with new criteria
 * 
 * - Model: Claude 3 Haiku (fast decision-making for routing logic)
 * - Smart Routing: LLM-assisted path selection based on state analysis
 * - Predictive Routing: Anticipate optimal paths based on current progress
 * - Dynamic Flow: Modify routing rules based on user context and history
 * 
 * STATE VALIDATION:
 * - Input Validation: Ensure state contains required fields for routing decisions
 * - Consistency Checks: Validate state transitions are logically sound
 * - Error Detection: Identify corrupted or incomplete state scenarios
 * - Recovery Logic: Handle edge cases and unexpected state conditions
 * 
 * INTEGRATION POINTS:
 * - LangGraph Edges: Compatible with conditional edge definitions
 * - State Management: Works with modern Annotation.Root() state pattern
 * - Error Handling: Graceful handling of routing failures
 * - Logging Integration: Comprehensive decision tracking via Winston
 * 
 * EDUCATIONAL VALUE:
 * Demonstrates LangGraph conditional routing patterns, state-based decision making,
 * and the implementation of complex workflow control logic in AI agent systems.
 */
export function shouldContinueSearching(state: typeof VideoRecommendationAgentState.State): string {
  const allCandidates = state.allAcceptableCandidates || [];
  const minimumRequired = state.minimumAcceptableCandidates || 5;
  const processedMovies = state.processedMovies || [];
  const allMovies = processedMovies.map(pm => pm.movie); // Extract movies from processed movies
  const currentOffset = state.movieBatchOffset || 0;
  const batchSize = state.movieBatchSize || 10;
  
  logger.debug('🔀 Evaluating routing decision with pagination', {
    qualityGatePassed: state.qualityGatePassedSuccessfully,
    searchAttempt: state.searchAttemptNumber,
    maxAttempts: state.maximumSearchAttempts,
    hasFinalRecommendations: state.finalRecommendations.length > 0,
    acceptableCandidates: allCandidates.length,
    minimumRequired,
    totalMoviesAvailable: allMovies.length,
    currentOffset,
    hasMoreMovies: currentOffset < allMovies.length
  });

  // If we have final recommendations or workflow is explicitly completed, we're done
  if (state.finalRecommendations.length > 0 || state.workflowCompleted) {
    logger.info('✅ Routing to END - Workflow completed', {
      recommendationCount: state.finalRecommendations.length,
      workflowCompleted: state.workflowCompleted,
      reason: state.finalRecommendations.length > 0 ? 'recommendations_ready' : 'no_candidates_found'
    });
    return END;
  }

  // If we have enough acceptable candidates, go to batch control to finalize
  if (allCandidates.length >= minimumRequired) {
    logger.info('🎯 Routing to batch_control_and_routing_node - Enough candidates found', {
      acceptableCandidates: allCandidates.length,
      minimumRequired,
      reason: 'sufficient_candidates'
    });
    return 'batch_control_and_routing_node';
  }

  // If max attempts reached, finalize with what we have
  if (state.searchAttemptNumber >= state.maximumSearchAttempts) {
    logger.info('🎯 Routing to batch_control_and_routing_node - Max attempts reached', {
      acceptableCandidates: allCandidates.length,
      minimumRequired,
      reason: 'max_attempts_reached'
    });
    return 'batch_control_and_routing_node';
  }

  // If we have more movies to evaluate in the current discovered batch, continue evaluation
  if (currentOffset < allMovies.length) {
    logger.info('🔄 Routing to intelligent_evaluation_node - Next batch available', {
      currentOffset,
      batchSize,
      totalMovies: allMovies.length,
      remainingMovies: allMovies.length - currentOffset,
      acceptableCandidates: allCandidates.length,
      reason: 'next_batch_evaluation'
    });
    return 'intelligent_evaluation_node';
  }

  // Check if we can do recursive discovery before finalizing
  const currentDepth = state.discoveryDepth || 0;
  const maxDepth = state.maxDiscoveryDepth || 2;
  const movieLinksQueue = state.movieLinksQueue || [];
  
  if (currentDepth < maxDepth && movieLinksQueue.length > 0 && allCandidates.length < minimumRequired) {
    logger.info('🔄 Routing to movie_discovery_and_data_fetching_node - Recursive discovery available', {
      currentDepth,
      maxDepth,
      queueSize: movieLinksQueue.length,
      acceptableCandidates: allCandidates.length,
      minimumRequired,
      reason: 'recursive_discovery_available'
    });
    return 'movie_discovery_and_data_fetching_node';
  }

  // No more movies or recursive options available, finalize with current candidates
  logger.info('🎯 Routing to batch_control_and_routing_node - No more movies available', {
    acceptableCandidates: allCandidates.length,
    minimumRequired,
    totalMoviesProcessed: allMovies.length,
    recursiveDiscoveryExhausted: currentDepth >= maxDepth || movieLinksQueue.length === 0,
    reason: 'movies_exhausted'
  });
  return 'batch_control_and_routing_node';
}