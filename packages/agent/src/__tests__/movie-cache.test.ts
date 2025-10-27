import { MovieCache } from '../services/movie-cache';
import type { Movie } from '../types';
import fs from 'fs';
import path from 'path';

describe('MovieCache Service', () => {
  let movieCache: MovieCache;
  const testDbPath = 'test-movies.db';

  beforeEach(async () => {
    // Use a test-specific database
    movieCache = new MovieCache(testDbPath);
  });

  afterEach(async () => {
    // Clean up test database
    await movieCache.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  const mockMovie: Movie = {
    title: 'Test Movie',
    year: 2024,
    genre: ['Drama', 'Comedy'],
    rating: 8.5,
    director: 'Test Director',
    description: 'A test movie for unit testing',
    familyRating: 'PG-13',
    themes: ['Friendship', 'Adventure']
  };

  const testUrl = 'https://www.primevideo.com/movie/test-movie';

  describe('Single Movie Operations', () => {
    it('should initialize database and create tables', async () => {
      await movieCache.initialize();
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it('should return null for non-existent movie', async () => {
      const result = await movieCache.getMovie('https://non-existent-url.com');
      expect(result).toBeNull();
    });

    it('should cache and retrieve a movie', async () => {
      // Cache the movie
      await movieCache.setMovie(testUrl, mockMovie);

      // Retrieve the movie
      const cachedMovie = await movieCache.getMovie(testUrl);
      
      expect(cachedMovie).not.toBeNull();
      expect(cachedMovie?.title).toBe(mockMovie.title);
      expect(cachedMovie?.year).toBe(mockMovie.year);
      expect(cachedMovie?.genre).toEqual(mockMovie.genre);
      expect(cachedMovie?.rating).toBe(mockMovie.rating);
      expect(cachedMovie?.director).toBe(mockMovie.director);
      expect(cachedMovie?.description).toBe(mockMovie.description);
      expect(cachedMovie?.familyRating).toBe(mockMovie.familyRating);
      expect(cachedMovie?.themes).toEqual(mockMovie.themes);
    });

    it('should update existing movie when caching with same URL', async () => {
      // Cache initial movie
      await movieCache.setMovie(testUrl, mockMovie);

      // Update with new data
      const updatedMovie: Movie = {
        ...mockMovie,
        title: 'Updated Test Movie',
        rating: 9.0
      };
      await movieCache.setMovie(testUrl, updatedMovie);

      // Retrieve and verify update
      const cachedMovie = await movieCache.getMovie(testUrl);
      expect(cachedMovie?.title).toBe('Updated Test Movie');
      expect(cachedMovie?.rating).toBe(9.0);
    });
  });

  describe('Batch Operations', () => {
    const mockMovies = [
      { url: 'https://www.primevideo.com/movie/1', movie: { ...mockMovie, title: 'Movie 1' } },
      { url: 'https://www.primevideo.com/movie/2', movie: { ...mockMovie, title: 'Movie 2' } },
      { url: 'https://www.primevideo.com/movie/3', movie: { ...mockMovie, title: 'Movie 3' } }
    ];

    it('should cache and retrieve multiple movies', async () => {
      // Cache multiple movies
      await movieCache.setMovies(mockMovies);

      // Retrieve all movies
      const urls = mockMovies.map(m => m.url);
      const cachedMovies = await movieCache.getMovies(urls);

      expect(Object.keys(cachedMovies)).toHaveLength(3);
      expect(cachedMovies[urls[0]]?.title).toBe('Movie 1');
      expect(cachedMovies[urls[1]]?.title).toBe('Movie 2');
      expect(cachedMovies[urls[2]]?.title).toBe('Movie 3');
    });

    it('should return partial results for mixed cached/uncached URLs', async () => {
      // Cache only first two movies
      await movieCache.setMovies(mockMovies.slice(0, 2));

      // Request all three URLs
      const urls = mockMovies.map(m => m.url);
      const cachedMovies = await movieCache.getMovies(urls);

      expect(Object.keys(cachedMovies)).toHaveLength(2);
      expect(cachedMovies[urls[0]]?.title).toBe('Movie 1');
      expect(cachedMovies[urls[1]]?.title).toBe('Movie 2');
      expect(cachedMovies[urls[2]]).toBeUndefined();
    });

    it('should handle empty batch operations gracefully', async () => {
      await movieCache.setMovies([]);
      const result = await movieCache.getMovies([]);
      expect(result).toEqual({});
    });
  });

  describe('Statistics and Management', () => {
    it('should provide accurate cache statistics', async () => {
      // Initially empty
      let stats = await movieCache.getStats();
      expect(stats.totalMovies).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();

      // Cache some movies
      await movieCache.setMovie(testUrl, mockMovie);
      
      stats = await movieCache.getStats();
      expect(stats.totalMovies).toBe(1);
      expect(stats.oldestEntry).toBeTruthy();
      expect(stats.newestEntry).toBeTruthy();
    });

    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      await movieCache.close();
      
      // Operations should not throw but return null/empty results
      const result = await movieCache.getMovie(testUrl);
      expect(result).toBeNull();
      
      const batchResult = await movieCache.getMovies([testUrl]);
      expect(batchResult).toEqual({});
    });
  });

  describe('Data Integrity', () => {
    it('should properly serialize and deserialize JSON arrays', async () => {
      const complexMovie: Movie = {
        ...mockMovie,
        genre: ['Science Fiction', 'Action', 'Thriller'],
        themes: ['Time Travel', 'Artificial Intelligence', 'Dystopian Future', 'Philosophy']
      };

      await movieCache.setMovie(testUrl, complexMovie);
      const cachedMovie = await movieCache.getMovie(testUrl);

      expect(cachedMovie?.genre).toEqual(complexMovie.genre);
      expect(cachedMovie?.themes).toEqual(complexMovie.themes);
      expect(Array.isArray(cachedMovie?.genre)).toBe(true);
      expect(Array.isArray(cachedMovie?.themes)).toBe(true);
    });

    it('should handle special characters and unicode in movie data', async () => {
      const unicodeMovie: Movie = {
        title: 'Amélie: L\'Extraordinaire Destin 🎬',
        year: 2001,
        genre: ['Comédie', 'Romance'],
        rating: 8.3,
        director: 'Jean-Pierre Jeunet',
        description: 'Une histoire extraordinaire avec des caractères spéciaux: éàè, ñ, ü, ø',
        familyRating: 'R',
        themes: ['Amour', 'Fantaisie', 'Paris']
      };

      await movieCache.setMovie(testUrl, unicodeMovie);
      const cachedMovie = await movieCache.getMovie(testUrl);

      expect(cachedMovie?.title).toBe(unicodeMovie.title);
      expect(cachedMovie?.description).toBe(unicodeMovie.description);
      expect(cachedMovie?.genre).toEqual(unicodeMovie.genre);
      expect(cachedMovie?.themes).toEqual(unicodeMovie.themes);
    });
  });
});