import { z } from 'zod';

import logger from '../config/logger';
import type { Movie, UserCriteria, MovieEvaluation } from '../types';
import { logLlmRequest, logLlmResponse } from '../utils/logging';
import { globalTokenTracker } from '../utils/token-tracker';

import { tmdbEnrichmentService } from './tmdb-enrichment';
import { enrichMovieWithReactAgent } from './tmdb-enrichment-react-agent';

/**
 * Movie Evaluation LLM Service - React Agent Integration Example
 *
 * This demonstrates how to integrate the React agent for TMDB enrichment
 * instead of manual tool invocation. The React agent automatically handles
 * the decision-making process for when to use TMDB enrichment.
 */

/**
 * Extract poster URL from TMDB enrichment response
 */
function extractPosterUrlFromEnrichment(enrichmentText: string): string | null {
  try {
    // Look for TMDB tool response in the enrichment text
    const tmdbResponseMatch = enrichmentText.match(/\{[^}]*"posterUrl"\s*:\s*"([^"]+)"[^}]*\}/);
    if (tmdbResponseMatch && tmdbResponseMatch[1]) {
      return tmdbResponseMatch[1];
    }

    // Alternative pattern for successful TMDB responses
    const successResponseMatch = enrichmentText.match(
      /"success":\s*true[^}]*"posterUrl":\s*"([^"]+)"/,
    );
    if (successResponseMatch && successResponseMatch[1]) {
      return successResponseMatch[1];
    }

    return null;
  } catch (error) {
    logger.debug('Failed to extract poster URL from enrichment text', {
      component: 'movie-evaluation-react-integration',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

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
 * Evaluate a single movie using React agent for intelligent TMDB enrichment
 */
export async function evaluateMovieWithReactAgentIntegration(
  movie: Movie,
  userCriteria: UserCriteria,
): Promise<MovieEvaluation> {
  const isTestEnvironment =
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (global as any).testSetupLogged !== 'undefined';

  if (isTestEnvironment) {
    logger.debug('🧪 Using fallback evaluation in test environment', {
      component: 'movie-evaluation-react-integration',
      movieTitle: movie.title,
    });
    return createFallbackEvaluation(movie, userCriteria);
  }

  const startTime = Date.now();

  try {
    logger.info('🎬 Starting movie evaluation with React agent integration', {
      component: 'movie-evaluation-react-integration',
      movieTitle: movie.title,
      movieYear: movie.year,
    });

    // Step 1: Use React agent to intelligently enrich movie data
    const enrichedMovieData = await enrichMovieWithReactAgent(movie, userCriteria);

    // Step 1.5: Directly get poster URL from TMDB enrichment service if not already present
    if (!movie.posterUrl) {
      try {
        const tmdbData = await tmdbEnrichmentService.enrichMovieData(movie);
        if (tmdbData?.posterUrl) {
          movie.posterUrl = tmdbData.posterUrl;
          logger.debug('📸 Poster URL obtained from TMDB enrichment service', {
            component: 'movie-evaluation-react-integration',
            movieTitle: movie.title,
            posterUrl: tmdbData.posterUrl,
          });
        }
      } catch (error) {
        logger.debug('⚠️ Failed to get poster URL from TMDB service', {
          component: 'movie-evaluation-react-integration',
          movieTitle: movie.title,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Legacy: Extract poster URL from enrichment data text (fallback)
    const extractedPosterUrl = extractPosterUrlFromEnrichment(enrichedMovieData);
    if (extractedPosterUrl && !movie.posterUrl) {
      movie.posterUrl = extractedPosterUrl;
      logger.debug('📸 Poster URL extracted from TMDB enrichment text', {
        component: 'movie-evaluation-react-integration',
        movieTitle: movie.title,
        posterUrl: extractedPosterUrl,
      });
    }

    logger.info('✅ React agent enrichment completed', {
      component: 'movie-evaluation-react-integration',
      movieTitle: movie.title,
      enrichedDataLength: enrichedMovieData.length,
      hasPosterUrl: !!movie.posterUrl,
    });

    // Step 2: Evaluate the movie using the enriched information
    const evaluationPrompt = `You are a movie recommendation specialist. Based on the following enriched movie information, evaluate how well this movie matches the user's preferences.

ENRICHED MOVIE DATA:
${enrichedMovieData}

USER CRITERIA:
- Enhanced genres: ${userCriteria.enhancedGenres.join(', ')}
- Excluded genres: ${userCriteria.excludeGenres.join(', ')}
- Age group: ${userCriteria.ageGroup}
- Family-friendly required: ${userCriteria.familyFriendly}
- Preferred themes: ${userCriteria.preferredThemes.join(', ')}
- Avoid themes: ${userCriteria.avoidThemes.join(', ')}

EVALUATION CRITERIA:
1. Genre Alignment (0-1): How well do the movie's genres match the user's preferences?
2. Theme Matching (0-1): How well do the movie's themes align with user interests?
3. Age Appropriateness (0-1): Is the movie suitable for the specified age group?
4. Family Appropriateness: Is the movie suitable for family viewing if required?
5. Quality Indicators (0-1): Overall movie quality based on ratings and reviews
6. Cultural Relevance (0-1): Current availability and cultural relevance

IMPORTANT SCORING GUIDELINES:
- If the movie has excluded genres, the confidenceScore should be very low (0.0-0.2)
- If the movie doesn't match the preferred genres, the confidenceScore should reflect this (max 0.4)
- If family-friendly is required but the movie isn't appropriate, confidenceScore should be very low (max 0.2)
- The confidenceScore should be calculated as: (genreAlignment * 0.4) + (themeMatching * 0.25) + (ageAppropriateScore * 0.2) + (qualityIndicators * 0.1) + (culturalRelevance * 0.05)
- If your reasoning indicates the movie is NOT a good match, ensure the confidenceScore is below 0.4

Provide your evaluation as a JSON object with this exact structure:
{
  "confidenceScore": number between 0 and 1,
  "matchReasoning": "detailed explanation of the match quality",
  "familyAppropriate": boolean,
  "genreAlignment": number between 0 and 1,
  "themeMatching": number between 0 and 1,
  "qualityIndicators": number between 0 and 1,
  "ageAppropriateScore": number between 0 and 1,
  "culturalRelevance": number between 0 and 1
}

Important: Respond ONLY with the JSON object, no additional text.`;

    // For this example, we'll use the same React agent for final evaluation
    // In practice, you might use a separate LLM call or integrate this into the agent
    const { createTMDBEnrichmentAgent } = await import('./tmdb-enrichment-react-agent.js');
    const agent = createTMDBEnrichmentAgent();

    const evaluationResult = await agent.invoke({
      messages: [{ role: 'user', content: evaluationPrompt }],
    });

    const evaluationContent =
      evaluationResult.messages[evaluationResult.messages.length - 1]?.content || '';
    const contentString =
      typeof evaluationContent === 'string' ? evaluationContent : JSON.stringify(evaluationContent);

    // Parse the evaluation result
    let parsedEvaluation;
    try {
      // Extract JSON from the response
      const jsonMatch = contentString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in evaluation response');
      }
      parsedEvaluation = JSON.parse(jsonMatch[0]);

      // Validate with Zod schema
      parsedEvaluation = MovieEvaluationSchema.parse(parsedEvaluation);
    } catch (parseError) {
      logger.warn('⚠️ Failed to parse evaluation JSON, using fallback', {
        component: 'movie-evaluation-react-integration',
        movieTitle: movie.title,
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        rawResponse: contentString.substring(0, 200),
      });
      return createFallbackEvaluation(movie, userCriteria);
    }

    const responseTime = Date.now() - startTime;

    // Track token usage (approximate)
    const totalInputTokens = Math.ceil((enrichedMovieData.length + evaluationPrompt.length) / 4);
    const totalOutputTokens = Math.ceil(contentString.length / 4);

    globalTokenTracker.addUsage(
      totalInputTokens,
      totalOutputTokens,
      'movie-evaluation-react-integration',
    );

    logLlmRequest('claude-3.5-sonnet-react-integration', evaluationPrompt, totalInputTokens);
    logLlmResponse(
      'claude-3.5-sonnet-react-integration',
      contentString,
      totalOutputTokens,
      responseTime,
    );

    // Validate confidence score against detailed sub-scores
    const calculatedScore = calculateValidatedConfidenceScore(parsedEvaluation, userCriteria);

    // If there's a significant discrepancy, log it and use the calculated score
    const scoreDifference = Math.abs(parsedEvaluation.confidenceScore - calculatedScore);
    if (scoreDifference > 0.3) {
      logger.warn('🚨 Confidence score mismatch detected - using calculated score', {
        component: 'movie-evaluation-react-integration',
        movieTitle: movie.title,
        llmScore: parsedEvaluation.confidenceScore,
        calculatedScore: calculatedScore,
        difference: scoreDifference,
        reasoning: parsedEvaluation.matchReasoning.substring(0, 100),
      });
    }

    const movieEvaluation: MovieEvaluation = {
      movie,
      confidenceScore: scoreDifference > 0.3 ? calculatedScore : parsedEvaluation.confidenceScore,
      matchReasoning: parsedEvaluation.matchReasoning,
      familyAppropriate: parsedEvaluation.familyAppropriate,
    };

    logger.info('✅ Movie evaluation with React agent integration completed', {
      component: 'movie-evaluation-react-integration',
      movieTitle: movie.title,
      confidenceScore: movieEvaluation.confidenceScore,
      familyAppropriate: movieEvaluation.familyAppropriate,
      responseTime,
    });

    return movieEvaluation;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('❌ Movie evaluation with React agent integration failed', {
      component: 'movie-evaluation-react-integration',
      movieTitle: movie.title,
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });

    // Return fallback evaluation on error
    return createFallbackEvaluation(movie, userCriteria);
  }
}

/**
 * Calculate a validated confidence score based on detailed sub-scores
 * This prevents mismatch between reasoning and final score
 */
function calculateValidatedConfidenceScore(
  evaluation: {
    genreAlignment: number;
    themeMatching: number;
    qualityIndicators: number;
    ageAppropriateScore: number;
    culturalRelevance: number;
    familyAppropriate: boolean;
    matchReasoning: string;
  },
  userCriteria: UserCriteria,
): number {
  // Base calculation using weighted sub-scores
  let calculatedScore = 0;
  let totalWeight = 0;

  // Genre alignment is most important (40% weight)
  calculatedScore += evaluation.genreAlignment * 0.4;
  totalWeight += 0.4;

  // Theme matching is second most important (25% weight)
  calculatedScore += evaluation.themeMatching * 0.25;
  totalWeight += 0.25;

  // Age appropriateness (20% weight)
  calculatedScore += evaluation.ageAppropriateScore * 0.2;
  totalWeight += 0.2;

  // Quality indicators (10% weight)
  calculatedScore += evaluation.qualityIndicators * 0.1;
  totalWeight += 0.1;

  // Cultural relevance (5% weight)
  calculatedScore += evaluation.culturalRelevance * 0.05;
  totalWeight += 0.05;

  // Normalize by total weight (should be 1.0, but just in case)
  calculatedScore = calculatedScore / totalWeight;

  // Family appropriateness check - severe penalty if required but not met
  if (userCriteria.familyFriendly && !evaluation.familyAppropriate) {
    calculatedScore *= 0.1; // Severe penalty
  }

  // Check for negative reasoning patterns that should lower scores
  const reasoning = evaluation.matchReasoning.toLowerCase();
  const negativePatterns = [
    'does not match',
    'not a good fit',
    'inappropriate',
    'wrong genre',
    'not suitable',
    "doesn't align",
    'poor match',
    'not recommended',
  ];

  const hasNegativeReasoning = negativePatterns.some((pattern) => reasoning.includes(pattern));
  if (hasNegativeReasoning && calculatedScore > 0.5) {
    calculatedScore = Math.min(calculatedScore, 0.4); // Cap at 40% if reasoning is negative
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(1, calculatedScore));
}

/**
 * Create a fallback evaluation when LLM evaluation fails
 */
function createFallbackEvaluation(movie: Movie, userCriteria: UserCriteria): MovieEvaluation {
  logger.debug('🔄 Creating fallback movie evaluation', {
    component: 'movie-evaluation-react-integration',
    movieTitle: movie.title,
  });

  // Simple genre matching logic
  const movieGenres = movie.genre || [];
  const preferredGenres = userCriteria.enhancedGenres || [];
  const excludedGenres = userCriteria.excludeGenres || [];

  // Check for excluded genres
  const hasExcludedGenre = excludedGenres.some((excluded) =>
    movieGenres.some((genre) => genre.toLowerCase().includes(excluded.toLowerCase())),
  );

  if (hasExcludedGenre) {
    return {
      movie,
      confidenceScore: 0.1,
      matchReasoning: 'Movie contains excluded genres',
      familyAppropriate: false,
    };
  }

  // Calculate basic genre alignment
  const genreMatches = preferredGenres.filter((preferred) =>
    movieGenres.some((genre) => genre.toLowerCase().includes(preferred.toLowerCase())),
  );

  const genreAlignment =
    preferredGenres.length > 0 ? genreMatches.length / preferredGenres.length : 0.5;

  // Basic family appropriateness check
  const familyAppropriate =
    !userCriteria.familyFriendly ||
    (movie.familyRating && !['R', 'NC-17', 'X'].includes(movie.familyRating))
      ? true
      : false;

  const confidenceScore = Math.min(0.8, genreAlignment + 0.2); // Cap at 0.8 for fallback

  return {
    movie,
    confidenceScore,
    matchReasoning: `Fallback evaluation: ${genreMatches.length}/${preferredGenres.length} genre matches, family appropriate: ${familyAppropriate}`,
    familyAppropriate,
  };
}

/**
 * Batch evaluation using React agent integration (for compatibility)
 */
export async function evaluateMoviesBatchWithReactAgentIntegration(
  movies: Movie[],
  userCriteria: UserCriteria,
): Promise<MovieEvaluation[]> {
  logger.info('🎬 Starting batch evaluation with React agent integration', {
    component: 'movie-evaluation-react-integration',
    batchSize: movies.length,
  });

  const startTime = Date.now();

  // Evaluate movies in parallel using React agent integration
  const evaluationPromises = movies.map((movie) =>
    evaluateMovieWithReactAgentIntegration(movie, userCriteria),
  );

  const results = await Promise.allSettled(evaluationPromises);

  const evaluations = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error('❌ Individual movie evaluation failed in batch', {
        component: 'movie-evaluation-react-integration',
        movieTitle: movies[index]?.title,
        error: result.reason,
      });
      return createFallbackEvaluation(movies[index], userCriteria);
    }
  });

  const duration = Date.now() - startTime;
  const highConfidenceCount = evaluations.filter((e) => e.confidenceScore >= 0.75).length;

  logger.info('✅ Batch evaluation with React agent integration completed', {
    component: 'movie-evaluation-react-integration',
    batchSize: movies.length,
    highConfidenceCount,
    averageScore: evaluations.reduce((sum, e) => sum + e.confidenceScore, 0) / evaluations.length,
    duration,
  });

  return evaluations;
}
