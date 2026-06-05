/**
 * AI Service - DeepSeek & Gemini Integration
 * Provides unified AI capabilities for Minecraft Mod Generator
 */

// Types
export type AIProvider = 'deepseek' | 'gemini';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: AIProvider;
  model?: string;
  tokens?: number;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: AIProvider;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: string;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

export interface AICodeGenRequest {
  type: 'block' | 'item' | 'entity' | 'recipe' | 'biome' | 'dimension' | 'enchantment' | 'advancement' | 'event';
  name: string;
  description: string;
  properties?: Record<string, unknown>;
  language?: 'java' | 'json';
}

export interface AIModAdvice {
  category: 'optimization' | 'bug_fix' | 'feature' | 'best_practice' | 'security';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  code?: string;
}

// Provider configurations
const PROVIDER_CONFIG = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  },
};

// Default system prompt for Minecraft mod development
const DEFAULT_SYSTEM_PROMPT = `You are an expert Minecraft mod developer AI assistant. You help users create mods using Java (Forge/Fabric/NeoForge).

Your capabilities:
- Generate Java code for blocks, items, entities, enchantments, biomes, dimensions
- Create JSON configurations (recipes, advancements, loot tables, models)
- Provide optimization tips and best practices
- Debug common modding issues
- Explain Minecraft modding concepts

Always respond with well-formatted code when asked to generate something. Use proper Minecraft modding conventions and latest API patterns.`;

// AI Service Class
class AIService {
  private config: AIConfig;
  private conversationHistory: AIMessage[] = [];

  constructor() {
    this.config = {
      provider: 'deepseek',
      apiKey: '',
      model: PROVIDER_CONFIG.deepseek.defaultModel,
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    };
  }

  // Configuration
  setProvider(provider: AIProvider): void {
    this.config.provider = provider;
    this.config.model = PROVIDER_CONFIG[provider].defaultModel;
  }

  setApiKey(key: string): void {
    this.config.apiKey = key;
  }

  setModel(model: string): void {
    this.config.model = model;
  }

  setTemperature(temp: number): void {
    this.config.temperature = Math.max(0, Math.min(2, temp));
  }

  setMaxTokens(tokens: number): void {
    this.config.maxTokens = Math.max(100, Math.min(16384, tokens));
  }

  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  getAvailableModels(): string[] {
    return PROVIDER_CONFIG[this.config.provider].models;
  }

  getProviderConfig() {
    return PROVIDER_CONFIG;
  }

  // Conversation management
  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  addMessage(message: AIMessage): void {
    this.conversationHistory.push(message);
  }

  // Main chat method
  async chat(userMessage: string): Promise<AIResponse> {
    if (!this.config.apiKey) {
      throw new AIServiceError('API_KEY_MISSING', 'Please set your API key in settings');
    }

    const userMsg: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(userMsg);

    try {
      const response = this.config.provider === 'deepseek'
        ? await this.callDeepSeek(userMessage)
        : await this.callGemini(userMessage);

      const assistantMsg: AIMessage = {
        id: `msg_${Date.now()}_response`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        tokens: response.tokens.total,
      };
      this.conversationHistory.push(assistantMsg);

      return response;
    } catch (error) {
      // Remove failed user message
      this.conversationHistory.pop();
      throw error;
    }
  }

  // DeepSeek API call
  private async callDeepSeek(_message: string): Promise<AIResponse> {
    const messages = [
      { role: 'system', content: this.config.systemPrompt },
      ...this.conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(`${PROVIDER_CONFIG.deepseek.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new AIServiceError(
        'DEEPSEEK_ERROR',
        error.error?.message || `DeepSeek API error: ${response.status}`
      );
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      model: data.model,
      provider: 'deepseek',
      tokens: {
        prompt: data.usage?.prompt_tokens || 0,
        completion: data.usage?.completion_tokens || 0,
        total: data.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
    };
  }

  // Gemini API call
  private async callGemini(_message: string): Promise<AIResponse> {
    const contents = this.conversationHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Add system instruction
    const systemInstruction = {
      parts: [{ text: this.config.systemPrompt }],
    };

    const response = await fetch(
      `${PROVIDER_CONFIG.gemini.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction,
          contents,
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new AIServiceError(
        'GEMINI_ERROR',
        error.error?.message || `Gemini API error: ${response.status}`
      );
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts?.[0]?.text) {
      throw new AIServiceError('GEMINI_EMPTY', 'Gemini returned empty response');
    }

    return {
      content: candidate.content.parts[0].text,
      model: this.config.model,
      provider: 'gemini',
      tokens: {
        prompt: data.usageMetadata?.promptTokenCount || 0,
        completion: data.usageMetadata?.candidatesTokenCount || 0,
        total: data.usageMetadata?.totalTokenCount || 0,
      },
      finishReason: candidate.finishReason || 'STOP',
    };
  }

  // Streaming chat (DeepSeek)
  async *chatStream(userMessage: string): AsyncGenerator<AIStreamChunk> {
    if (!this.config.apiKey) {
      throw new AIServiceError('API_KEY_MISSING', 'Please set your API key');
    }

    const userMsg: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    this.conversationHistory.push(userMsg);

    if (this.config.provider === 'deepseek') {
      yield* this.streamDeepSeek(userMessage);
    } else {
      // Gemini doesn't support streaming the same way, fallback to full response
      const response = await this.callGemini(userMessage);
      yield { content: response.content, done: true };
    }
  }

  private async *streamDeepSeek(_message: string): AsyncGenerator<AIStreamChunk> {
    const messages = [
      { role: 'system', content: this.config.systemPrompt },
      ...this.conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(`${PROVIDER_CONFIG.deepseek.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new AIServiceError('DEEPSEEK_STREAM_ERROR', `Stream error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIServiceError('STREAM_ERROR', 'Failed to get response stream');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          break;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            yield { content, done: false };
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Add assistant message to history
    this.conversationHistory.push({
      id: `msg_${Date.now()}_stream`,
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString(),
      provider: 'deepseek',
      model: this.config.model,
    });
  }

  // Code Generation
  async generateCode(request: AICodeGenRequest): Promise<string> {
    const prompt = this.buildCodeGenPrompt(request);
    const response = await this.chat(prompt);
    return this.extractCode(response.content);
  }

  private buildCodeGenPrompt(request: AICodeGenRequest): string {
    const lang = request.language || 'java';
    let prompt = `Generate ${lang === 'java' ? 'Java' : 'JSON'} code for a Minecraft ${request.type}.\n\n`;
    prompt += `Name: ${request.name}\n`;
    prompt += `Description: ${request.description}\n`;

    if (request.properties) {
      prompt += `\nProperties:\n`;
      Object.entries(request.properties).forEach(([key, value]) => {
        prompt += `- ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    prompt += `\nGenerate clean, production-ready ${lang} code. Use latest Minecraft modding patterns.`;
    prompt += `\nOnly output the code, wrapped in a \`\`\`${lang} code block.`;

    return prompt;
  }

  private extractCode(response: string): string {
    const codeBlockRegex = /```(?:java|json|gradle)?\n([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);
    return match ? match[1].trim() : response.trim();
  }

  // Mod Advisor
  async getModAdvice(context: string): Promise<AIModAdvice[]> {
    const prompt = `Analyze the following Minecraft mod context and provide improvement suggestions. Return them as a JSON array with objects containing: category, title, description, priority, and optional code.

Context:
${context}

Categories: optimization, bug_fix, feature, best_practice, security
Priorities: high, medium, low

Return ONLY a valid JSON array.`;

    const response = await this.chat(prompt);

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AIModAdvice[];
      }
    } catch {
      // If parsing fails, return a single advice from the response
    }

    return [{
      category: 'best_practice',
      title: 'AI Suggestion',
      description: response.content,
      priority: 'medium',
    }];
  }
}

// Error class
export class AIServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
  }
}

// Singleton instance
export const aiService = new AIService();

// Export constants
export { PROVIDER_CONFIG, DEFAULT_SYSTEM_PROMPT };
