/**
 * Token usage tracking utility
 * Provides a simple way to track token consumption across the entire workflow
 */

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
  operation: string;
}

class TokenTracker {
  private usage: TokenUsage[] = [];
  private currentTotal = 0;

  /**
   * Add token usage for an operation
   */
  addUsage(inputTokens: number, outputTokens: number, operation: string = 'llm-call'): void {
    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      timestamp: new Date(),
      operation,
    };

    this.usage.push(usage);
    this.currentTotal += inputTokens + outputTokens;
  }

  /**
   * Get total tokens consumed
   */
  getTotalTokens(): number {
    return this.currentTotal;
  }

  /**
   * Get detailed usage breakdown
   */
  getUsageBreakdown(): {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    operationCount: number;
    operations: TokenUsage[];
  } {
    const inputTokens = this.usage.reduce((sum, u) => sum + u.inputTokens, 0);
    const outputTokens = this.usage.reduce((sum, u) => sum + u.outputTokens, 0);

    return {
      totalTokens: this.currentTotal,
      inputTokens,
      outputTokens,
      operationCount: this.usage.length,
      operations: [...this.usage],
    };
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.usage = [];
    this.currentTotal = 0;
  }
}

// Global instance for the current workflow
const globalTokenTracker = new TokenTracker();

/**
 * Extract token usage from LLM response metadata with fallback to character-based approximation
 * 
 * AWS Bedrock responses include usage_metadata with input_tokens and output_tokens.
 * If metadata is not available, falls back to character count divided by 4 (typical approximation).
 * 
 * @param response - The LLM response object from ChatBedrockConverse
 * @param promptText - The prompt text (used for fallback calculation)
 * @param responseText - The response text (used for fallback calculation)
 * @returns Object with inputTokens and outputTokens
 */
function extractTokenUsage(
  response: any,
  promptText: string,
  responseText: string,
): { inputTokens: number; outputTokens: number } {
  // Try to extract from usage_metadata (LangChain format)
  if (response.usage_metadata) {
    return {
      inputTokens: response.usage_metadata.input_tokens ?? Math.ceil(promptText.length / 4),
      outputTokens: response.usage_metadata.output_tokens ?? Math.ceil(responseText.length / 4),
    };
  }

  // Fallback to character-based approximation (1 token ≈ 4 characters)
  return {
    inputTokens: Math.ceil(promptText.length / 4),
    outputTokens: Math.ceil(responseText.length / 4),
  };
}

export { TokenTracker, globalTokenTracker, extractTokenUsage };
