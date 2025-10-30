import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

import { TMDB } from 'tmdb-ts';

import logger from '../config/logger';
import type { Movie } from '../types';

/**
 * TMDB Movie Enrichment Service
 *
 * Provides additional movie data from The Movie Database (TMDB) when the LLM
 * determines that existing movie information is insufficient for evaluation.
 * Features SQLite-based caching and rate limiting to prevent API abuse.
 */

export interface TMDBEnrichmentData {
  extendedOverview: string;
  topReviews: string[];
  additionalGenres: string[];
  contentRating: string | null;
  cast: string[];
  tmdbRating: number | null;
  voteCount: number | null;
}

export class TMDBEnrichmentService {
  private tmdb: TMDB | null = null;
  private db: DatabaseSync | null = null;
  private dbPath: string;
  private initialized = false;
  private apiCallCount = 0;
  private readonly maxApiCallsPerBatch = 3; // Simple rate limiting

  constructor(dbPath: string = 'data/movies.db') {
    this.dbPath = path.resolve(process.cwd(), dbPath);
  }

  /**
   * Initialize TMDB client and database connection
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error('TMDB_API_KEY not configured');
    }

    try {
      // Initialize TMDB client
      this.tmdb = new TMDB(apiKey);

      // Ensure the data directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create database connection (reuse existing movies.db)
      this.db = new DatabaseSync(this.dbPath);

      // Create TMDB enrichment cache table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tmdb_enrichment_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          movie_key TEXT UNIQUE NOT NULL, -- title_year format
          extended_overview TEXT,
          top_reviews TEXT, -- JSON array as string
          additional_genres TEXT, -- JSON array as string
          content_rating TEXT,
          cast TEXT, -- JSON array as string
          tmdb_rating REAL,
          vote_count INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index for fast lookups
      this.db.exec(
        'CREATE INDEX IF NOT EXISTS idx_tmdb_cache_key ON tmdb_enrichment_cache(movie_key)',
      );

      this.initialized = true;
      logger.debug('🎬 TMDB enrichment service initialized', {
        component: 'tmdb-enrichment',
        dbPath: this.dbPath,
      });
    } catch (error) {
      logger.error('❌ Failed to initialize TMDB enrichment service', {
        component: 'tmdb-enrichment',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate cache key from movie title and year
   */
  private generateCacheKey(title: string, year: number | undefined): string {
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${normalizedTitle}_${year || 'unknown'}`;
  }

  /**
   * Get enrichment data from cache
   */
  private async getCachedEnrichment(cacheKey: string): Promise<TMDBEnrichmentData | null> {
    if (!this.db) return null;

    try {
      const stmt = this.db.prepare('SELECT * FROM tmdb_enrichment_cache WHERE movie_key = ?');
      const row = stmt.get(cacheKey) as
        | {
            extended_overview: string;
            top_reviews: string;
            additional_genres: string;
            content_rating: string;
            cast: string;
            tmdb_rating: number;
            vote_count: number;
          }
        | undefined;

      if (!row) {
        logger.debug('🔍 TMDB cache miss', {
          component: 'tmdb-enrichment',
          cacheKey,
        });
        return null;
      }

      const enrichmentData: TMDBEnrichmentData = {
        extendedOverview: row.extended_overview || '',
        topReviews: row.top_reviews ? JSON.parse(row.top_reviews) : [],
        additionalGenres: row.additional_genres ? JSON.parse(row.additional_genres) : [],
        contentRating: row.content_rating,
        cast: row.cast ? JSON.parse(row.cast) : [],
        tmdbRating: row.tmdb_rating,
        voteCount: row.vote_count,
      };

      logger.debug('✅ TMDB cache hit', {
        component: 'tmdb-enrichment',
        cacheKey,
        hasOverview: enrichmentData.extendedOverview.length > 0,
        reviewCount: enrichmentData.topReviews.length,
      });

      return enrichmentData;
    } catch (error) {
      logger.error('❌ Failed to get TMDB cache', {
        component: 'tmdb-enrichment',
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cache enrichment data
   */
  private async cacheEnrichment(cacheKey: string, data: TMDBEnrichmentData): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO tmdb_enrichment_cache (
          movie_key, extended_overview, top_reviews, additional_genres,
          content_rating, cast, tmdb_rating, vote_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        cacheKey,
        data.extendedOverview,
        JSON.stringify(data.topReviews),
        JSON.stringify(data.additionalGenres),
        data.contentRating,
        JSON.stringify(data.cast),
        data.tmdbRating,
        data.voteCount,
      );

      logger.debug('💾 TMDB enrichment data cached', {
        component: 'tmdb-enrichment',
        cacheKey,
      });
    } catch (error) {
      logger.error('❌ Failed to cache TMDB enrichment', {
        component: 'tmdb-enrichment',
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Reset API call counter (called at the start of each evaluation batch)
   */
  resetApiCallCounter(): void {
    this.apiCallCount = 0;
    logger.debug('🔄 TMDB API call counter reset', {
      component: 'tmdb-enrichment',
    });
  }

  /**
   * Check if API call limit has been reached
   */
  private canMakeApiCall(): boolean {
    return this.apiCallCount < this.maxApiCallsPerBatch;
  }

  /**
   * Enrich movie data using TMDB API
   */
  async enrichMovieData(movie: Movie): Promise<TMDBEnrichmentData | null> {
    try {
      await this.initialize();

      const cacheKey = this.generateCacheKey(movie.title, movie.year);

      // Check cache first
      const cachedData = await this.getCachedEnrichment(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Check API call limit
      if (!this.canMakeApiCall()) {
        logger.warn('⚠️ TMDB API call limit reached for this batch', {
          component: 'tmdb-enrichment',
          currentCalls: this.apiCallCount,
          maxCalls: this.maxApiCallsPerBatch,
          movieTitle: movie.title,
        });
        return null;
      }

      if (!this.tmdb) {
        throw new Error('TMDB client not initialized');
      }

      logger.info('🎬 Enriching movie data from TMDB', {
        component: 'tmdb-enrichment',
        movieTitle: movie.title,
        movieYear: movie.year,
        apiCallCount: this.apiCallCount + 1,
      });

      // Increment API call counter
      this.apiCallCount++;

      // Search for the movie
      const searchResults = await this.tmdb.search.movies({
        query: movie.title,
        year: movie.year,
      });

      if (!searchResults.results || searchResults.results.length === 0) {
        logger.warn('⚠️ No TMDB results found', {
          component: 'tmdb-enrichment',
          movieTitle: movie.title,
          movieYear: movie.year,
        });
        return null;
      }

      // Get the first (most relevant) result
      const tmdbMovie = searchResults.results[0];

      // Get detailed movie information
      const movieDetails = await this.tmdb.movies.details(tmdbMovie.id);

      // For now, focus on the core functionality - extended overview and basic info
      // TODO: Add reviews and cast in future iteration when TMDB types are clearer
      const topReviews: string[] = [];
      const cast: string[] = [];
      let contentRating: string | null = null;
      const additionalGenres: string[] = [];

      // Get basic additional info that's reliably available
      if (movieDetails.adult !== undefined) {
        contentRating = movieDetails.adult ? 'R' : 'PG'; // Simple adult content indicator
      }

      // Extract additional genres if available
      if (movieDetails.genres && Array.isArray(movieDetails.genres)) {
        for (const genre of movieDetails.genres) {
          if (genre && typeof genre === 'object' && 'name' in genre) {
            additionalGenres.push(String(genre.name));
          }
        }
      }

      const enrichmentData: TMDBEnrichmentData = {
        extendedOverview: movieDetails.overview || '',
        topReviews,
        additionalGenres,
        contentRating,
        cast,
        tmdbRating: movieDetails.vote_average || null,
        voteCount: movieDetails.vote_count || null,
      };

      // Cache the results
      await this.cacheEnrichment(cacheKey, enrichmentData);

      logger.info('✅ Movie enrichment successful', {
        component: 'tmdb-enrichment',
        movieTitle: movie.title,
        hasOverview: enrichmentData.extendedOverview.length > 0,
        reviewCount: enrichmentData.topReviews.length,
        castCount: enrichmentData.cast.length,
        tmdbRating: enrichmentData.tmdbRating,
      });

      return enrichmentData;
    } catch (error) {
      // Re-throw configuration errors (like missing API key)
      if (error instanceof Error && error.message === 'TMDB_API_KEY not configured') {
        throw error;
      }

      logger.error('❌ Failed to enrich movie data', {
        component: 'tmdb-enrichment',
        movieTitle: movie.title,
        movieYear: movie.year,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

// Export singleton instance
export const tmdbEnrichmentService = new TMDBEnrichmentService();
