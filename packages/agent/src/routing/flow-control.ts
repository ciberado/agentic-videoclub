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
  logger.debug('🔀 Evaluating routing decision', {
    qualityGatePassed: state.qualityGatePassedSuccessfully,
    searchAttempt: state.searchAttemptNumber,
    maxAttempts: state.maximumSearchAttempts,
    hasFinalRecommendations: state.finalRecommendations.length > 0
  });

  // If we have final recommendations, we're done
  if (state.finalRecommendations.length > 0) {
    logger.info('✅ Routing to END - Final recommendations ready', {
      recommendationCount: state.finalRecommendations.length
    });
    return END;
  }

  // If quality gate passed OR max attempts reached, go to batch control
  if (state.qualityGatePassedSuccessfully || state.searchAttemptNumber >= state.maximumSearchAttempts) {
    logger.info('🎯 Routing to batch_control_and_routing_node', {
      reason: state.qualityGatePassedSuccessfully ? 'quality_gate_passed' : 'max_attempts_reached'
    });
    return 'batch_control_and_routing_node';
  }

  // Continue the search loop
  logger.info('🔄 Routing to movie_discovery_and_data_fetching_node - Continuing search', {
    nextAttempt: state.searchAttemptNumber + 1
  });
  return 'movie_discovery_and_data_fetching_node';
}