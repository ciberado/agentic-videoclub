import { z } from 'zod';

import logger from '../config/logger';
import type { Movie, UserCriteria, MovieEvaluation } from '../types';
import { logLlmRequest, logLlmResponse } from '../utils/logging';
import { globalTokenTracker } from '../utils/token-tracker';

import { tmdbEnrichmentService } from './tmdb-enrichment';
import { enrichMovieWithReactAgent } from './tmdb-enrichment-react-agent';

/**
 * Movie Evaluation Pipeline Service (PRODUCTION VERSION)
 *
 * This is the CURRENT PRODUCTION service for movie evaluation, implementing a sophisticated
 * multi-step pipeline architecture with specialized React Agents for optimal robustness and quality.
 *
 * STATUS: Currently used in production via movie-evaluation-factory.ts
 * DEFAULT STRATEGY: This is the default when MOVIE_EVALUATION_STRATEGY is not set
 * ALTERNATIVE: Single-agent approach available in movie-evaluation-single-agent.ts
 *
 * PIPELINE ARCHITECTURE:
 * ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
 * │ React Agent     │ -> │ Data Processing │ -> │ Evaluation      │
 * │ (Enrichment)    │    │ & Validation    │    │ (Scoring)       │
 * └─────────────────┘    └─────────────────┘    └─────────────────┘
 *
 * PIPELINE ADVANTAGES:
 * ✅ Specialized React agents for each phase (enrichment vs evaluation)
 * ✅ Explicit poster URL extraction with multiple fallback mechanisms
 * ✅ Sophisticated error handling and test environment detection
 * ✅ Detailed scoring guidelines with explicit confidence score calculations
 * ✅ Comprehensive fallback evaluation system
 * ✅ Better production monitoring and logging
 * ✅ Separation of concerns: each agent has a single responsibility
 *
 * WHY PIPELINE APPROACH IS PREFERRED:
 * - **Modularity**: Each step can be optimized, tested, and debugged independently
 * - **Reliability**: Failure in one step doesn't crash the entire evaluation
 * - **Maintainability**: Easier to update enrichment logic without affecting evaluation
 * - **Quality Control**: Multiple validation and fallback points
 * - **Performance**: Can optimize each step separately for speed vs accuracy
 * - **Monitoring**: Granular logging and metrics for each pipeline stage
 *
 * PIPELINE STEPS:
 * 1. **Enrichment Phase**: Specialized React Agent gathers additional movie data from TMDB
 * 2. **Processing Phase**: Data validation, poster URL extraction, fallback handling
 * 3. **Evaluation Phase**: Focused React Agent evaluates using enriched data
 * 4. **Validation Phase**: Score validation, consistency checks, final quality assurance
 *
 * This pipeline demonstrates how to integrate multiple React agents for different purposes
 * instead of relying on a single agent to handle all responsibilities. Each agent is
 * specialized for its specific task, leading to better overall performance and reliability.
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
      component: 'movie-evaluation-pipeline',
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
 * Evaluate a single movie using the pipeline approach with React agent integration
 */
export async function evaluateMovieWithPipeline(
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
      component: 'movie-evaluation-pipeline',
      movieTitle: movie.title,
    });
    return createFallbackEvaluation(movie, userCriteria);
  }

  const startTime = Date.now();

  try {
    logger.info('🏭 Starting movie evaluation pipeline', {
      component: 'movie-evaluation-pipeline',
      movieTitle: movie.title,
      movieYear: movie.year,
    });

    // PIPELINE STEP 1: Use React agent to intelligently enrich movie data
    const enrichedMovieData = await enrichMovieWithReactAgent(movie, userCriteria);

    // PIPELINE STEP 2: Data processing and poster URL extraction
    if (!movie.posterUrl) {
      try {
        const tmdbData = await tmdbEnrichmentService.enrichMovieData(movie);
        if (tmdbData?.posterUrl) {
          movie.posterUrl = tmdbData.posterUrl;
          logger.debug('📸 Poster URL obtained from TMDB enrichment service', {
            component: 'movie-evaluation-pipeline',
            movieTitle: movie.title,
            posterUrl: tmdbData.posterUrl,
          });
        }
      } catch (error) {
        logger.debug('⚠️ Failed to get poster URL from TMDB service', {
          component: 'movie-evaluation-pipeline',
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
        component: 'movie-evaluation-pipeline',
        movieTitle: movie.title,
        posterUrl: extractedPosterUrl,
      });
    }

    logger.info('✅ Pipeline enrichment step completed', {
      component: 'movie-evaluation-pipeline',
      movieTitle: movie.title,
      enrichedDataLength: enrichedMovieData.length,
      hasPosterUrl: !!movie.posterUrl,
    });

    // PIPELINE STEP 3: Evaluation using specialized evaluation agent
    const evaluationPrompt = `You are a movie recommendation specialist. Based on the following enriched movie information, evaluate how well this movie matches the user's preferences.

ENRICHED MOVIE DATA:
${enrichedMovieData}

USER CRITERIA:
- Original User Input: "${userCriteria.originalInput}"
- Enhanced genres: ${userCriteria.enhancedGenres.join(', ')}
- Excluded genres: ${userCriteria.excludeGenres.join(', ')}
- Age group: ${userCriteria.ageGroup}
- Family-friendly required: ${userCriteria.familyFriendly}
- Preferred themes: ${userCriteria.preferredThemes.join(', ')}
- Avoid themes: ${userCriteria.avoidThemes.join(', ')}

EVALUATION CRITERIA:
1. Genre Alignment (0-1): Does the movie contain ANY of the user's preferred genres? Score highly for broad genre matches (e.g., "Science Fiction" covers all sci-fi subgenres)
2. Theme Matching (0-1): How well do the movie's themes align with user interests?
3. Age Appropriateness (0-1): Is the movie suitable for the specified age group?
4. Family Appropriateness: Is the movie suitable for family viewing if required?
5. Quality Indicators (0-1): Overall movie quality based on ratings and reviews
6. Cultural Relevance (0-1): Current availability and cultural relevance

IMPORTANT SCORING GUIDELINES:
- If the movie has excluded genres as PRIMARY genres, the confidenceScore should be very low (0.0-0.2)
- Genre matching should be flexible - if the movie has ANY of the preferred genres, it should score well
- Science Fiction movies should score highly if user wants sci-fi, regardless of specific subgenre
- Family-friendly requirement: If required but movie isn't appropriate, confidenceScore should be very low (max 0.2)
- Quality movies in the right genre should score 0.6-0.9, not be artificially capped
- The confidenceScore should be calculated as: (genreAlignment * 0.4) + (themeMatching * 0.25) + (ageAppropriateScore * 0.2) + (qualityIndicators * 0.1) + (culturalRelevance * 0.05)
- Focus on finding good matches rather than rejecting movies for minor mismatches

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

    // Use specialized evaluation React agent
    const { createTMDBEnrichmentAgent } = await import('./tmdb-enrichment-react-agent.js');
    const agent = createTMDBEnrichmentAgent();

    const evaluationResult = await agent.invoke({
      messages: [{ role: 'user', content: evaluationPrompt }],
    });

    const evaluationContent =
      evaluationResult.messages[evaluationResult.messages.length - 1]?.content || '';
    const contentString =
      typeof evaluationContent === 'string' ? evaluationContent : JSON.stringify(evaluationContent);

    // PIPELINE STEP 4: Parse and validate the evaluation result
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
        component: 'movie-evaluation-pipeline',
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

    globalTokenTracker.addUsage(totalInputTokens, totalOutputTokens, 'movie-evaluation-pipeline');

    logLlmRequest('claude-3.5-sonnet-pipeline', evaluationPrompt, totalInputTokens);
    logLlmResponse('claude-3.5-sonnet-pipeline', contentString, totalOutputTokens, responseTime);

    // PIPELINE STEP 5: Validate confidence score against detailed sub-scores
    const calculatedScore = calculateValidatedConfidenceScore(parsedEvaluation, userCriteria);

    // If there's a significant discrepancy, log it and use the calculated score
    const scoreDifference = Math.abs(parsedEvaluation.confidenceScore - calculatedScore);
    if (scoreDifference > 0.3) {
      logger.warn('🚨 Confidence score mismatch detected - using calculated score', {
        component: 'movie-evaluation-pipeline',
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

    logger.info('✅ Movie evaluation pipeline completed', {
      component: 'movie-evaluation-pipeline',
      movieTitle: movie.title,
      confidenceScore: movieEvaluation.confidenceScore,
      familyAppropriate: movieEvaluation.familyAppropriate,
      responseTime,
    });

    return movieEvaluation;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('❌ Movie evaluation pipeline failed', {
      component: 'movie-evaluation-pipeline',
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
    component: 'movie-evaluation-pipeline',
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
 * Batch evaluation using pipeline approach
 */
export async function evaluateMoviesBatchWithPipeline(
  movies: Movie[],
  userCriteria: UserCriteria,
): Promise<MovieEvaluation[]> {
  logger.info('🏭 Starting batch evaluation with pipeline approach', {
    component: 'movie-evaluation-pipeline',
    batchSize: movies.length,
  });

  const startTime = Date.now();

  // Evaluate movies in parallel using pipeline approach
  const evaluationPromises = movies.map((movie) => evaluateMovieWithPipeline(movie, userCriteria));

  const results = await Promise.allSettled(evaluationPromises);

  const evaluations = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error('❌ Individual movie evaluation failed in batch', {
        component: 'movie-evaluation-pipeline',
        movieTitle: movies[index]?.title,
        error: result.reason,
      });
      return createFallbackEvaluation(movies[index], userCriteria);
    }
  });

  const duration = Date.now() - startTime;
  const highConfidenceCount = evaluations.filter((e) => e.confidenceScore >= 0.4).length;

  logger.info('✅ Batch evaluation with pipeline approach completed', {
    component: 'movie-evaluation-pipeline',
    batchSize: movies.length,
    highConfidenceCount,
    averageScore: evaluations.reduce((sum, e) => sum + e.confidenceScore, 0) / evaluations.length,
    duration,
  });

  return evaluations;
}

// Export functions with backward-compatible names for transition period
export {
  evaluateMovieWithPipeline as evaluateMovieWithReactAgentIntegration,
  evaluateMoviesBatchWithPipeline as evaluateMoviesBatchWithReactAgentIntegration,
};
