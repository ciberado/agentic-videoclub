import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import logger from '../config/logger';
import type { Movie } from '../types';

import { tmdbEnrichmentService } from './tmdb-enrichment';

/**
 * TMDB Movie Enrichment Tool
 *
 * LangChain tool that allows the LLM to request additional movie information
 * from The Movie Database (TMDB) when existing data is insufficient for evaluation.
 */

// Define the tool function separately for clarity
const tmdbEnrichmentToolFn = async ({
  title,
  year,
}: {
  title: string;
  year?: number;
}): Promise<string> => {
  logger.info('🎬 LLM requested TMDB movie enrichment', {
    component: 'tmdb-enrichment-tool',
    movieTitle: title,
    movieYear: year,
    toolName: 'tmdb_movie_enrichment',
  });

  try {
    // Create a basic movie object for the enrichment service
    const movie: Movie = {
      title,
      year: year || 0,
      genre: [], // Will be populated by enrichment
      rating: 0,
      director: 'Unknown',
      description: 'Insufficient data - requesting enrichment',
      familyRating: 'Unknown',
      themes: [],
    };

    // Call the enrichment service
    const enrichmentData = await tmdbEnrichmentService.enrichMovieData(movie);

    if (!enrichmentData) {
      logger.warn('⚠️ TMDB enrichment failed - no data returned', {
        component: 'tmdb-enrichment-tool',
        movieTitle: title,
        movieYear: year,
      });

      return JSON.stringify({
        success: false,
        extendedOverview: '',
        additionalGenres: [],
        contentRating: null,
        tmdbRating: null,
        voteCount: null,
        posterUrl: null,
        message: 'No additional data found in TMDB or API limit reached',
      });
    }

    logger.info('✅ TMDB enrichment successful', {
      component: 'tmdb-enrichment-tool',
      movieTitle: title,
      hasOverview: enrichmentData.extendedOverview.length > 0,
      genreCount: enrichmentData.additionalGenres.length,
      tmdbRating: enrichmentData.tmdbRating,
      hasPoster: !!enrichmentData.posterUrl,
    });

    return JSON.stringify({
      success: true,
      extendedOverview: enrichmentData.extendedOverview,
      additionalGenres: enrichmentData.additionalGenres,
      contentRating: enrichmentData.contentRating,
      tmdbRating: enrichmentData.tmdbRating,
      voteCount: enrichmentData.voteCount,
      posterUrl: enrichmentData.posterUrl,
      message: 'Successfully enriched movie data from TMDB',
    });
  } catch (error) {
    logger.error('❌ TMDB enrichment tool error', {
      component: 'tmdb-enrichment-tool',
      movieTitle: title,
      movieYear: year,
      error: error instanceof Error ? error.message : String(error),
    });

    return JSON.stringify({
      success: false,
      extendedOverview: '',
      additionalGenres: [],
      contentRating: null,
      tmdbRating: null,
      voteCount: null,
      posterUrl: null,
      message: `Error during enrichment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};

// Define the tool options separately for clarity
const tmdbEnrichmentToolOptions = {
  name: 'tmdb_movie_enrichment',
  description: `Get additional movie information from The Movie Database (TMDB) when existing data is insufficient for evaluation.
  
Use this tool when:
- Movie description is missing or very short (< 50 characters)
- You need more detailed plot information
- Genre classifications seem incomplete or unclear
- You need to verify content appropriateness
- Overall confidence in evaluation is low due to insufficient data

This tool provides:
- Extended plot overview/synopsis
- Additional genre classifications  
- Content rating information
- TMDB user ratings and vote counts
- Movie poster URLs for visual presentation

Returns a JSON string with the enrichment data.
Note: This tool has rate limiting (max 10 calls per evaluation batch) to prevent API abuse.`,

  schema: z.object({
    title: z.string().describe('The movie title to search for'),
    year: z
      .number()
      .optional()
      .describe('The release year of the movie (optional, helps with accuracy)'),
  }),
};

// Invoke tool() with clear variable assignments
export const tmdbEnrichmentTool = tool(tmdbEnrichmentToolFn, tmdbEnrichmentToolOptions);
