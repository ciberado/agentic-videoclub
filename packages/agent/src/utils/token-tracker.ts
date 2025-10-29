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
      operation
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
      operations: [...this.usage]
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

export { TokenTracker, globalTokenTracker };