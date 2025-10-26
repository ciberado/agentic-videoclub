import { runVideoRecommendationAgent } from '../index';

describe('Video Recommendation Agent Integration Tests', () => {
  test('should execute without errors and return a result', async () => {
    const userInput = "I'm looking for some action movies for adults";
    
    // Just test that the function executes without throwing
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  }, 30000); // 30 second timeout for the full agent flow

  test('should handle family-friendly input', async () => {
    const userInput = "I need family movies for movie night with kids";
    
    // Test that family input is processed without errors
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  }, 30000);

  test('should handle sci-fi specific requests', async () => {
    const userInput = "I want intelligent science fiction movies";
    
    // Test that specific requests are processed without errors
    const result = await runVideoRecommendationAgent(userInput);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  }, 30000);
});