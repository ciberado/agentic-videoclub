import { END } from '@langchain/langgraph';
import logger from '../config/logger';
import type { VideoRecommendationAgentState } from '../state/definition';

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