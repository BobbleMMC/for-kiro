import { useState, useRef, useEffect, type FC } from 'react';
import { Send, Settings, Trash2, Bot, User, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { aiService, type AIProvider, type AIMessage, type AIConfig, PROVIDER_CONFIG } from '../../services/ai';

interface AIChatProps {
  onCodeGenerated?: (code: string, language: string) => void;
}

export const AIChat: FC<AIChatProps> = ({ onCodeGenerated }) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AIConfig>(aiService.getConfig());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    const userMsg: AIMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await aiService.chat(userMessage);

      const assistantMsg: AIMessage = {
        id: `msg_${Date.now()}_resp`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        tokens: response.tokens.total,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Check if response contains code and notify parent
      const codeMatch = response.content.match(/```(?:java|json|gradle)\n([\s\S]*?)```/);
      if (codeMatch && onCodeGenerated) {
        const langMatch = response.content.match(/```(java|json|gradle)/);
        onCodeGenerated(codeMatch[1].trim(), langMatch?.[1] || 'java');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    aiService.clearHistory();
    setError(null);
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSettings = () => {
    aiService.setProvider(config.provider);
    aiService.setApiKey(config.apiKey);
    aiService.setModel(config.model);
    aiService.setTemperature(config.temperature);
    aiService.setMaxTokens(config.maxTokens);
    if (config.systemPrompt) {
      aiService.setSystemPrompt(config.systemPrompt);
    }
    setShowSettings(false);
  };

  const handleProviderChange = (provider: AIProvider) => {
    const newModel = PROVIDER_CONFIG[provider].defaultModel;
    setConfig({ ...config, provider, model: newModel });
  };

  const renderMessage = (msg: AIMessage) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';

    if (isSystem) return null;

    return (
      <div
        key={msg.id}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-white" />
          </div>
        )}

        <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
            }`}
          >
            {renderContent(msg.content)}
          </div>

          {/* Message metadata */}
          <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${isUser ? 'justify-end' : ''}`}>
            {msg.provider && (
              <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] uppercase font-semibold">
                {msg.provider}
              </span>
            )}
            {msg.tokens && <span>{msg.tokens} tokens</span>}
            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            {!isUser && (
              <button
                onClick={() => handleCopy(msg.content, msg.id)}
                className="hover:text-blue-500 transition"
              >
                {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
              </button>
            )}
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
        )}
      </div>
    );
  };

  const renderContent = (content: string) => {
    // Split content into text and code blocks
    const parts = content.split(/(```[\s\S]*?```)/);

    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const langMatch = part.match(/```(\w+)?\n/);
        const lang = langMatch?.[1] || 'code';
        const code = part.replace(/```\w*\n?/, '').replace(/```$/, '').trim();

        return (
          <div key={idx} className="my-2 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5">
              <span className="text-xs text-gray-400 font-mono">{lang}</span>
              <div className="flex gap-2">
                {onCodeGenerated && (
                  <button
                    onClick={() => onCodeGenerated(code, lang)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Use Code
                  </button>
                )}
                <button
                  onClick={() => handleCopy(code, `code_${idx}`)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  {copiedId === `code_${idx}` ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-3 text-xs overflow-x-auto font-mono">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Render markdown-style formatting
      return (
        <span key={idx} className="whitespace-pre-wrap text-sm">
          {part.split('\n').map((line, i) => {
            // Bold
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Inline code
            const withCode = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">$1</code>');
            return (
              <span key={i}>
                <span dangerouslySetInnerHTML={{ __html: withCode }} />
                {i < part.split('\n').length - 1 && <br />}
              </span>
            );
          })}
        </span>
      );
    });
  };

  // Quick prompts
  const quickPrompts = [
    '🧱 Create a custom ore block with drops',
    '⚔️ Generate a sword with special abilities',
    '🐉 Create a boss entity with phases',
    '🧪 Generate a potion effect',
    '📦 Create a crafting recipe for my item',
    '🌍 Generate a custom biome',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-500" />
          <h3 className="font-semibold">AI Assistant</h3>
          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
            {config.provider === 'deepseek' ? 'DeepSeek' : 'Gemini'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClearChat} size="sm" variant="outline">
            <Trash2 size={14} className="mr-1" />
            Clear
          </Button>
          <Button onClick={() => setShowSettings(!showSettings)} size="sm" variant="outline">
            <Settings size={14} className="mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="m-4 p-4 border-2 border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold mb-4">AI Configuration</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <select
                  value={config.provider}
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                >
                  {PROVIDER_CONFIG[config.provider].models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
                placeholder={config.provider === 'deepseek' ? 'sk-...' : 'AIza...'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Temperature ({config.temperature})
                </label>
                <input
                  type="range"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                  min="0" max="2" step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Tokens</label>
                <input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                  min="100" max="16384"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} size="sm">Save Settings</Button>
              <Button onClick={() => setShowSettings(false)} size="sm" variant="outline">Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot size={48} className="text-purple-300 dark:text-purple-700 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Minecraft Mod AI Assistant</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              Ask me anything about Minecraft modding! I can generate code, create recipes,
              design entities, and help with any mod development questions.
            </p>

            {/* Quick Prompts */}
            <div className="grid grid-cols-2 gap-2 max-w-lg">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(prompt.replace(/^[^\s]+\s/, ''));
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-sm text-left transition border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-purple-500" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">⚠️ {error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about Minecraft modding... (Shift+Enter for new line)"
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-xl resize-none text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end rounded-xl bg-purple-600 hover:bg-purple-700"
          >
            <Send size={18} />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {config.provider === 'deepseek' ? '🤖 DeepSeek' : '✨ Gemini'} •
          Model: {config.model} •
          {!config.apiKey && <span className="text-orange-500"> ⚠️ API key not set</span>}
        </p>
      </div>
    </div>
  );
};
