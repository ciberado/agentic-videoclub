import { ChatBedrockConverse } from '@langchain/aws';
import { z } from 'zod';
import logger from '../config/logger';
import { logLlmRequest, logLlmResponse } from '../utils/logging';
import type { UserCriteria } from '../types';

/**
 * Prompt Enhancement LLM Service
 * 
 * Specialized LLM integration for analyzing user input and transforming it into
 * structured movie search criteria. Uses Claude 3 Haiku for fast, cost-effective
 * natural language processing with structured JSON output.
 */

// Zod schema for prompt enhancement output validation
const UserCriteriaSchema = z.object({
  originalInput: z.string(),
  enhancedGenres: z.array(z.string()).describe("Enhanced genres based on user preferences, expanded with related genres"),
  excludeGenres: z.array(z.string()).describe("Genres to exclude based on stated dislikes or preferences"),
  ageGroup: z.string().describe("Inferred age group: Child, Teen, Adult, Senior"),
  familyFriendly: z.boolean().describe("Whether content should be family-appropriate"),
  preferredThemes: z.array(z.string()).describe("Abstract themes the user would likely enjoy"),
  avoidThemes: z.array(z.string()).describe("Themes or elements to avoid"),
  searchTerms: z.array(z.string()).describe("Optimized search terms for movie discovery")
});

/**
 * Create Bedrock client configured for prompt enhancement
 */
function createPromptEnhancementClient(): ChatBedrockConverse {
  const modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-haiku-20240307-v1:0';
  const region = process.env.AWS_REGION || 'us-east-1';

  logger.debug('🧠 Initializing prompt enhancement Bedrock client', {
    modelId,
    region,
    component: 'prompt-enhancement-llm'
  });

  return new ChatBedrockConverse({
    model: modelId,
    region: region,
    temperature: 0.1, // Low temperature for consistent, structured outputs
  });
}

/**
 * Analyze user input and extract structured movie preferences
 * 
 * Takes natural language user requests and transforms them into structured
 * search criteria with intelligent genre expansion, preference inference,
 * and family-friendly context detection.
 */
export async function analyzeUserPreferences(userInput: string): Promise<UserCriteria> {
  const client = createPromptEnhancementClient();
  const startTime = Date.now();
  
  const prompt = `You are an expert movie recommendation analyst. Analyze the user's request and extract structured preferences for finding movies.

User Request: "${userInput}"

Please analyze this request and provide structured movie preferences. Consider:

1. **Genre Analysis**: What primary genres does the user want? What related/similar genres might they enjoy?
   - Example: "sci-fi" → include "Science Fiction", "Thriller", "Drama" for cerebral sci-fi
   - Example: "action" → include "Action", "Adventure", "Thriller" 
   - Example: "comedy" → include "Comedy", "Romantic Comedy", "Family"

2. **Exclusions**: What genres or styles should be avoided based on their preferences?
   - If they hate "cheesy stories" → exclude "Romance Comedy", "Melodrama"  
   - If they want "serious" movies → exclude "Slapstick Comedy", "Parody"

3. **Demographics**: Infer age group and viewing context from the request
   - Age mentions, maturity level, sophistication of preferences
   - "Adult", "Teen", "Child", or "Senior"

4. **Family Context**: Is this for family viewing, adult-only, or flexible?
   - Look for keywords: "family", "kids", "children", "watch with", etc.
   - Consider content rating preferences

5. **Thematic Preferences**: What abstract themes, moods, or storytelling styles would appeal?
   - "Intelligent plots", "Thought-provoking", "Action-packed", "Emotional", etc.

6. **Avoidance Patterns**: What themes or elements should be avoided?
   - Based on stated dislikes: "cheesy" → "Predictable plots", "Clichéd storylines"

7. **Search Optimization**: Generate specific search terms for effective movie discovery
   - Combine preferences with modifiers: "family-friendly sci-fi", "intelligent action"

Be intelligent about context and inference. A 49-year-old wanting family movies suggests PG/PG-13 content, not adult-only films.

Format your response as JSON with these exact fields:
{
  "originalInput": "exact user input",
  "enhancedGenres": ["primary genres and intelligent expansions"],
  "excludeGenres": ["genres to avoid based on preferences"], 
  "ageGroup": "Child|Teen|Adult|Senior",
  "familyFriendly": true/false,
  "preferredThemes": ["themes user would enjoy"],
  "avoidThemes": ["themes to avoid"],
  "searchTerms": ["optimized search keywords"]
}

RESPOND ONLY WITH VALID JSON - NO OTHER TEXT OR EXPLANATIONS.`;

  try {
    logLlmRequest('claude-3-haiku', prompt, prompt.length);
    
    const response = await (client as any).invoke([
      { role: 'user', content: prompt }
    ]);

    const responseText = response.content.toString();
    const processingTime = Date.now() - startTime;
    
    // Parse and validate the JSON response
    let parsedResponse: UserCriteria;
    try {
      parsedResponse = JSON.parse(responseText);
      // Validate with Zod schema
      UserCriteriaSchema.parse(parsedResponse);
    } catch (parseError) {
      logger.error('❌ Failed to parse prompt enhancement LLM response', {
        component: 'prompt-enhancement-llm',
        responseText: responseText.substring(0, 200),
        parseError: parseError instanceof Error ? parseError.message : String(parseError)
      });
      throw new Error(`Prompt enhancement LLM returned invalid JSON: ${parseError}`);
    }

    logLlmResponse('claude-3-haiku', `Prompt enhancement analysis completed`, responseText.length, processingTime);

    logger.debug('🎯 Prompt enhancement LLM analysis completed', {
      component: 'prompt-enhancement-llm',
      operation: 'analyze_user_preferences',
      processingTime: `${processingTime}ms`,
      enhancedGenres: parsedResponse.enhancedGenres.length,
      excludedGenres: parsedResponse.excludeGenres.length,
      familyFriendly: parsedResponse.familyFriendly,
      ageGroup: parsedResponse.ageGroup
    });

    return parsedResponse;

  } catch (error) {
    logger.error('❌ Prompt enhancement LLM request failed', {
      component: 'prompt-enhancement-llm',
      operation: 'analyze_user_preferences',
      error: error instanceof Error ? error.message : String(error),
      userInput: userInput.substring(0, 100) + '...'
    });
    throw error;
  }
}