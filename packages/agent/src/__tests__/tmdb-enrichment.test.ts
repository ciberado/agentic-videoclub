import fs from 'fs';
import path from 'path';

import { TMDBEnrichmentService } from '../services/tmdb-enrichment';
import type { Movie } from '../types';

// Mock TMDB module
const mockTMDBInstance = {
  search: {
    movies: jest.fn(),
  },
  movies: {
    details: jest.fn(),
    reviews: jest.fn(),
    credits: jest.fn(),
  },
};

jest.mock('tmdb-ts', () => ({
  TMDB: jest.fn().mockImplementation(() => mockTMDBInstance),
}));

// Mock logger
jest.mock('../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('TMDBEnrichmentService', () => {
  let service: TMDBEnrichmentService;
  let testDbPath: string;

  const sampleMovie: Movie = {
    title: 'The Matrix',
    year: 1999,
    genre: ['Action', 'Sci-Fi'],
    rating: 8.7,
    director: 'The Wachowskis',
    description:
      'A computer hacker learns from mysterious rebels about the true nature of his reality.',
    familyRating: 'R',
    themes: ['Reality', 'Technology', 'Rebellion'],
  };

  beforeEach(() => {
    // Create unique test database for each test
    testDbPath = path.join(__dirname, `test-tmdb-${Date.now()}.db`);
    service = new TMDBEnrichmentService(testDbPath);

    // Set up environment variable
    process.env.TMDB_TOKEN = 'test-token';

    // Reset API call counter
    service.resetApiCallCounter();
  });
  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Clean up environment
    delete process.env.TMDB_TOKEN;
  });

  describe('initialization', () => {
    it('should throw error when TMDB_TOKEN is not provided', async () => {
      delete process.env.TMDB_TOKEN;

      await expect(service.enrichMovieData(sampleMovie)).rejects.toThrow(
        'TMDB_TOKEN not configured',
      );
    });

    it('should create database tables on initialization', async () => {
      // Mock successful TMDB search with no results to trigger initialization
      mockTMDBInstance.search.movies.mockResolvedValue({ results: [] });

      await service.enrichMovieData(sampleMovie);

      // Verify database file was created
      expect(fs.existsSync(testDbPath)).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache enrichment results', async () => {
      // Mock successful TMDB responses
      mockTMDBInstance.search.movies.mockResolvedValue({
        results: [{ id: 603, title: 'The Matrix', release_date: '1999-03-31' }],
      });

      mockTMDBInstance.movies.details.mockResolvedValue({
        id: 603,
        title: 'The Matrix',
        overview: 'Extended overview from TMDB...',
        genres: [{ name: 'Action' }, { name: 'Science Fiction' }],
        adult: false,
        vote_average: 8.7,
        vote_count: 15000,
      });

      // First call should hit the API
      const result1 = await service.enrichMovieData(sampleMovie);
      expect(result1).toBeTruthy();
      expect(result1?.extendedOverview).toBe('Extended overview from TMDB...');

      // Reset mocks to verify second call uses cache
      mockTMDBInstance.search.movies.mockClear();
      mockTMDBInstance.movies.details.mockClear();

      // Second call should use cache
      const result2 = await service.enrichMovieData(sampleMovie);
      expect(result2).toEqual(result1);
      expect(mockTMDBInstance.search.movies).not.toHaveBeenCalled();
      expect(mockTMDBInstance.movies.details).not.toHaveBeenCalled();
    });
  });

  describe('rate limiting', () => {
    it('should respect API call limits', async () => {
      // Mock successful responses
      mockTMDBInstance.search.movies.mockResolvedValue({
        results: [{ id: 603, title: 'Test Movie', release_date: '2023-01-01' }],
      });
      mockTMDBInstance.movies.details.mockResolvedValue({
        overview: 'Test overview',
        genres: [],
        adult: false,
      });

      // Make 10 successful calls (should work)
      for (let i = 0; i < 10; i++) {
        const testMovie = { ...sampleMovie, title: `Test Movie ${i}` };
        const result = await service.enrichMovieData(testMovie);
        expect(result).toBeTruthy();
      }

      // 11th call should be rejected due to rate limiting
      const testMovie11 = { ...sampleMovie, title: 'Test Movie 11' };
      const result11 = await service.enrichMovieData(testMovie11);
      expect(result11).toBeNull();
    });

    it('should reset API call counter', () => {
      // This is a simple test since resetApiCallCounter is public
      expect(() => service.resetApiCallCounter()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle TMDB API errors gracefully', async () => {
      // Mock API error
      mockTMDBInstance.search.movies.mockRejectedValue(new Error('TMDB API Error'));

      const result = await service.enrichMovieData(sampleMovie);
      expect(result).toBeNull();
    });

    it('should handle empty search results', async () => {
      // Mock empty search results
      mockTMDBInstance.search.movies.mockResolvedValue({ results: [] });

      const result = await service.enrichMovieData(sampleMovie);
      expect(result).toBeNull();
    });

    it('should handle partial TMDB data', async () => {
      // Mock search with results but minimal details
      mockTMDBInstance.search.movies.mockResolvedValue({
        results: [{ id: 603, title: 'The Matrix' }],
      });

      mockTMDBInstance.movies.details.mockResolvedValue({
        id: 603,
        title: 'The Matrix',
        overview: null, // Missing overview
        genres: null, // Missing genres
        adult: undefined, // Missing adult flag
      });

      const result = await service.enrichMovieData(sampleMovie);
      expect(result).toBeTruthy();
      expect(result?.extendedOverview).toBe('');
      expect(result?.additionalGenres).toEqual([]);
      expect(result?.contentRating).toBeNull();
    });
  });

  describe('data extraction', () => {
    it('should extract complete enrichment data when available', async () => {
      // Mock comprehensive TMDB response
      mockTMDBInstance.search.movies.mockResolvedValue({
        results: [{ id: 603, title: 'The Matrix', release_date: '1999-03-31' }],
      });

      mockTMDBInstance.movies.details.mockResolvedValue({
        id: 603,
        title: 'The Matrix',
        overview: 'A comprehensive overview of The Matrix movie...',
        genres: [{ name: 'Action' }, { name: 'Science Fiction' }, { name: 'Thriller' }],
        adult: false,
        vote_average: 8.7,
        vote_count: 15432,
      });

      const result = await service.enrichMovieData(sampleMovie);

      expect(result).toBeTruthy();
      expect(result?.extendedOverview).toBe('A comprehensive overview of The Matrix movie...');
      expect(result?.additionalGenres).toEqual(['Action', 'Science Fiction', 'Thriller']);
      expect(result?.contentRating).toBe('PG');
      expect(result?.tmdbRating).toBe(8.7);
      expect(result?.voteCount).toBe(15432);
    });

    it('should handle adult content flag correctly', async () => {
      mockTMDBInstance.search.movies.mockResolvedValue({
        results: [{ id: 123, title: 'Adult Movie' }],
      });

      mockTMDBInstance.movies.details.mockResolvedValue({
        id: 123,
        adult: true,
        overview: 'An adult movie',
        genres: [],
      });

      const result = await service.enrichMovieData(sampleMovie);

      expect(result?.contentRating).toBe('R');
    });
  });
});
