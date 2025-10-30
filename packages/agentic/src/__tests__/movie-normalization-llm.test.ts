import { normalizeMovieData, normalizeMoviesBatch } from '../services/movie-normalization-llm';
import type { PrimeVideoMovieDetails } from '../services/prime-video-scraper';

// Mock the entire movie-normalization-llm module
const mockNormalizeMovieData = jest.fn();
const mockNormalizeMoviesBatch = jest.fn();

jest.mock('../services/movie-normalization-llm', () => ({
  normalizeMovieData: mockNormalizeMovieData,
  normalizeMoviesBatch: mockNormalizeMoviesBatch,
}));

describe('Movie Normalization LLM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeMovieData', () => {
    it('should normalize Prime Video movie data using LLM', async () => {
      const mockMovieDetails: PrimeVideoMovieDetails = {
        title: 'The Matrix (1999)',
        url: 'https://www.primevideo.com/movie/matrix',
        year: 1999,
        description: 'A computer programmer discovers reality is a simulation.',
        rawHtml: '<html><body><h1>The Matrix</h1><p>Sci-fi action</p></body></html>',
      };

      const expectedResult = {
        title: 'The Matrix',
        year: 1999,
        genre: ['Science Fiction', 'Action'],
        rating: 8.7,
        director: 'The Wachowskis',
        description: 'A computer programmer discovers reality is a simulation.',
        familyRating: 'R',
        themes: ['Virtual reality', 'Philosophical questions', 'Action sequences'],
      };

      mockNormalizeMovieData.mockResolvedValueOnce(expectedResult);

      const result = await normalizeMovieData(mockMovieDetails);

      expect(mockNormalizeMovieData).toHaveBeenCalledWith(mockMovieDetails);
      expect(result).toEqual(expectedResult);
    });

    it('should handle LLM parsing errors with fallback', async () => {
      const mockMovieDetails: PrimeVideoMovieDetails = {
        title: 'Unknown Movie (2024)',
        url: 'https://www.primevideo.com/movie/unknown',
        year: 2024,
        description: 'A test movie for error handling.',
        rawHtml: '<html><body><h1>Unknown Movie</h1></body></html>',
      };

      const fallbackResult = {
        title: 'Unknown Movie',
        year: 2024,
        genre: ['Drama'],
        rating: 7.0,
        director: 'Unknown Director',
        description: 'A test movie for error handling.',
        familyRating: 'PG-13',
        themes: ['Entertainment'],
      };

      mockNormalizeMovieData.mockResolvedValueOnce(fallbackResult);

      const result = await normalizeMovieData(mockMovieDetails);

      expect(result.title).toBe('Unknown Movie');
      expect(result.year).toBe(2024);
      expect(result.genre).toEqual(['Drama']);
      expect(result.rating).toBe(7.0);
      expect(result.director).toBe('Unknown Director');
      expect(result.familyRating).toBe('PG-13');
    });

    it('should handle LLM service errors with fallback', async () => {
      const mockMovieDetails: PrimeVideoMovieDetails = {
        title: 'Error Movie',
        url: 'https://www.primevideo.com/movie/error',
        description: 'A test movie for error handling.',
        rawHtml: '',
      };

      const fallbackResult = {
        title: 'Error Movie',
        year: 2024,
        genre: ['Drama'],
        rating: 7.0,
        director: 'Unknown Director',
        description: 'A test movie for error handling.',
        familyRating: 'PG-13',
        themes: ['Entertainment'],
      };

      mockNormalizeMovieData.mockResolvedValueOnce(fallbackResult);

      const result = await normalizeMovieData(mockMovieDetails);

      // Should return fallback data
      expect(result.title).toBe('Error Movie');
      expect(result.year).toBe(2024); // Current year fallback
      expect(result.genre).toEqual(['Drama']);
      expect(result.rating).toBe(7.0);
      expect(result.director).toBe('Unknown Director');
      expect(result.description).toBe('A test movie for error handling.');
    });

    it('should extract year from title when not provided separately', async () => {
      const mockMovieDetails: PrimeVideoMovieDetails = {
        title: 'Inception (2010)',
        url: 'https://www.primevideo.com/movie/inception',
        description: 'A thief who steals corporate secrets through dream-sharing technology.',
        rawHtml: '<html><body><h1>Inception</h1></body></html>',
      };

      const expectedResult = {
        title: 'Inception',
        year: 2010,
        genre: ['Science Fiction', 'Thriller'],
        rating: 8.8,
        director: 'Christopher Nolan',
        description: 'A thief who steals corporate secrets through dream-sharing technology.',
        familyRating: 'PG-13',
        themes: ['Dreams', 'Reality vs imagination', 'Heist'],
      };

      mockNormalizeMovieData.mockResolvedValueOnce(expectedResult);

      const result = await normalizeMovieData(mockMovieDetails);

      expect(result.title).toBe('Inception');
      expect(result.year).toBe(2010);
    });
  });

  describe('normalizeMoviesBatch', () => {
    it('should normalize multiple movies with rate limiting', async () => {
      const mockMovieDetailsList: PrimeVideoMovieDetails[] = [
        {
          title: 'Movie 1',
          url: 'https://www.primevideo.com/movie/1',
          year: 2021,
          description: 'First test movie',
          rawHtml: '<html><body><h1>Movie 1</h1></body></html>',
        },
        {
          title: 'Movie 2',
          url: 'https://www.primevideo.com/movie/2',
          year: 2022,
          description: 'Second test movie',
          rawHtml: '<html><body><h1>Movie 2</h1></body></html>',
        },
      ];

      const expectedResults = [
        {
          title: 'Movie 1',
          year: 2021,
          genre: ['Drama'],
          rating: 7.5,
          director: 'Director 1',
          description: 'First test movie',
          familyRating: 'PG-13',
          themes: ['Test theme'],
        },
        {
          title: 'Movie 2',
          year: 2022,
          genre: ['Comedy'],
          rating: 8.0,
          director: 'Director 2',
          description: 'Second test movie',
          familyRating: 'PG',
          themes: ['Humor'],
        },
      ];

      mockNormalizeMoviesBatch.mockResolvedValueOnce(expectedResults);

      const result = await normalizeMoviesBatch(mockMovieDetailsList);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Movie 1');
      expect(result[1].title).toBe('Movie 2');
      expect(mockNormalizeMoviesBatch).toHaveBeenCalledWith(mockMovieDetailsList);
    });

    it('should continue processing even if some movies fail normalization', async () => {
      const mockMovieDetailsList: PrimeVideoMovieDetails[] = [
        {
          title: 'Good Movie',
          url: 'https://www.primevideo.com/movie/good',
          year: 2021,
          description: 'A movie that will normalize successfully',
          rawHtml: '<html><body><h1>Good Movie</h1></body></html>',
        },
        {
          title: 'Bad Movie',
          url: 'https://www.primevideo.com/movie/bad',
          year: 2022,
          description: 'A movie that will fail normalization',
          rawHtml: '<html><body><h1>Bad Movie</h1></body></html>',
        },
      ];

      const expectedResults = [
        {
          title: 'Good Movie',
          year: 2021,
          genre: ['Drama'],
          rating: 8.0,
          director: 'Good Director',
          description: 'A movie that will normalize successfully',
          familyRating: 'PG-13',
          themes: ['Success'],
        },
      ];

      mockNormalizeMoviesBatch.mockResolvedValueOnce(expectedResults);

      const result = await normalizeMoviesBatch(mockMovieDetailsList);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Good Movie');
    });

    it('should handle empty input gracefully', async () => {
      mockNormalizeMoviesBatch.mockResolvedValueOnce([]);

      const result = await normalizeMoviesBatch([]);

      expect(result).toHaveLength(0);
      expect(mockNormalizeMoviesBatch).toHaveBeenCalledWith([]);
    });
  });
});
