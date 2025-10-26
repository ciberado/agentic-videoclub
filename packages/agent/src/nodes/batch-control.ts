import logger from '../config/logger';
import { 
  logNodeStart, 
  logNodeExecution, 
  logSearchAdaptation
} from '../utils/logging';
import type { MovieEvaluation } from '../types';
import type { VideoRecommendationAgentState } from '../state/definition';

export async function batchControlAndRoutingNode(
  state: typeof VideoRecommendationAgentState.State
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'batch_control_and_routing_node';
  const startTime = logNodeStart(nodeId, 'control_batch_flow_and_routing', {
    qualityGatePassed: state.qualityGatePassedSuccessfully,
    searchAttempt: state.searchAttemptNumber,
    maxAttempts: state.maximumSearchAttempts
  });

  logger.info('🎯 Starting batch control and routing analysis', {
    nodeId,
    qualityGatePassed: state.qualityGatePassedSuccessfully,
    currentAttempt: state.searchAttemptNumber,
    maxAttempts: state.maximumSearchAttempts,
    highConfidenceMatches: state.highConfidenceMatchCount
  });

  let finalRecommendations: MovieEvaluation[] = [];
  let searchAttemptNumber = state.searchAttemptNumber;

  if (state.qualityGatePassedSuccessfully) {
    // SUCCESS PATH: Quality gate passed, compile final recommendations
    logger.info('✅ Quality gate PASSED - Compiling final recommendations', {
      nodeId,
      highConfidenceMatches: state.highConfidenceMatchCount,
      totalEvaluated: state.evaluatedMoviesBatch.length
    });

    // Sort by confidence score and take top recommendations
    finalRecommendations = state.evaluatedMoviesBatch
      .sort((a: MovieEvaluation, b: MovieEvaluation) => b.confidenceScore - a.confidenceScore)
      .slice(0, 5); // Top 5 recommendations

    logger.info('🏆 Final recommendations compiled successfully', {
      nodeId,
      recommendationCount: finalRecommendations.length,
      topRecommendation: finalRecommendations[0]?.movie.title,
      averageConfidence: (finalRecommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / finalRecommendations.length).toFixed(2)
    });

  } else if (state.searchAttemptNumber < state.maximumSearchAttempts) {
    // RETRY PATH: Quality gate failed, but we can try again
    searchAttemptNumber = state.searchAttemptNumber + 1;
    
    logger.warn('⚠️ Quality gate FAILED - Triggering search strategy adaptation', {
      nodeId,
      currentAttempt: state.searchAttemptNumber,
      nextAttempt: searchAttemptNumber,
      highConfidenceMatches: state.highConfidenceMatchCount,
      requiredMatches: 3
    });

    // Simulate adaptive search strategy modification
    const originalCriteria = state.enhancedUserCriteria;
    const adaptedCriteria = {
      ...originalCriteria!,
      enhancedGenres: [...originalCriteria!.enhancedGenres, "Adventure", "Action"], // Expand genres
      searchTerms: [...originalCriteria!.searchTerms, "popular sci-fi", "award-winning sci-fi"] // Broaden search
    };

    logSearchAdaptation(
      searchAttemptNumber,
      originalCriteria,
      adaptedCriteria,
      'Expanding genre criteria and search terms to find more matches'
    );

    logger.info('🔄 Search strategy adapted for next iteration', {
      nodeId,
      newAttemptNumber: searchAttemptNumber,
      expandedGenres: adaptedCriteria.enhancedGenres,
      newSearchTerms: adaptedCriteria.searchTerms,
      adaptationReason: 'insufficient_quality_matches'
    });

  } else {
    // MAX ATTEMPTS REACHED: Return best available results
    logger.warn('🛑 Maximum search attempts reached - Returning best available results', {
      nodeId,
      attemptsUsed: state.searchAttemptNumber,
      maxAttempts: state.maximumSearchAttempts,
      bestAvailableCount: state.evaluatedMoviesBatch.length
    });

    // Return the best movies we found, even if they don't meet the quality threshold
    finalRecommendations = state.evaluatedMoviesBatch
      .sort((a: MovieEvaluation, b: MovieEvaluation) => b.confidenceScore - a.confidenceScore)
      .slice(0, 3); // At least 3 recommendations

    logger.info('📋 Best available recommendations compiled', {
      nodeId,
      recommendationCount: finalRecommendations.length,
      averageQuality: 'below_threshold_but_best_available',
      topRecommendation: finalRecommendations[0]?.movie.title
    });
  }

  logNodeExecution(nodeId, 'control_batch_flow_and_routing', startTime, {
    routingDecision: state.qualityGatePassedSuccessfully ? 'SUCCESS' : 
                    (searchAttemptNumber <= state.maximumSearchAttempts ? 'RETRY' : 'MAX_ATTEMPTS'),
    finalRecommendationsCount: finalRecommendations.length,
    nextSearchAttempt: searchAttemptNumber,
    flowComplete: finalRecommendations.length > 0
  });

  return {
    finalRecommendations,
    searchAttemptNumber
  };
}