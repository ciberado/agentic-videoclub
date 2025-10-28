import { runVideoRecommendationAgent } from '../index';

// Skip integration tests by default unless explicitly requested
const shouldSkipIntegration = process.env.CI === 'true' || 
  !process.env.AWS_ACCESS_KEY_ID || 
  !process.env.AWS_SECRET_ACCESS_KEY ||
  process.env.RUN_INTEGRATION_TESTS !== 'true';

// Force test environment limits for integration tests
process.env.NODE_ENV = 'test';
process.env.TEST_MOVIE_LIMIT = '3';
process.env.SCRAPPING_LIMIT = '5';

describe('Video Recommendation Agent Integration Tests', () => {
  beforeAll(() => {
    if (shouldSkipIntegration) {
      console.log('⏭️ Skipping integration tests - missing AWS credentials or running in CI');
    }
  });

  (shouldSkipIntegration ? test.skip : test)('should execute without errors and return a result', async () => {
    console.log('🧪 Starting integration test with optimizations:', {
      NODE_ENV: process.env.NODE_ENV,
      TEST_MOVIE_LIMIT: process.env.TEST_MOVIE_LIMIT,
      SCRAPPING_LIMIT: process.env.SCRAPPING_LIMIT
    });
    
    const userInput = "I'm looking for some action movies for adults";
    
    // Just test that the function executes without throwing
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.finalRecommendations).toBeDefined();
    expect(Array.isArray(result.finalRecommendations)).toBe(true);
  }, 30000); // Reduced timeout - should be much faster with optimizations

  (shouldSkipIntegration ? test.skip : test)('should handle family-friendly input', async () => {
    const userInput = "I need family movies for movie night with kids";
    
    // Test that family input is processed without errors
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.finalRecommendations).toBeDefined();
    expect(Array.isArray(result.finalRecommendations)).toBe(true);
  }, 30000);

  (shouldSkipIntegration ? test.skip : test)('should handle sci-fi specific requests', async () => {
    const userInput = "I want intelligent science fiction movies";
    
    // Test that specific requests are processed without errors
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.finalRecommendations).toBeDefined();
    expect(Array.isArray(result.finalRecommendations)).toBe(true);
  }, 30000);
});