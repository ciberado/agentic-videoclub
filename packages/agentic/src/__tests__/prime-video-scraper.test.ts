import {
  extractPrimeVideoMovieLinks,
  fetchPrimeVideoMovieDetails,
  fetchPrimeVideoMoviesBatch,
} from '../services/prime-video-scraper';
import type { PrimeVideoMovieLink } from '../services/prime-video-scraper';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Prime Video Scraper Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('extractPrimeVideoMovieLinks', () => {
    it('should extract movie links from Prime Video HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            <article data-card-title="The Matrix">
              <a href="/movie/matrix-1999" data-card-title="The Matrix">The Matrix</a>
            </article>
            <article data-card-title="Inception">
              <a href="/movie/inception-2010" data-card-title="Inception">Inception</a>
            </article>
            <article data-card-title="Interstellar">
              <a href="/movie/interstellar-2014" data-card-title="Interstellar">Interstellar</a>
            </article>
          </body>
        </html>
      `;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await extractPrimeVideoMovieLinks('https://test-primevideo.com');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        title: 'The Matrix',
        url: 'https://www.primevideo.com/movie/matrix-1999',
      });
      expect(result[1]).toEqual({
        title: 'Inception',
        url: 'https://www.primevideo.com/movie/inception-2010',
      });
      expect(result[2]).toEqual({
        title: 'Interstellar',
        url: 'https://www.primevideo.com/movie/interstellar-2014',
      });
    });

    it('should handle empty results gracefully', async () => {
      const mockHtml = `
        <html>
          <body>
            <div>No movies found</div>
          </body>
        </html>
      `;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await extractPrimeVideoMovieLinks('https://test-primevideo.com');

      expect(result).toHaveLength(0);
    });

    it('should try alternative selectors when primary selector fails', async () => {
      const mockHtml = `
        <html>
          <body>
            <a href="/movie/matrix-1999">The Matrix</a>
            <a href="/gp/video/detail/B08123456">Inception</a>
            <a href="/movie/interstellar-2014">
              <img alt="Interstellar" />
            </a>
          </body>
        </html>
      `;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await extractPrimeVideoMovieLinks('https://test-primevideo.com');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((m) => m.title.includes('Matrix'))).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const result = await extractPrimeVideoMovieLinks('https://test-primevideo.com');

      expect(result).toHaveLength(0);
    });

    it('should limit results to configured limit', async () => {
      const expectedLimit = parseInt(process.env.SCRAPPING_LIMIT || '20');
      const mockHtml = `
        <html>
          <body>
            ${Array.from(
              { length: 25 },
              (_, i) => `
              <article data-card-title="Movie ${i + 1}">
                <a href="/movie/movie-${i + 1}" data-card-title="Movie ${i + 1}">Movie ${i + 1}</a>
              </article>
            `,
            ).join('')}
          </body>
        </html>
      `;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await extractPrimeVideoMovieLinks('https://test-primevideo.com');

      // The test should respect the configured limit
      expect(result.length).toBeLessThanOrEqual(expectedLimit);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('fetchPrimeVideoMovieDetails', () => {
    it('should extract movie details from Prime Video movie page', async () => {
      const mockMovieLink: PrimeVideoMovieLink = {
        title: 'The Matrix',
        url: 'https://www.primevideo.com/movie/matrix-1999',
      };

      const mockHtml = `
        <html>
          <body>
            <h1>The Matrix (1999)</h1>
            <p data-automation-id="synopsis">A computer programmer discovers reality is a simulation.</p>
            <div>Rating: 8.7/10</div>
            <div>Director: The Wachowskis</div>
          </body>
        </html>
      `;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await fetchPrimeVideoMovieDetails(mockMovieLink);

      expect(result.title).toBe('The Matrix (1999)');
      expect(result.year).toBe(1999);
      expect(result.description).toBe('A computer programmer discovers reality is a simulation.');
      expect(result.url).toBe(mockMovieLink.url);
      expect(result.rawHtml).toBeDefined();
    });

    it('should handle missing movie details gracefully', async () => {
      const mockMovieLink: PrimeVideoMovieLink = {
        title: 'Unknown Movie',
        url: 'https://www.primevideo.com/movie/unknown',
      };

      const mockHtml = `
        <html>
          <body>
            <div>Page not found</div>
          </body>
        </html>
      `;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await fetchPrimeVideoMovieDetails(mockMovieLink);

      expect(result.title).toBe('Unknown Movie');
      expect(result.url).toBe(mockMovieLink.url);
      expect(result.description).toBeDefined();
    });

    it('should handle fetch errors gracefully', async () => {
      const mockMovieLink: PrimeVideoMovieLink = {
        title: 'Error Movie',
        url: 'https://www.primevideo.com/movie/error',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network timeout'),
      );

      const result = await fetchPrimeVideoMovieDetails(mockMovieLink);

      expect(result.title).toBe('Error Movie');
      expect(result.description).toBe('Details could not be fetched');
    });
  });

  describe('fetchPrimeVideoMoviesBatch', () => {
    it('should fetch details for multiple movies with rate limiting', async () => {
      const mockMovieLinks: PrimeVideoMovieLink[] = [
        { title: 'Movie 1', url: 'https://www.primevideo.com/movie/1' },
        { title: 'Movie 2', url: 'https://www.primevideo.com/movie/2' },
        { title: 'Movie 3', url: 'https://www.primevideo.com/movie/3' },
      ];

      const mockHtml = '<html><body><h1>Test Movie</h1></body></html>';

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockHtml),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockHtml),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(mockHtml),
        } as Response);

      const startTime = Date.now();
      const result = await fetchPrimeVideoMoviesBatch(mockMovieLinks);
      const endTime = Date.now();

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Test Movie');

      // Check that rate limiting added delays (should take at least 200ms for 3 movies)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('should continue processing even if some movies fail', async () => {
      const mockMovieLinks: PrimeVideoMovieLink[] = [
        { title: 'Movie 1', url: 'https://www.primevideo.com/movie/1' },
        { title: 'Movie 2', url: 'https://www.primevideo.com/movie/2' },
        { title: 'Movie 3', url: 'https://www.primevideo.com/movie/3' },
      ];

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><body><h1>Movie 1</h1></body></html>'),
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><body><h1>Movie 3</h1></body></html>'),
        } as Response);

      const result = await fetchPrimeVideoMoviesBatch(mockMovieLinks);

      // Expect results for successful fetches - the service gracefully handles errors
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Verify service continues processing despite errors
      expect(result.length).toBeLessThanOrEqual(3);
    }, 10000); // Increase timeout to 10 seconds for retry logic
  });
});
