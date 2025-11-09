import { ChatBedrockConverse } from '@langchain/aws';
import { createAgent } from 'langchain';
import { z } from 'zod';

import logger from '../config/logger';
import type { Movie, UserCriteria, MovieEvaluation } from '../types';
import { logLlmRequest, logLlmResponse } from '../utils/logging';
import { globalTokenTracker } from '../utils/token-tracker';

import { tmdbEnrichmentService } from './tmdb-enrichment';
import { tmdbEnrichmentTool } from './tmdb-enrichment-tool';

/**
 * Movie Evaluation LLM Service - LangGraph Agent Integration
 *
 * This service uses a modern LangGraph agent to evaluate movies with the help of an LLM.
 * The agent can automatically use the TMDB enrichment tool if it needs more movie data.
 *
 * HOW IT WORKS:
 * - Uses LangChain's createAgent API (built on LangGraph) for agent setup
 * - The agent decides on its own when to call the TMDB enrichment tool
 * - LangGraph manages conversation state and tool execution
 * - Handles errors and retries automatically
 *
 * FEATURES:
 * - Modern agent pattern with LangChain v1
 * - Automatic TMDB data enrichment
 * - Evaluates movies on genre, theme, quality, and cultural relevance
 * - No manual tool orchestration needed
 */

// Zod schema for movie evaluation output validation
const MovieEvaluationSchema = z.object({
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Confidence score between 0 and 1 indicating how well the movie matches user preferences',
    ),
  matchReasoning: z
    .string()
    .describe("Detailed explanation of why this movie matches or doesn't match user preferences"),
  familyAppropriate: z
    .boolean()
    .describe(
      'Whether the movie is appropriate for family viewing based on content rating and themes',
    ),
  genreAlignment: z
    .number()
    .min(0)
    .max(1)
    .describe('How well movie genres align with user preferences'),
  themeMatching: z.number().min(0).max(1).describe('How well movie themes match user interests'),
  qualityIndicators: z
    .number()
    .min(0)
    .max(1)
    .describe('Overall movie quality based on rating, awards, and critical reception'),
  ageAppropriateScore: z
    .number()
    .min(0)
    .max(1)
    .describe("How appropriate the movie is for the user's age group"),
  culturalRelevance: z
    .number()
    .min(0)
    .max(1)
    .describe('Cultural relevance and current availability considerations'),
});

/**
 * Create Movie Evaluation Agent using modern LangGraph-based createAgent
 */
function createMovieEvaluationAgent(): ReturnType<typeof createAgent> {
  const modelId =
    process.env.EVALUATION_BEDROCK_MODEL_ID ||
    process.env.BEDROCK_MODEL_ID ||
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

  logger.debug('🧠 Initializing movie evaluation agent with LangGraph', {
    modelId,
    component: 'movie-evaluation-llm',
    toolsAvailable: ['tmdb_movie_enrichment'],
  });

  // Create the agent with model and tools - LangGraph handles the execution automatically
  return createAgent({
    model: new ChatBedrockConverse({
      model: modelId,
      region: process.env.AWS_REGION || 'us-east-1',
      temperature: 0.2,
    }),
    tools: [tmdbEnrichmentTool],
  });
}
/**
 * Evaluate a single movie against user criteria using LLM with automatic tool calling
 */
export async function evaluateMovie(
  movie: Movie,
  userCriteria: UserCriteria,
): Promise<MovieEvaluation> {
  // Extract model ID for consistent logging
  const modelId =
    process.env.EVALUATION_BEDROCK_MODEL_ID ||
    process.env.BEDROCK_MODEL_ID ||
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0';

  const agent = createMovieEvaluationAgent();
  const startTime = Date.now();

  const input = `Evaluate how well this movie matches the user's preferences:

USER PREFERENCES:
- Original Input: "${userCriteria.originalInput}"
- Preferred Genres: ${userCriteria.enhancedGenres.join(', ')}
- Genres to Avoid: ${userCriteria.excludeGenres.join(', ')}
- Age Group: ${userCriteria.ageGroup}
- Family Friendly Required: ${userCriteria.familyFriendly}
- Preferred Themes: ${userCriteria.preferredThemes.join(', ')}
- Themes to Avoid: ${userCriteria.avoidThemes.join(', ')}

MOVIE TO EVALUATE:
- Title: "${movie.title}" (${movie.year})
- Genres: ${movie.genre.join(', ')}
- Rating: ${movie.rating}/10
- Director: ${movie.director}
- Family Rating: ${movie.familyRating}
- Description: "${movie.description}"
- Themes: ${movie.themes.join(', ')}

EVALUATION CRITERIA:
Provide a comprehensive multi-dimensional analysis considering:

1. **Genre Alignment** (0.0-1.0): How well do the movie's genres match the user's preferred genres and avoid excluded ones?

2. **Theme Matching** (0.0-1.0): How well do the movie's themes align with user preferences and avoid unwanted themes?

3. **Age Appropriateness** (0.0-1.0): How suitable is this movie for the user's age group considering content rating and mature themes?

4. **Quality Indicators** (0.0-1.0): Consider the movie's IMDb rating, critical reception, awards, and overall reputation.

5. **Cultural Relevance** (0.0-1.0): Consider release year relevance, cultural impact, and current availability/popularity.

6. **Family Appropriateness**: Boolean assessment of whether content is suitable for family viewing.

CONFIDENCE SCORING:
- **High Confidence (0.8-1.0)**: Excellent match with strong alignment across multiple dimensions
- **Medium Confidence (0.4-0.79)**: Good match with some reservations or mixed alignment
- **Low Confidence (0.0-0.39)**: Poor match with significant misalignment

REASONING REQUIREMENTS:
- Provide specific examples from the movie that support your assessment
- Explain any trade-offs or considerations
- Be transparent about limitations in available information
- Consider both positive and negative aspects

Use the TMDB enrichment tool if you need additional information, then provide your evaluation as JSON.

Format your response as JSON with these exact fields:
{
  "confidenceScore": 0.85,
  "matchReasoning": "Detailed explanation with specific examples...",
  "familyAppropriate": true,
  "genreAlignment": 0.9,
  "themeMatching": 0.8,
  "qualityIndicators": 0.85,
  "ageAppropriateScore": 0.9,
  "culturalRelevance": 0.8
}

RESPOND ONLY WITH VALID JSON - NO OTHER TEXT OR EXPLANATIONS.`;

  try {
    logLlmRequest(modelId, input, input.length);

    // Let the agent automatically handle tool calls and iterations
    const response = await agent.invoke({
      messages: [{ role: 'user', content: input }],
    });

    const processingTime = Date.now() - startTime;

    // Extract response text - handle different response formats gracefully
    let responseText: string;

    // Try to get the last assistant message content
    if (response.messages && Array.isArray(response.messages) && response.messages.length > 0) {
      // Find the last assistant message
      const lastAssistantMessage = response.messages
        .slice()
        .reverse()
        .find((msg: any) => msg.role === 'assistant' || msg.type === 'ai');

      if (lastAssistantMessage?.content) {
        if (typeof lastAssistantMessage.content === 'string') {
          responseText = lastAssistantMessage.content;
        } else if (Array.isArray(lastAssistantMessage.content)) {
          // Extract text from content blocks
          responseText = lastAssistantMessage.content
            .filter((block: any) => block.type === 'text' || typeof block === 'string')
            .map((block: any) => block.text || block.toString())
            .join(' ');
        } else {
          responseText = JSON.stringify(lastAssistantMessage.content);
        }
      } else {
        responseText = JSON.stringify(response);
      }
    } else {
      // Fallback: try direct response content or stringify the whole response
      responseText = typeof response === 'string' ? response : JSON.stringify(response);
    }

    // Parse and validate the JSON response
    interface ParsedEvaluation {
      confidenceScore: number;
      matchReasoning: string;
      familyAppropriate: boolean;
      genreAlignment: number;
      themeMatching: number;
      qualityIndicators: number;
      ageAppropriateScore: number;
      culturalRelevance: number;
    }

    let parsedResponse: ParsedEvaluation;
    try {
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      parsedResponse = JSON.parse(cleanedResponse);
      MovieEvaluationSchema.parse(parsedResponse);
    } catch (parseError) {
      logger.error('❌ Failed to parse agent response', {
        component: 'movie-evaluation-llm',
        movieTitle: movie.title,
        responseText: responseText.substring(0, 200),
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
      });

      throw parseError;
    }

    logLlmResponse(
      modelId,
      `Movie evaluation completed for "${movie.title}"`,
      responseText.length,
      processingTime,
    );

    // Track token usage for this evaluation
    globalTokenTracker.addUsage(input.length, responseText.length, 'movie-evaluation');

    logger.debug('🎯 Agent movie evaluation completed', {
      component: 'movie-evaluation-llm',
      movieTitle: movie.title,
      confidenceScore: parsedResponse.confidenceScore.toFixed(2),
      processingTime: `${processingTime}ms`,
      usedAgent: true,
      messagesCount: response.messages?.length || 0,
      genreAlignment: parsedResponse.genreAlignment.toFixed(2),
      themeMatching: parsedResponse.themeMatching.toFixed(2),
      familyAppropriate: parsedResponse.familyAppropriate,
    }); // Create the final MovieEvaluation object
    const movieEvaluation: MovieEvaluation = {
      movie,
      confidenceScore: parsedResponse.confidenceScore,
      matchReasoning: parsedResponse.matchReasoning,
      familyAppropriate: parsedResponse.familyAppropriate,
    };

    return movieEvaluation;
  } catch (error) {
    logger.error('❌ Agent movie evaluation failed', {
      component: 'movie-evaluation-llm',
      movieTitle: movie.title,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
} /**

/**
 * Evaluate multiple movies against user criteria in parallel for efficiency
 */
export async function evaluateMoviesBatch(
  movies: Movie[],
  userCriteria: UserCriteria,
): Promise<MovieEvaluation[]> {
  // Reset TMDB API call counter for this batch
  tmdbEnrichmentService.resetApiCallCounter();

  // Detect test environment more reliably
  const isTestEnvironment =
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined ||
    typeof (global as any).testSetupLogged !== 'undefined';

  const testMovieLimit = parseInt(process.env.TEST_MOVIE_LIMIT || '3');
  const moviesToEvaluate = isTestEnvironment ? movies.slice(0, testMovieLimit) : movies;

  if (isTestEnvironment && movies.length > testMovieLimit) {
    console.log('🧪 Test mode: limiting movie evaluation', {
      component: 'movie-evaluation-llm',
      originalBatchSize: movies.length,
      limitedBatchSize: moviesToEvaluate.length,
      testMovieLimit,
      NODE_ENV: process.env.NODE_ENV,
      JEST_WORKER_ID: process.env.JEST_WORKER_ID,
    });
    logger.info('🧪 Test mode: limiting movie evaluation', {
      component: 'movie-evaluation-llm',
      originalBatchSize: movies.length,
      limitedBatchSize: moviesToEvaluate.length,
      testMovieLimit,
    });
  }

  const startTime = Date.now();
  logger.info('🎬 Starting parallel batch movie evaluation', {
    component: 'movie-evaluation-llm',
    batchSize: moviesToEvaluate.length,
    userGenres: userCriteria.enhancedGenres,
    familyFriendly: userCriteria.familyFriendly,
    isTestMode: isTestEnvironment,
    processingMode: 'parallel',
  });

  // Define types for cleaner result handling
  type EvaluationSuccess = {
    success: true;
    evaluation: MovieEvaluation;
    movie: Movie;
    index: number;
  };
  type EvaluationFailure = { success: false; error: any; movie: Movie; index: number };
  type EvaluationResult = EvaluationSuccess | EvaluationFailure;

  // Process all movies in parallel using Promise.allSettled for resilient error handling
  const evaluationPromises = moviesToEvaluate.map(
    async (movie, index): Promise<EvaluationResult> => {
      try {
        const evaluation = await evaluateMovie(movie, userCriteria);
        logger.debug('🎯 Movie evaluation completed', {
          component: 'movie-evaluation-llm',
          movieIndex: index,
          title: evaluation.movie.title,
          confidenceScore: evaluation.confidenceScore.toFixed(2),
          familyAppropriate: evaluation.familyAppropriate,
        });
        return { success: true, evaluation, movie, index };
      } catch (error) {
        logger.warn('⚠️ Movie evaluation failed', {
          component: 'movie-evaluation-llm',
          movieIndex: index,
          title: movie.title,
          error: error instanceof Error ? error.message : String(error),
        });
        return { success: false, error, movie, index };
      }
    },
  );

  // Wait for all evaluations to complete
  const results = await Promise.allSettled(evaluationPromises);

  // Extract successful evaluations and log failures
  const evaluatedMovies: MovieEvaluation[] = [];
  const failures: Array<{ movie: Movie; error: any; index: number }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        evaluatedMovies.push(result.value.evaluation);
      } else {
        failures.push({
          movie: result.value.movie,
          error: result.value.error,
          index: result.value.index,
        });
      }
    } else if (result.status === 'rejected') {
      failures.push({
        movie: moviesToEvaluate[index],
        error: result.reason,
        index,
      });
    }
  });

  const processingTime = Date.now() - startTime;
  const successCount = evaluatedMovies.length;
  const failureCount = failures.length;
  const averageConfidence =
    successCount > 0
      ? evaluatedMovies.reduce((sum, e) => sum + e.confidenceScore, 0) / successCount
      : 0;
  const highConfidenceCount = evaluatedMovies.filter((e) => e.confidenceScore >= 0.8).length;

  logger.info('📊 Parallel batch movie evaluation completed', {
    component: 'movie-evaluation-llm',
    processingTime: `${processingTime}ms`,
    totalAttempted: moviesToEvaluate.length,
    successfulEvaluations: successCount,
    failedEvaluations: failureCount,
    successRate: `${((successCount / moviesToEvaluate.length) * 100).toFixed(1)}%`,
    averageConfidence: averageConfidence.toFixed(2),
    highConfidenceCount: highConfidenceCount,
    processingMode: 'parallel',
    isTestMode: isTestEnvironment,
    originalBatchSize: movies.length,
  });

  // Log failure summary if there were any failures
  if (failures.length > 0) {
    logger.warn('🚫 Evaluation failures summary', {
      component: 'movie-evaluation-llm',
      failureCount: failures.length,
      failedTitles: failures.map((f) => f.movie.title).slice(0, 5), // Show first 5 failed titles
      totalFailed: failures.length,
    });
  }

  return evaluatedMovies;
}
