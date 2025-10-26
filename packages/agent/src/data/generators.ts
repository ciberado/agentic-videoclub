/**
 * Utility functions for generating fake data and simulating delays
 * Used for educational purposes to demonstrate realistic agent behavior
 */

/**
 * Simulate an async delay (e.g., for HTTP requests or LLM processing)
 */
export async function simulateDelay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Generate a fake URL for movie database API calls
 */
export function generateFakeApiUrl(endpoint: string, params?: Record<string, string>): string {
  const baseUrl = 'https://fake-movie-database.com';
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  return `${baseUrl}${endpoint}${queryString}`;
}

/**
 * Generate fake HTTP response metadata
 */
export function generateFakeHttpResponse(url: string, responseSize: number) {
  return {
    url,
    statusCode: 200,
    responseSize,
  };
}