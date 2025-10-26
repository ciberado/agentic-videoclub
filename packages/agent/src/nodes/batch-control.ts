import logger from '../config/logger';
import { 
  logNodeStart, 
  logNodeExecution, 
  logSearchAdaptation
} from '../utils/logging';
import type { MovieEvaluation } from '../types';
import type { VideoRecommendationAgentState } from '../state/definition';

/**
 * Batch Control & Routing Node - Adaptive Search Management & Flow Control
 * 
 * PURPOSE:
 * Orchestrates the iterative search process through intelligent flow control and adaptive
 * strategy modification. This node serves as the "strategic controller" that determines
 * when to continue searching, when to adapt criteria, and when to finalize results.
 * 
 * CURRENT IMPLEMENTATION:
 * - Quality gate evaluation and routing decisions
 * - Search attempt tracking with maximum limits (3 attempts)
 * - Final recommendation compilation and ranking
 * - Simulated adaptive search strategy modification
 * - Comprehensive flow control logging for debugging
 * 
 * FUTURE LLM INTEGRATION:
 * - Model: Claude 3 Haiku (fast decision-making for routing logic)
 * - Integration: AWS Bedrock for strategic analysis and adaptation
 * - Decision Support: LLM-assisted search strategy optimization
 * - Tools: Search strategy analyzer, recommendation optimizer
 * 
 * ADAPTIVE SEARCH STRATEGY:
 * - Quality Assessment: Analyze evaluation results for improvement opportunities
 * - Criteria Expansion: Intelligently broaden search parameters
 *   - Genre expansion (add related genres: sci-fi → add space opera, cyberpunk)
 *   - Time period widening (extend year ranges for classics)
 *   - Rating flexibility (adjust content rating restrictions)
 *   - Theme diversification (broaden thematic preferences)
 * - Search Term Optimization: Generate new keywords based on previous results
 * - Feedback Loop: Learn from failed searches to improve future strategies
 * 
 * ROUTING DECISION MATRIX:
 * - SUCCESS PATH: Quality gate passed → compile final recommendations → END
 * - RETRY PATH: Quality gate failed + attempts < max → adapt strategy → continue search
 * - COMPLETION PATH: Max attempts reached → return best available → END
 * - EMERGENCY PATH: Critical failure → fallback recommendations → END
 * 
 * LLM-ENHANCED ADAPTATION:
 * - Strategy Analysis Prompt: "Given search results and user criteria, how should we modify the search?"
 * - Expansion Recommendations: LLM suggests which criteria to relax or broaden
 * - Quality Prediction: Estimate success probability of proposed adaptations
 * - Multi-Strategy Evaluation: Compare different adaptation approaches
 * 
 * RECOMMENDATION COMPILATION:
 * - Ranking Algorithm: Multi-factor scoring (confidence, rating, diversity)
 * - Diversity Optimization: Ensure variety in genres, years, styles within top results
 * - Explanation Generation: Create reasoning for final recommendation order
 * - Quality Assurance: Validate final recommendations meet minimum standards
 * 
 * FLOW CONTROL LOGIC:
 * - State Validation: Ensure all required data is available for decisions
 * - Condition Evaluation: Complex boolean logic for routing decisions
 * - Error Recovery: Handle edge cases and unexpected state transitions
 * - Performance Monitoring: Track routing efficiency and success rates
 * 
 * SEARCH OPTIMIZATION TECHNIQUES:
 * - A/B Testing: Compare different adaptation strategies
 * - Success Rate Tracking: Monitor which adaptations lead to better results
 * - User Feedback Integration: Incorporate user satisfaction into strategy learning
 * - Contextual Adaptation: Consider time of day, user history, trending content
 * 
 * MCP TOOL INTEGRATION:
 * - Search Strategy MCP: Advanced search optimization algorithms
 * - Trending Content MCP: Current popularity and availability data
 * - User Behavior MCP: Historical preference patterns for similar users
 * - Recommendation Validator MCP: Quality check final recommendations
 * 
 * PERFORMANCE METRICS:
 * - Quality Gate Success Rate: Percentage of searches that pass quality thresholds
 * - Average Search Attempts: Efficiency metric for search convergence
 * - User Satisfaction Correlation: How often final recommendations satisfy users
 * - Adaptation Effectiveness: Success rate improvement after strategy changes
 * 
 * ADVANCED FEATURES:
 * - Predictive Routing: Anticipate likely search outcomes and pre-adapt
 * - Multi-Path Exploration: Parallel search strategies with best-result selection
 * - Dynamic Thresholds: Adjust quality gates based on search difficulty
 * - Learning Integration: Improve routing decisions based on historical data
 * 
 * ERROR HANDLING:
 * - Infinite Loop Prevention: Strict attempt limits and state validation
 * - Graceful Degradation: Always provide some recommendations
 * - Fallback Strategies: Rule-based routing if LLM-assisted decisions fail
 * - State Recovery: Handle corrupted or incomplete state gracefully
 * 
 * EDUCATIONAL VALUE:
 * Demonstrates complex control flow, adaptive algorithms, and the balance between
 * automation and human-interpretable decision-making in AI systems.
 */
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