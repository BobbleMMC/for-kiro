/**
 * AI Token Counter Service
 * Tracks and estimates token usage for AI API calls
 */

export interface TokenUsage {
  id: string;
  timestamp: number;
  provider: 'deepseek' | 'gemini';
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost?: number;
  promptHash?: string; // For deduplication
}

export interface TokenStats {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedTotalCost: number;
  avgTokensPerRequest: number;
  requestCount: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
}

export interface ModelPricing {
  provider: string;
  model: string;
  inputCost: number; // Cost per 1M tokens
  outputCost: number; // Cost per 1M tokens
}

/**
 * Token Counter Service
 * Tracks AI API token usage and costs
 */
class AITokenCounter {
  private tokenHistory: TokenUsage[] = [];
  private modelPricing: Map<string, ModelPricing> = new Map();
  private maxHistorySize = 1000;

  constructor() {
    this.initializePricing();
  }

  /**
   * Initialize model pricing data
   */
  private initializePricing(): void {
    const pricingData: ModelPricing[] = [
      // DeepSeek
      { provider: 'deepseek', model: 'deepseek-chat', inputCost: 0.14, outputCost: 0.28 },
      { provider: 'deepseek', model: 'deepseek-coder', inputCost: 0.14, outputCost: 0.28 },

      // Gemini
      { provider: 'gemini', model: 'gemini-1.5-flash', inputCost: 0.075, outputCost: 0.3 },
      { provider: 'gemini', model: 'gemini-1.5-pro', inputCost: 3.5, outputCost: 10.5 },
      { provider: 'gemini', model: 'gemini-2.0-flash', inputCost: 0.1, outputCost: 0.4 },
    ];

    pricingData.forEach(pricing => {
      this.modelPricing.set(`${pricing.provider}:${pricing.model}`, pricing);
    });
  }

  /**
   * Estimate tokens for text (rough approximation)
   * 1 token ≈ 4 characters
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Record token usage from an API call
   */
  recordUsage(
    provider: 'deepseek' | 'gemini',
    model: string,
    inputTokens: number,
    outputTokens: number
  ): TokenUsage {
    const totalTokens = inputTokens + outputTokens;
    const pricingKey = `${provider}:${model}`;
    const pricing = this.modelPricing.get(pricingKey);

    let estimatedCost = 0;
    if (pricing) {
      estimatedCost =
        (inputTokens / 1000000) * pricing.inputCost +
        (outputTokens / 1000000) * pricing.outputCost;
    }

    const usage: TokenUsage = {
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
    };

    this.tokenHistory.push(usage);

    // Maintain max history size
    if (this.tokenHistory.length > this.maxHistorySize) {
      this.tokenHistory = this.tokenHistory.slice(-this.maxHistorySize);
    }

    return usage;
  }

  /**
   * Record usage with text (will estimate tokens)
   */
  recordUsageFromText(
    provider: 'deepseek' | 'gemini',
    model: string,
    inputText: string,
    outputText: string
  ): TokenUsage {
    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);
    return this.recordUsage(provider, model, inputTokens, outputTokens);
  }

  /**
   * Get all usage history
   */
  getHistory(): TokenUsage[] {
    return [...this.tokenHistory];
  }

  /**
   * Get usage history for a specific provider
   */
  getHistoryByProvider(provider: string): TokenUsage[] {
    return this.tokenHistory.filter(u => u.provider === provider);
  }

  /**
   * Get usage history for a specific model
   */
  getHistoryByModel(model: string): TokenUsage[] {
    return this.tokenHistory.filter(u => u.model === model);
  }

  /**
   * Get usage history within a time range (in milliseconds)
   */
  getHistoryByTimeRange(startTime: number, endTime: number): TokenUsage[] {
    return this.tokenHistory.filter(u => u.timestamp >= startTime && u.timestamp <= endTime);
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): TokenStats {
    const totalTokens = this.tokenHistory.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalInputTokens = this.tokenHistory.reduce((sum, u) => sum + u.inputTokens, 0);
    const totalOutputTokens = this.tokenHistory.reduce((sum, u) => sum + u.outputTokens, 0);
    const estimatedTotalCost = this.tokenHistory.reduce((sum, u) => sum + (u.estimatedCost || 0), 0);
    const requestCount = this.tokenHistory.length;

    const costByProvider: Record<string, number> = {};
    const costByModel: Record<string, number> = {};

    this.tokenHistory.forEach(u => {
      if (!costByProvider[u.provider]) costByProvider[u.provider] = 0;
      if (!costByModel[u.model]) costByModel[u.model] = 0;

      costByProvider[u.provider] += u.estimatedCost || 0;
      costByModel[u.model] += u.estimatedCost || 0;
    });

    return {
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      estimatedTotalCost,
      avgTokensPerRequest: requestCount > 0 ? totalTokens / requestCount : 0,
      requestCount,
      costByProvider,
      costByModel,
    };
  }

  /**
   * Get statistics for last N days
   */
  getStatsForLastDays(days: number): TokenStats {
    const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = this.getHistoryByTimeRange(startTime, Date.now());

    const totalTokens = filtered.reduce((sum, u) => sum + u.totalTokens, 0);
    const totalInputTokens = filtered.reduce((sum, u) => sum + u.inputTokens, 0);
    const totalOutputTokens = filtered.reduce((sum, u) => sum + u.outputTokens, 0);
    const estimatedTotalCost = filtered.reduce((sum, u) => sum + (u.estimatedCost || 0), 0);
    const requestCount = filtered.length;

    const costByProvider: Record<string, number> = {};
    const costByModel: Record<string, number> = {};

    filtered.forEach(u => {
      if (!costByProvider[u.provider]) costByProvider[u.provider] = 0;
      if (!costByModel[u.model]) costByModel[u.model] = 0;

      costByProvider[u.provider] += u.estimatedCost || 0;
      costByModel[u.model] += u.estimatedCost || 0;
    });

    return {
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      estimatedTotalCost,
      avgTokensPerRequest: requestCount > 0 ? totalTokens / requestCount : 0,
      requestCount,
      costByProvider,
      costByModel,
    };
  }

  /**
   * Get pricing for a model
   */
  getPricing(provider: string, model: string): ModelPricing | undefined {
    return this.modelPricing.get(`${provider}:${model}`);
  }

  /**
   * Get all available models and their pricing
   */
  getAllPricing(): ModelPricing[] {
    return Array.from(this.modelPricing.values());
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.tokenHistory = [];
  }

  /**
   * Export history as CSV
   */
  exportAsCSV(): string {
    const headers = ['Timestamp', 'Provider', 'Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Estimated Cost'];
    const rows = this.tokenHistory.map(u => [
      new Date(u.timestamp).toISOString(),
      u.provider,
      u.model,
      u.inputTokens,
      u.outputTokens,
      u.totalTokens,
      u.estimatedCost?.toFixed(4),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  }

  /**
   * Download history as CSV file
   */
  downloadAsCSV(filename: string = 'token-usage.csv'): void {
    const csv = this.exportAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Estimate cost for a prompt
   */
  estimateCost(provider: string, model: string, inputText: string, outputText: string): number {
    const pricing = this.modelPricing.get(`${provider}:${model}`);
    if (!pricing) return 0;

    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);

    return (inputTokens / 1000000) * pricing.inputCost + (outputTokens / 1000000) * pricing.outputCost;
  }
}

/**
 * Singleton instance
 */
export const aiTokenCounter = new AITokenCounter();

export default AITokenCounter;
