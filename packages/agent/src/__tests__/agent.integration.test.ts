import { runVideoRecommendationAgent } from '../index';

// Skip integration tests if running in CI or if AWS credentials are not available
const shouldSkipIntegration = process.env.CI === 'true' || 
  !process.env.AWS_ACCESS_KEY_ID || 
  !process.env.AWS_SECRET_ACCESS_KEY;

describe('Video Recommendation Agent Integration Tests', () => {
  beforeAll(() => {
    if (shouldSkipIntegration) {
      console.log('⏭️ Skipping integration tests - missing AWS credentials or running in CI');
    }
  });

  (shouldSkipIntegration ? test.skip : test)('should execute without errors and return a result', async () => {
    const userInput = "I'm looking for some action movies for adults";
    
    // Just test that the function executes without throwing
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.finalRecommendations).toBeDefined();
    expect(Array.isArray(result.finalRecommendations)).toBe(true);
  }, 120000); // 2 minute timeout for the full agent flow with real API calls

  (shouldSkipIntegration ? test.skip : test)('should handle family-friendly input', async () => {
    const userInput = "I need family movies for movie night with kids";
    
    // Test that family input is processed without errors
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.finalRecommendations).toBeDefined();
    expect(Array.isArray(result.finalRecommendations)).toBe(true);
  }, 120000);

  (shouldSkipIntegration ? test.skip : test)('should handle sci-fi specific requests', async () => {
    const userInput = "I want intelligent science fiction movies";
    
    // Test that specific requests are processed without errors
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.finalRecommendations).toBeDefined();
    expect(Array.isArray(result.finalRecommendations)).toBe(true);
  }, 120000);
});