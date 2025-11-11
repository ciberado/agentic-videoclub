import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

import logger from '../config/logger';
import type { Movie } from '../types';

/**
 * Movie Cache Service
 *
 * Simple SQLite-based cache for normalized movie data to avoid redundant
 * LLM processing and web scraping operations. Stores movies with URL-based
 * keys for efficient retrieval.
 */

export class MovieCache {
  private db: DatabaseSync | null = null;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath: string = 'data/movies.db') {
    // Ensure relative path is from the agent package root
    this.dbPath = path.resolve(process.cwd(), dbPath);
  }

  /**
   * Initialize the cache database and create tables if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure the data directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create database connection
      this.db = new DatabaseSync(this.dbPath);

      // Create movies table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS movies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          year INTEGER,
          genre TEXT NOT NULL, -- JSON array as string
          rating REAL,
          director TEXT,
          description TEXT,
          family_rating TEXT,
          themes TEXT NOT NULL, -- JSON array as string
          poster_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index on URL for fast lookups
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_movies_url ON movies(url)');

      this.initialized = true;
      logger.debug('🗄️ Movie cache initialized', {
        component: 'movie-cache',
        dbPath: this.dbPath,
      });
    } catch (error) {
      logger.error('❌ Failed to initialize movie cache', {
        component: 'movie-cache',
        error: error instanceof Error ? error.message : String(error),
        dbPath: this.dbPath,
      });
      throw error;
    }
  }

  /**
   * Get a cached movie by URL
   */
  async getMovie(url: string): Promise<Movie | null> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM movies WHERE url = ?');
      const row = stmt.get(url) as any;

      if (!row) {
        logger.debug('🔍 Cache miss for movie', {
          component: 'movie-cache',
          url: url.substring(0, 50) + '...',
        });
        return null;
      }

      const movie: Movie = {
        title: row.title,
        year: row.year,
        genre: JSON.parse(row.genre),
        rating: row.rating,
        director: row.director,
        description: row.description,
        familyRating: row.family_rating,
        themes: JSON.parse(row.themes),
        posterUrl: row.poster_url || undefined,
      };

      logger.debug('✅ Cache hit for movie', {
        component: 'movie-cache',
        title: movie.title,
        url: url.substring(0, 50) + '...',
      });

      return movie;
    } catch (error) {
      logger.error('❌ Failed to get movie from cache', {
        component: 'movie-cache',
        url: url.substring(0, 50) + '...',
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // Return null on error to allow fallback to normal processing
    }
  }

  /**
   * Cache a normalized movie
   */
  async setMovie(url: string, movie: Movie): Promise<void> {
    await this.initialize();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO movies (
          url, title, year, genre, rating, director, 
          description, family_rating, themes, poster_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        url,
        movie.title,
        movie.year,
        JSON.stringify(movie.genre),
        movie.rating,
        movie.director,
        movie.description,
        movie.familyRating,
        JSON.stringify(movie.themes),
        movie.posterUrl || null,
      );

      logger.debug('💾 Movie cached successfully', {
        component: 'movie-cache',
        title: movie.title,
        url: url.substring(0, 50) + '...',
      });
    } catch (error) {
      logger.error('❌ Failed to cache movie', {
        component: 'movie-cache',
        title: movie.title,
        url: url.substring(0, 50) + '...',
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Get multiple cached movies by URLs
   */
  async getMovies(urls: string[]): Promise<{ [url: string]: Movie }> {
    await this.initialize();

    if (!this.db || urls.length === 0) {
      return {};
    }

    try {
      const placeholders = urls.map(() => '?').join(',');
      const stmt = this.db.prepare(`SELECT * FROM movies WHERE url IN (${placeholders})`);
      const rows = stmt.all(...urls) as any[];

      const cachedMovies: { [url: string]: Movie } = {};

      for (const row of rows) {
        cachedMovies[row.url] = {
          title: row.title,
          year: row.year,
          genre: JSON.parse(row.genre),
          rating: row.rating,
          director: row.director,
          description: row.description,
          familyRating: row.family_rating,
          themes: JSON.parse(row.themes),
          posterUrl: row.poster_url || undefined,
        };
      }

      logger.debug('📦 Batch cache lookup completed', {
        component: 'movie-cache',
        requested: urls.length,
        found: Object.keys(cachedMovies).length,
        hitRate: `${((Object.keys(cachedMovies).length / urls.length) * 100).toFixed(1)}%`,
      });

      return cachedMovies;
    } catch (error) {
      logger.error('❌ Failed to get movies from cache', {
        component: 'movie-cache',
        requestedCount: urls.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return {}; // Return empty object on error
    }
  }

  /**
   * Cache multiple movies in a batch
   */
  async setMovies(movieData: { url: string; movie: Movie }[]): Promise<void> {
    await this.initialize();

    if (!this.db || movieData.length === 0) {
      return;
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO movies (
          url, title, year, genre, rating, director, 
          description, family_rating, themes, poster_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      // Use a transaction for better performance
      this.db.exec('BEGIN TRANSACTION');

      try {
        for (const { url, movie } of movieData) {
          stmt.run(
            url,
            movie.title,
            movie.year,
            JSON.stringify(movie.genre),
            movie.rating,
            movie.director,
            movie.description,
            movie.familyRating,
            JSON.stringify(movie.themes),
            movie.posterUrl || null,
          );
        }

        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }

      logger.debug('💾 Batch movie caching completed', {
        component: 'movie-cache',
        cachedCount: movieData.length,
        sampleTitles: movieData.slice(0, 3).map((m) => m.movie.title),
      });
    } catch (error) {
      logger.error('❌ Failed to batch cache movies', {
        component: 'movie-cache',
        movieCount: movieData.length,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalMovies: number;
    oldestEntry: string | null;
    newestEntry: string | null;
  }> {
    await this.initialize();

    if (!this.db) {
      return { totalMovies: 0, oldestEntry: null, newestEntry: null };
    }

    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM movies
      `);

      const stats = stmt.get() as any;

      return {
        totalMovies: stats.total || 0,
        oldestEntry: stats.oldest,
        newestEntry: stats.newest,
      };
    } catch (error) {
      logger.error('❌ Failed to get cache stats', {
        component: 'movie-cache',
        error: error instanceof Error ? error.message : String(error),
      });
      return { totalMovies: 0, oldestEntry: null, newestEntry: null };
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;

      logger.debug('🔒 Movie cache connection closed', {
        component: 'movie-cache',
      });
    }
  }
}

// Export a singleton instance
export const movieCache = new MovieCache();
