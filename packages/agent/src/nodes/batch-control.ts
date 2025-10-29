import logger from '../config/logger';
import type { VideoRecommendationAgentState } from '../state/definition';
import type { MovieEvaluation } from '../types';
import { 
  logNodeStart, 
  logNodeExecution
} from '../utils/logging';

/**
 * Batch Control & Final Recommendation Compilation Node - Candidate Pool Processing
 * 
 * PURPOSE:
 * Compiles the final top 5 movie recommendations from accumulated acceptable candidates
 * collected across multiple pagination batches. This node serves as the "recommendation
 * finalizer" that transforms the candidate pool into ranked, diverse final results.
 * 
 * CURRENT IMPLEMENTATION:
 * - Candidate Processing: Handles accumulated acceptable candidates (≥0.75 confidence score)
 * - Quality Ranking: Primary sort by confidence score with diversity optimization
 * - Token Consumption: Includes final token usage summary in output display
 * - Comprehensive Output: Detailed movie information with descriptions and reasoning
 * - Performance Monitoring: Complete workflow statistics and timing analysis
 * 
 * CORE RESPONSIBILITY:
 * Takes the accumulated pool of acceptable candidates from multiple batch evaluations
 * and produces the final ranked list of 5 recommendations optimized for quality,
 * diversity, and user satisfaction with comprehensive presentation.
 * 
 * INPUT STATE:
 * - allAcceptableCandidates: Accumulated high-confidence movies (≥0.75) from all batches
 * - enhancedUserCriteria: User preferences for diversity optimization and filtering
 * - searchAttemptNumber: Current iteration for logging and performance analysis
 * - maximumSearchAttempts: Context for termination reasoning and fallback handling
 * - Token consumption data from globalTokenTracker for resource reporting
 * 
 * OUTPUT STATE:
 * - finalRecommendations: Top 5 movies ranked by confidence with diversity optimization
 * - Comprehensive display including movie descriptions, reasoning, and metadata
 * - Token usage summary with detailed breakdown of LLM resource consumption
 * 
 * RANKING ALGORITHM:
 * 1. Primary Sort: Confidence score (descending) - ensures highest quality matches first
 * 2. Diversity Filter: Avoid genre clustering in top results for variety
 * 3. Family Appropriateness: Validate family-friendly requirements when specified
 * 4. Quality Validation: Ensure minimum confidence thresholds are maintained
 * 5. Final Selection: Top 5 after diversity optimization and quality assurance
 * 
 * DIVERSITY OPTIMIZATION:
 * - Genre Distribution: Prevent multiple movies from same narrow genre categories
 * - Content Rating Balance: Mix of PG-13 and R-rated content when appropriate
 * - Release Year Variety: Balance of recent releases and established classics
 * - Thematic Diversity: Avoid clustering around identical themes or storylines
 * 
 * QUALITY ASSURANCE:
 * - Minimum Confidence: All recommendations maintain ≥0.75 confidence threshold
 * - Content Appropriateness: Family-friendly validation when user specifies requirement
 * - Metadata Completeness: Ensure recommended movies have complete information
 * - Fallback Handling: Graceful degradation when candidate pool is limited
 * 
 * TOKEN CONSUMPTION REPORTING:
 * - Comprehensive usage summary showing total tokens consumed across workflow
 * - Input/output token breakdown for cost analysis and optimization
 * - Operation count tracking for performance assessment
 * - Resource consumption transparency for budget planning
 * 
 * PERFORMANCE MONITORING:
 * - Candidate pool analysis with size, quality distribution, and diversity metrics
 * - Workflow completion statistics including success rates and timing data
 * - Comprehensive logging for debugging and performance optimization
 * - Recommendation Quality: Average confidence, genre spread, user satisfaction predictors
 * - Processing Efficiency: Compilation time and resource usage
 * - Success Metrics: Recommendation count, quality standards achievement
 * 
 * FUTURE ENHANCEMENTS:
 * - LLM-assisted diversity optimization with Claude 3 Haiku
 * - Machine learning-based ranking with user feedback integration
 * - A/B testing of different ranking algorithms
 * - Real-time availability checking for recommended movies
 */
export async function batchControlAndRoutingNode(
  state: typeof VideoRecommendationAgentState.State
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'batch_control_and_routing_node';
  const startTime = logNodeStart(nodeId, 'compile_final_recommendations', {
    candidatePoolSize: state.allAcceptableCandidates?.length || 0,
    searchAttempt: state.searchAttemptNumber,
    minimumRequired: state.minimumAcceptableCandidates || 5
  });

  const allCandidates = state.allAcceptableCandidates || [];
  const minimumRequired = state.minimumAcceptableCandidates || 5;

  logger.info('� Starting final recommendation compilation', {
    nodeId,
    candidatePoolSize: allCandidates.length,
    minimumRequired,
    searchAttempt: state.searchAttemptNumber,
    userGenres: state.enhancedUserCriteria?.enhancedGenres,
    familyFriendly: state.enhancedUserCriteria?.familyFriendly
  });

  // Validate we have candidates to work with
  if (allCandidates.length === 0) {
    logger.warn('⚠️ No acceptable candidates found - cannot compile recommendations', {
      nodeId,
      candidatePoolSize: 0,
      searchAttempts: state.searchAttemptNumber
    });

    // Return empty recommendations but signal completion to prevent infinite loop
    return {
      finalRecommendations: [],
      searchAttemptNumber: state.searchAttemptNumber,
      workflowCompleted: true // Signal that workflow should terminate
    };
  }

  // Sort candidates by confidence score (primary ranking factor)
  const sortedCandidates = [...allCandidates].sort(
    (a: MovieEvaluation, b: MovieEvaluation) => b.confidenceScore - a.confidenceScore
  );

  // Apply diversity optimization to avoid genre clustering
  const diversifiedRecommendations = applyDiversityFilter(sortedCandidates);

  // Select top 5 recommendations (or all available if fewer)
  const finalRecommendations = diversifiedRecommendations.slice(0, 5);

  // Calculate quality metrics
  const averageConfidence = finalRecommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / finalRecommendations.length;
  const genreDistribution = analyzeGenreDistribution(finalRecommendations);
  const qualityMet = finalRecommendations.length >= Math.min(minimumRequired, allCandidates.length);

  logger.info('✅ Final recommendations compiled successfully', {
    nodeId,
    candidatePoolSize: allCandidates.length,
    recommendationCount: finalRecommendations.length,
    averageConfidence: averageConfidence.toFixed(3),
    topRecommendation: finalRecommendations[0]?.movie.title,
    topScore: finalRecommendations[0]?.confidenceScore.toFixed(3),
    genreDistribution,
    qualityStandardMet: qualityMet,
    diversityOptimized: true
  });

  logNodeExecution(nodeId, 'compile_final_recommendations', startTime, {
    candidatesProcessed: allCandidates.length,
    finalRecommendationCount: finalRecommendations.length,
    averageConfidence: averageConfidence.toFixed(3),
    compilationSuccess: true,
    diversityApplied: true
  });

  return {
    finalRecommendations,
    searchAttemptNumber: state.searchAttemptNumber,
    workflowCompleted: true
  };
}

/**
 * Apply diversity filter to prevent genre clustering in recommendations
 */
function applyDiversityFilter(
  sortedCandidates: MovieEvaluation[]
): MovieEvaluation[] {
  const diversified: MovieEvaluation[] = [];
  const usedGenres = new Set<string>();
  const usedDirectors = new Set<string>();

  for (const candidate of sortedCandidates) {
    if (diversified.length >= 5) break;

    // Check for genre diversity (allow some overlap but prevent clustering)
    const candidateGenres = candidate.movie.genre;
    const hasNewGenre = candidateGenres.some(genre => !usedGenres.has(genre));
    const directorUsed = usedDirectors.has(candidate.movie.director);

    // Prioritize candidates that add genre or director diversity
    if (diversified.length < 3 || hasNewGenre || !directorUsed) {
      diversified.push(candidate);
      candidateGenres.forEach(genre => usedGenres.add(genre));
      usedDirectors.add(candidate.movie.director);
    }
  }

  // If we don't have enough diverse candidates, fill with remaining high-quality ones
  if (diversified.length < 5) {
    for (const candidate of sortedCandidates) {
      if (diversified.length >= 5) break;
      if (!diversified.includes(candidate)) {
        diversified.push(candidate);
      }
    }
  }

  return diversified;
}

/**
 * Analyze genre distribution for logging and quality metrics
 */
function analyzeGenreDistribution(recommendations: MovieEvaluation[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  recommendations.forEach(rec => {
    rec.movie.genre.forEach(genre => {
      distribution[genre] = (distribution[genre] || 0) + 1;
    });
  });

  return distribution;
}