import { ChatBedrockConverse } from '@langchain/aws';
import { z } from 'zod';
import logger from '../config/logger';
import { logLlmRequest, logLlmResponse } from '../utils/logging';
import type { UserCriteria } from '../types';

/**
 * LLM Service - Centralized AWS Bedrock Integration
 * 
 * Provides a unified interface for interacting with AWS Bedrock Claude models
 * across all agent nodes. Handles authentication, model configuration, structured
 * output parsing, and comprehensive logging.
 */

// Zod schemas for structured outputs
export const UserCriteriaSchema = z.object({
  originalInput: z.string(),
  enhancedGenres: z.array(z.string()).describe("Enhanced genres based on user preferences, expanded with related genres"),
  excludeGenres: z.array(z.string()).describe("Genres to exclude based on stated dislikes or preferences"),
  ageGroup: z.string().describe("Inferred age group: Child, Teen, Adult, Senior"),
  familyFriendly: z.boolean().describe("Whether content should be family-appropriate"),
  preferredThemes: z.array(z.string()).describe("Abstract themes the user would likely enjoy"),
  avoidThemes: z.array(z.string()).describe("Themes or elements to avoid"),
  searchTerms: z.array(z.string()).describe("Optimized search terms for movie discovery")
});

export type UserCriteriaOutput = z.infer<typeof UserCriteriaSchema>;

/**
 * Initialize Bedrock client with environment configuration
 */
function createBedrockClient(): ChatBedrockConverse {
  const modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-haiku-20240307-v1:0';
  const region = process.env.AWS_REGION || 'us-east-1';

  logger.debug('🧠 Initializing Bedrock client', {
    modelId,
    region,
    component: 'llm-service'
  });

  return new ChatBedrockConverse({
    model: modelId,
    region: region,
    temperature: 0.1, // Low temperature for consistent, structured outputs
  });
}

/**
 * Enhanced User Criteria Analysis
 * 
 * Analyzes natural language user input and transforms it into structured
 * search criteria with intelligent genre expansion and preference inference.
 */
export async function analyzeUserPreferences(userInput: string): Promise<UserCriteria> {
  const client = createBedrockClient();
  const startTime = Date.now();
  
  const prompt = `You are an expert movie recommendation analyst. Analyze the user's request and extract structured preferences.

User Request: "${userInput}"

Please analyze this request and provide structured movie preferences. Consider:

1. **Genre Analysis**: What primary genres does the user want? What related/similar genres might they enjoy?
2. **Exclusions**: What genres or styles should be avoided based on their preferences?
3. **Demographics**: Infer age group and viewing context from the request
4. **Family Context**: Is this for family viewing, adult-only, or flexible?
5. **Thematic Preferences**: What abstract themes, moods, or storytelling styles would appeal?
6. **Avoidance Patterns**: What themes or elements should be avoided?
7. **Search Optimization**: Generate specific search terms for effective movie discovery

Be intelligent about genre expansion (e.g., "sci-fi" → include "Science Fiction", "Thriller", "Drama" for cerebral sci-fi).
Infer context clues about viewing preferences, age appropriateness, and quality expectations.

Format your response as JSON with these exact fields:
{
  "originalInput": "exact user input",
  "enhancedGenres": ["primary genres and related ones"],
  "excludeGenres": ["genres to avoid"],
  "ageGroup": "Child|Teen|Adult|Senior",
  "familyFriendly": true/false,
  "preferredThemes": ["themes user would enjoy"],
  "avoidThemes": ["themes to avoid"],
  "searchTerms": ["optimized search keywords"]
}

RESPOND ONLY WITH VALID JSON - NO OTHER TEXT.`;

  try {
    logLlmRequest('claude-3-haiku', prompt, prompt.length);
    
    // Use type assertion to work around TypeScript definition issues
    const response = await (client as any).invoke([
      { role: 'user', content: prompt }
    ]);

    const responseText = response.content.toString();
    const processingTime = Date.now() - startTime;
    
    // Try to parse the JSON response
    let parsedResponse: UserCriteria;
    try {
      parsedResponse = JSON.parse(responseText);
      // Validate with Zod schema
      UserCriteriaSchema.parse(parsedResponse);
    } catch (parseError) {
      logger.error('❌ Failed to parse LLM response as JSON', {
        component: 'llm-service',
        responseText: responseText.substring(0, 200),
        parseError: parseError instanceof Error ? parseError.message : String(parseError)
      });
      throw new Error('LLM returned invalid JSON response');
    }

    logLlmResponse('claude-3-haiku', `User criteria analysis completed`, responseText.length, processingTime);

    logger.debug('🎯 LLM analysis completed', {
      component: 'llm-service',
      operation: 'analyze_user_preferences',
      processingTime: `${processingTime}ms`,
      enhancedGenres: parsedResponse.enhancedGenres.length,
      excludedGenres: parsedResponse.excludeGenres.length,
      familyFriendly: parsedResponse.familyFriendly
    });

    return parsedResponse;

  } catch (error) {
    logger.error('❌ LLM request failed', {
      component: 'llm-service',
      operation: 'analyze_user_preferences',
      error: error instanceof Error ? error.message : String(error),
      userInput: userInput.substring(0, 100) + '...'
    });
    throw error;
  }
}

/**
 * Test LLM connectivity and configuration
 */
export async function testLlmConnection(): Promise<boolean> {
  try {
    const client = createBedrockClient();
    const testResponse = await (client as any).invoke([
      { role: 'user', content: 'Respond with just "OK" if you can understand this message.' }
    ]);
    
    logger.info('✅ LLM connection test successful', {
      component: 'llm-service',
      response: testResponse.content.toString().substring(0, 50)
    });
    
    return true;
  } catch (error) {
    logger.error('❌ LLM connection test failed', {
      component: 'llm-service',
      error: error instanceof Error ? error.message : String(error)
    });
    
    return false;
  }
}