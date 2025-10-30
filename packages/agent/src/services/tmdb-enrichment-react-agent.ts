import { ChatBedrockConverse } from '@langchain/aws';
import { createAgent } from 'langchain';

import logger from '../config/logger';
import type { Movie, UserCriteria } from '../types';
import { logLlmRequest, logLlmResponse } from '../utils/logging';
import { globalTokenTracker } from '../utils/token-tracker';

import { tmdbEnrichmentTool } from './tmdb-enrichment-tool';

/**
 * TMDB Enrichment React Agent
 *
 * This service creates a React agent subgraph that can automatically decide
 * when to use the TMDB enrichment tool and how to process the results.
 * This replaces the manual tool invocation approach with an intelligent
 * ReAct (Reasoning + Acting) pattern.
 */

/**
 * Create a React agent configured for TMDB movie enrichment
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTMDBEnrichmentAgent(): any {
  const modelId =
    process.env.EVALUATION_BEDROCK_MODEL_ID ||
    process.env.BEDROCK_MODEL_ID ||
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
  const region = process.env.AWS_REGION || 'us-east-1';

  logger.debug('🧠 Initializing TMDB enrichment React agent', {
    modelId,
    region,
    component: 'tmdb-enrichment-react-agent',
    toolsAvailable: ['tmdb_movie_enrichment'],
  });

  const llm = new ChatBedrockConverse({
    model: modelId,
    region: region,
    temperature: 0.2, // Low temperature for consistent reasoning
  });

  // Create React agent with TMDB enrichment tool
  const agent = createAgent({
    model: llm,
    tools: [tmdbEnrichmentTool],
    systemPrompt: `You are a movie data enrichment specialist. Your job is to analyze movie information and determine if additional data from The Movie Database (TMDB) would be helpful for evaluation.

Guidelines for when to use the TMDB enrichment tool:
1. Use if movie description is missing or very short (< 50 characters)
2. Use if you need more detailed plot information for evaluation
3. Use if genre classifications seem incomplete or unclear
4. Use if you need to verify content appropriateness for family viewing
5. Use if overall confidence in evaluation would be low due to insufficient data

When you determine enrichment is needed, use the tmdb_movie_enrichment tool with the movie title and year.
After getting enrichment data (or if no enrichment is needed), provide a comprehensive summary of all available movie information that can be used for evaluation.

Your final response should be a clear, structured summary of the movie's key attributes relevant for matching against user preferences.`,
  });

  return agent;
}

/**
 * Use React agent to enrich movie data for evaluation
 */
export async function enrichMovieWithReactAgent(
  movie: Movie,
  userCriteria: UserCriteria,
): Promise<string> {
  try {
    logger.info('🎬 Starting movie enrichment with React agent', {
      component: 'tmdb-enrichment-react-agent',
      movieTitle: movie.title,
      movieYear: movie.year,
    });

    const agent = createTMDBEnrichmentAgent();

    // Create a comprehensive prompt for the agent
    const enrichmentPrompt = `Analyze this movie and determine if additional TMDB data would help with evaluation:

Movie Information:
- Title: ${movie.title}
- Year: ${movie.year || 'Unknown'}
- Description: ${movie.description || 'No description available'}
- Genre: ${movie.genre?.join(', ') || 'Unknown'}
- Rating: ${movie.rating || 'Unknown'}
- Director: ${movie.director || 'Unknown'}
- Family Rating: ${movie.familyRating || 'Unknown'}
- Themes: ${movie.themes?.join(', ') || 'Unknown'}

User Preferences (for context):
- Preferred genres: ${userCriteria.enhancedGenres?.join(', ') || 'Not specified'}
- Age group: ${userCriteria.ageGroup || 'Not specified'}
- Family-friendly required: ${userCriteria.familyFriendly ? 'Yes' : 'No'}
- Preferred themes: ${userCriteria.preferredThemes?.join(', ') || 'Not specified'}
- Themes to avoid: ${userCriteria.avoidThemes?.join(', ') || 'Not specified'}

Based on this information, decide if TMDB enrichment would be beneficial and act accordingly. Provide a comprehensive summary of all available movie data for evaluation.`;

    const requestStartTime = Date.now();

    logLlmRequest(
      'claude-3.5-sonnet-react-agent',
      enrichmentPrompt,
      Math.ceil(enrichmentPrompt.length / 4),
    );

    // Invoke the React agent
    const result = await agent.invoke({
      messages: [{ role: 'user', content: enrichmentPrompt }],
    });

    const responseTime = Date.now() - requestStartTime;

    // Extract the final message content
    const rawContent = result.messages[result.messages.length - 1]?.content || '';
    const enrichedContent =
      typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

    logLlmResponse(
      'claude-3.5-sonnet-react-agent',
      enrichedContent,
      Math.ceil(enrichedContent.length / 4),
      responseTime,
    );

    // Track token usage (estimated)
    const inputTokens = Math.ceil(enrichmentPrompt.length / 4);
    const outputTokens = Math.ceil(enrichedContent.length / 4);
    globalTokenTracker.addUsage(inputTokens, outputTokens, 'tmdb-enrichment-react-agent');

    logger.info('✅ Movie enrichment with React agent completed', {
      component: 'tmdb-enrichment-react-agent',
      movieTitle: movie.title,
      responseTime,
      messageCount: result.messages.length,
      enrichedContentLength: enrichedContent.length,
    });

    return enrichedContent;
  } catch (error) {
    logger.error('❌ Movie enrichment with React agent failed', {
      component: 'tmdb-enrichment-react-agent',
      movieTitle: movie.title,
      error: error instanceof Error ? error.message : String(error),
    });

    // Return basic movie information on error
    return `Movie: ${movie.title} (${movie.year || 'Unknown year'})
Description: ${movie.description || 'No description available'}
Genres: ${movie.genre?.join(', ') || 'Unknown'}
Rating: ${movie.rating || 'Unknown'}
Director: ${movie.director || 'Unknown'}
Family Rating: ${movie.familyRating || 'Unknown'}
Themes: ${movie.themes?.join(', ') || 'Unknown'}

Note: TMDB enrichment failed, using basic movie information only.`;
  }
}

/**
 * React Agent Node for LangGraph workflows
 *
 * This function can be used as a node in a LangGraph workflow.
 * It takes movie information and user criteria, and returns enriched
 * movie data using the React agent pattern.
 */
export async function tmdbEnrichmentReactAgentNode(
  state: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages?: any[];
    movie?: Movie;
    userCriteria?: UserCriteria;
    enrichedMovieData?: string;
  },
  _config?: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ messages?: any[]; enrichedMovieData?: string }> {
  const { movie, userCriteria } = state;

  if (!movie) {
    logger.warn('⚠️ No movie provided to TMDB enrichment React agent node', {
      component: 'tmdb-enrichment-react-agent',
    });
    return { messages: state.messages, enrichedMovieData: '' };
  }

  try {
    // Use React agent to enrich movie data
    const enrichedData = await enrichMovieWithReactAgent(
      movie,
      userCriteria || {
        originalInput: '',
        enhancedGenres: [],
        excludeGenres: [],
        ageGroup: 'All',
        familyFriendly: false,
        preferredThemes: [],
        avoidThemes: [],
        searchTerms: [],
      },
    );

    return {
      messages: state.messages,
      enrichedMovieData: enrichedData,
    };
  } catch (error) {
    logger.error('❌ TMDB enrichment React agent node failed', {
      component: 'tmdb-enrichment-react-agent',
      movieTitle: movie?.title,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      messages: state.messages,
      enrichedMovieData: '',
    };
  }
}

/**
 * Export the agent creation function for direct use if needed
 */
export { createTMDBEnrichmentAgent };
