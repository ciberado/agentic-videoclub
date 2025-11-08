import logger from '../config/logger';
import { analyzeUserPreferences } from '../services/prompt-enhancement-llm';
import type { VideoRecommendationAgentState } from '../state/definition';
import type { UserCriteria } from '../types';
import { logNodeStart, logNodeExecution } from '../utils/logging';

/**
 * Prompt Enhancement Node - Natural Language Processing & Context Enrichment
 *
 * Transforms vague user requests into structured, actionable search criteria through intelligent
 * natural language analysis. This node serves as the "intelligence gateway" that interprets
 * user intent and enriches it with contextual metadata for downstream processing.
 *
 * CURRENT IMPLEMENTATION:
 * - Integration: AWS Bedrock via @langchain/aws ChatBedrockConverse
 * - Output: Structured JSON using Zod schema validation for UserCriteria type
 * - Token Tracking: Integrated with globalTokenTracker for resource monitoring
 * - Prompt Strategy: Single comprehensive prompt with JSON mode for reliable parsing
 *
 * INPUT ANALYSIS:
 * - Demographic inference (age, preferences, family context)
 * - Genre preference extraction and intelligent mapping to broader categories
 * - Context detection (family viewing requirements, content restrictions)
 * - Theme preference identification (intelligent plots, action-packed, etc.)
 * - Avoidance patterns (cheesy stories, predictable plots, specific genres)
 *
 * OUTPUT ENHANCEMENT:
 * - Enhanced genres: Expanded from user input with similar/related genres
 * - Excluded genres: Intelligently inferred dislikes (Romance Comedy, Melodrama, etc.)
 * - Age appropriateness: Family-friendly flag and content rating preferences
 * - Thematic preferences: Abstract themes user might enjoy (intelligent, thought-provoking)
 * - Search optimization: Targeted search terms for better Prime Video discovery
 *
 * TOKEN CONSUMPTION:
 * Tracks input/output tokens for cost analysis and performance optimization.
 * Typical usage: ~500-800 tokens per enhancement operation.
 *
 * STATE INTEGRATION:
 * Updates enhancedUserCriteria in workflow state for use by downstream nodes.
 * Maintains comprehensive logging for debugging and performance analysis.
 */
export async function promptEnhancementNode(
  state: typeof VideoRecommendationAgentState.State,
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'prompt_enhancement_node';
  const startTime = logNodeStart(nodeId, 'enhance_user_input', { userInput: state.userInput });
  try {
    logger.info('🎯 Starting prompt enhancement analysis', {
      nodeId,
      originalInput: state.userInput,
      inputLength: state.userInput.length,
    });

    // Use specialized LLM analysis of user input
    const enhancedCriteria: UserCriteria = await analyzeUserPreferences(state.userInput);

    logger.info('✨ Prompt enhancement completed successfully', {
      nodeId,
      enhancedGenresCount: enhancedCriteria.enhancedGenres.length,
      excludedGenresCount: enhancedCriteria.excludeGenres.length,
      familyFriendly: enhancedCriteria.familyFriendly,
      searchTermsGenerated: enhancedCriteria.searchTerms.length,
    });

    logNodeExecution(nodeId, 'enhance_user_input', startTime, {
      enhancedGenres: enhancedCriteria.enhancedGenres,
      excludeGenres: enhancedCriteria.excludeGenres,
      familyContext: enhancedCriteria.familyFriendly,
      themePreferences: enhancedCriteria.preferredThemes.length,
    });

    return {
      enhancedUserCriteria: enhancedCriteria,
    };
  } catch (error) {
    logger.error('❌ Prompt enhancement LLM failed.', {
      nodeId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
