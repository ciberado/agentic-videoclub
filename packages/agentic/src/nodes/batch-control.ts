import logger from '../config/logger';
import type { VideoRecommendationAgentState } from '../state/definition';
import type { MovieEvaluation } from '../types';
import { logNodeStart, logNodeExecution } from '../utils/logging';

/**
 * Final Recommendation Compilation Node
 *
 * PURPOSE:
 * Compiles the final top 5 movie recommendations from accumulated acceptable candidates.
 * This node serves as the workflow terminator that transforms the candidate pool into
 * ranked, diverse final results and signals workflow completion.
 *
 * CURRENT IMPLEMENTATION:
 * - Candidate Processing: Sorts accumulated candidates by confidence score
 * - Basic Diversity Filter: Prevents genre/director clustering in top results
 * - Quality Metrics: Calculates average confidence and genre distribution
 * - Workflow Termination: Sets workflowCompleted flag to end the process
 * - Performance Logging: Detailed execution metrics and timing analysis
 *
 * INPUT STATE:
 * - allAcceptableCandidates: Accumulated movie candidates from evaluation batches
 * - minimumAcceptableCandidates: Target number of recommendations (defaults to 5)
 * - searchAttemptNumber: Current iteration for logging context
 * - enhancedUserCriteria: User preferences (logged for context)
 *
 * OUTPUT STATE:
 * - finalRecommendations: Up to 5 movies ranked by confidence with basic diversity
 * - searchAttemptNumber: Preserved from input for state continuity
 * - workflowCompleted: Always set to true to terminate the workflow
 *
 * RANKING ALGORITHM:
 * 1. Primary Sort: Confidence score (descending)
 * 2. Diversity Filter: Basic genre and director deduplication
 * 3. Final Selection: Top 5 after diversity filtering
 *
 * DIVERSITY OPTIMIZATION:
 * - Genre Deduplication: Prioritizes movies with new genres in first 3 slots
 * - Director Variety: Avoids same director appearing multiple times
 * - Fallback: Fills remaining slots with highest confidence regardless of diversity
 *
 * EDGE CASE HANDLING:
 * - Empty Candidates: Returns empty array and terminates workflow gracefully
 * - Insufficient Candidates: Returns all available candidates
 * - Quality Metrics: Handles division by zero for average confidence calculation
 */
export async function batchControlAndRoutingNode(
  state: typeof VideoRecommendationAgentState.State,
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'batch_control_and_routing_node';
  const startTime = logNodeStart(nodeId, 'compile_final_recommendations', {
    candidatePoolSize: state.allAcceptableCandidates?.length || 0,
    searchAttempt: state.searchAttemptNumber,
    minimumRequired: state.minimumAcceptableCandidates || 5,
  });

  const allCandidates = state.allAcceptableCandidates || [];
  const minimumRequired = state.minimumAcceptableCandidates || 5;

  logger.info('� Starting final recommendation compilation', {
    nodeId,
    candidatePoolSize: allCandidates.length,
    minimumRequired,
    searchAttempt: state.searchAttemptNumber,
    userGenres: state.enhancedUserCriteria?.enhancedGenres,
    familyFriendly: state.enhancedUserCriteria?.familyFriendly,
  });

  // Validate we have candidates to work with
  if (allCandidates.length === 0) {
    logger.warn('⚠️ No acceptable candidates found - cannot compile recommendations', {
      nodeId,
      candidatePoolSize: 0,
      searchAttempts: state.searchAttemptNumber,
    });

    // Return empty recommendations but signal completion to prevent infinite loop
    return {
      finalRecommendations: [],
      searchAttemptNumber: state.searchAttemptNumber,
      workflowCompleted: true, // Signal that workflow should terminate
    };
  }

  // Sort candidates by confidence score (primary ranking factor)
  const sortedCandidates = [...allCandidates].sort(
    (a: MovieEvaluation, b: MovieEvaluation) => b.confidenceScore - a.confidenceScore,
  );

  // Apply diversity optimization to avoid genre clustering
  const diversifiedRecommendations = applyDiversityFilter(sortedCandidates);

  // Select top 5 recommendations (or all available if fewer)
  const finalRecommendations = diversifiedRecommendations.slice(0, 5);

  // Calculate quality metrics
  const averageConfidence =
    finalRecommendations.reduce((sum, r) => sum + r.confidenceScore, 0) /
    finalRecommendations.length;
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
    diversityOptimized: true,
  });

  logNodeExecution(nodeId, 'compile_final_recommendations', startTime, {
    candidatesProcessed: allCandidates.length,
    finalRecommendationCount: finalRecommendations.length,
    averageConfidence: averageConfidence.toFixed(3),
    compilationSuccess: true,
    diversityApplied: true,
  });

  return {
    finalRecommendations,
    searchAttemptNumber: state.searchAttemptNumber,
    workflowCompleted: true,
  };
}

/**
 * Apply basic diversity filter to prevent genre and director clustering
 *
 * ALGORITHM:
 * 1. Prioritizes candidates with new genres for first 3 slots
 * 2. Tracks used genres and directors to avoid repetition
 * 3. Fills remaining slots with highest confidence candidates
 * 4. Ensures maximum of 5 total recommendations
 */
function applyDiversityFilter(sortedCandidates: MovieEvaluation[]): MovieEvaluation[] {
  const diversified: MovieEvaluation[] = [];
  const usedGenres = new Set<string>();
  const usedDirectors = new Set<string>();

  for (const candidate of sortedCandidates) {
    if (diversified.length >= 5) break;

    // Check for genre diversity (allow some overlap but prevent clustering)
    const candidateGenres = candidate.movie.genre;
    const hasNewGenre = candidateGenres.some((genre) => !usedGenres.has(genre));
    const directorUsed = usedDirectors.has(candidate.movie.director);

    // Prioritize candidates that add genre or director diversity
    if (diversified.length < 3 || hasNewGenre || !directorUsed) {
      diversified.push(candidate);
      candidateGenres.forEach((genre) => usedGenres.add(genre));
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

  recommendations.forEach((rec) => {
    rec.movie.genre.forEach((genre) => {
      distribution[genre] = (distribution[genre] || 0) + 1;
    });
  });

  return distribution;
}
