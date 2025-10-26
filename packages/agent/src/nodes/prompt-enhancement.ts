import logger from '../config/logger';
import { 
  logNodeStart, 
  logNodeExecution, 
  logLlmRequest,
  logLlmResponse
} from '../utils/logging';
import { simulateDelay } from '../data/generators';
import type { UserCriteria } from '../types';
import type { VideoRecommendationAgentState } from '../state/definition';

/**
 * Prompt Enhancement Node - Natural Language Processing & Context Enrichment
 * 
 * PURPOSE:
 * Transforms vague user requests into structured, actionable search criteria through intelligent
 * natural language analysis. This node serves as the "intelligence gateway" that interprets
 * user intent and enriches it with contextual metadata for downstream processing.
 * 
 * - Model: Claude 3 Haiku (fast, cost-effective for text analysis)
 * - Integration: AWS Bedrock via @langchain/aws ChatBedrockConverse
 * - Output: Structured JSON using Zod schema validation for UserCriteria type
 * - Prompt Strategy: Single comprehensive prompt with JSON mode for reliable parsing
 * 
 * INPUT ANALYSIS:
 * - Demographic inference (age, preferences)
 * - Genre preference extraction and mapping
 * - Context detection (family viewing, content restrictions)
 * - Theme preference identification
 * 
 * OUTPUT ENHANCEMENT:
 * - Enhanced genres: Expanded from user input with similar/related genres
 * - Excluded genres: Intelligently inferred dislikes
 * - Age appropriateness: Family-friendly flag and content rating preferences
 * - Thematic preferences: Abstract themes user might enjoy
 * - Search optimization: Targeted search terms for better discovery results
 * 
 * EDUCATIONAL VALUE:
 * Demonstrates how AI agents can transform natural language into structured data,
 * showing the bridge between human communication and machine-processable criteria.
 */
export async function promptEnhancementNode(
  state: typeof VideoRecommendationAgentState.State
): Promise<Partial<typeof VideoRecommendationAgentState.State>> {
  const nodeId = 'prompt_enhancement_node';
  const startTime = logNodeStart(nodeId, 'enhance_user_input', { userInput: state.userInput });
  
  logger.info('🎯 Starting prompt enhancement analysis', { 
    nodeId,
    originalInput: state.userInput,
    inputLength: state.userInput.length 
  });

  // Simulate LLM analysis of user input
  logLlmRequest('claude-3-haiku', `Analyze user preferences: "${state.userInput}"`, 450);
  await simulateDelay(150); // Simulate LLM processing time
  
  // Generate fake enhanced criteria based on the input
  const enhancedCriteria: UserCriteria = {
    originalInput: state.userInput,
    enhancedGenres: ["Science Fiction", "Drama", "Thriller"],
    excludeGenres: ["Romance", "Comedy", "Musical", "Horror"],
    ageGroup: "Adult",
    familyFriendly: state.userInput.toLowerCase().includes('family'),
    preferredThemes: ["Hard sci-fi", "Philosophical", "Future dystopia", "Space exploration"],
    avoidThemes: ["Cheesy dialogue", "Romantic subplots", "Slapstick humor", "Overly dramatic"],
    searchTerms: ["science fiction", "intelligent sci-fi", "adult sci-fi", "serious sci-fi"]
  };
  
  logLlmResponse('claude-3-haiku', 'Enhanced user criteria with genre mapping and theme analysis', 280, 150);
  
  logger.info('✨ Prompt enhancement completed successfully', {
    nodeId,
    enhancedGenresCount: enhancedCriteria.enhancedGenres.length,
    excludedGenresCount: enhancedCriteria.excludeGenres.length,
    familyFriendly: enhancedCriteria.familyFriendly,
    searchTermsGenerated: enhancedCriteria.searchTerms.length
  });

  logNodeExecution(nodeId, 'enhance_user_input', startTime, {
    enhancedGenres: enhancedCriteria.enhancedGenres,
    excludeGenres: enhancedCriteria.excludeGenres,
    familyContext: enhancedCriteria.familyFriendly,
    themePreferences: enhancedCriteria.preferredThemes.length
  });

  return {
    enhancedUserCriteria: enhancedCriteria
  };
}