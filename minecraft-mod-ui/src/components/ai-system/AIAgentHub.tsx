/**
 * AI Agent Hub — Multi-Agent System v2
 *
 * Six specialised assistants share a single underlying LLM (DeepSeek or
 * Gemini, configured via `aiService`). Each agent injects its own system
 * prompt so the same backend produces a focused persona.
 *
 * If the user has not yet entered an API key, the hub renders an inline
 * "Open AI settings" notice instead of a fake response, so it is obvious
 * that AI capability requires configuration.
 */
import { useState, useRef, useCallback, useEffect, type FC } from 'react';
import {
  Bot,
  Code,
  Bug,
  Gauge,
  Image,
  FileText,
  ArrowRightLeft,
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  X,
  Settings,
  History,
  Zap,
  KeyRound,
} from 'lucide-react';
import { aiService, AIServiceError } from '../../services/ai';
import { useProjectStore } from '../../stores/projectStore';

// ==================== Types ====================

type AgentType = 'copilot' | 'detective' | 'advisor' | 'generator' | 'docs' | 'migration';

interface Agent {
  id: AgentType;
  name: string;
  icon: typeof Bot;
  color: string;
  description: string;
  examples: string[];
  systemPrompt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent: AgentType;
  timestamp: Date;
  codeBlock?: string;
  isStreaming?: boolean;
}

// ==================== Agent Definitions ====================

const agents: Agent[] = [
  {
    id: 'copilot',
    name: 'Code Copilot',
    icon: Code,
    color: '#3b82f6',
    description: 'Intelligent code completion and node graph suggestions',
    examples: [
      'Create a block that drops diamonds when broken',
      'Add knockback to my sword item',
      'Generate a smelting recipe for custom ore',
    ],
    systemPrompt:
      'You are Code Copilot — an expert Minecraft mod developer specialising in Forge, Fabric, and NeoForge for Minecraft 1.20.x and 1.21.x. Generate clean, compileable Java code wrapped in ```java code blocks. Always include the `package`, `import`s, and registry hooks the user will need. Prefer modern API patterns (DeferredRegister for Forge, lambda registration for Fabric). Do NOT invent classes or methods that do not exist in the real Minecraft / loader APIs.',
  },
  {
    id: 'detective',
    name: 'Bug Detective',
    icon: Bug,
    color: '#ef4444',
    description: 'AI-powered error diagnosis and fix suggestions',
    examples: [
      'Why does my block not render?',
      'Fix NullPointerException in entity tick',
      'My recipe is not showing in crafting table',
    ],
    systemPrompt:
      'You are Bug Detective — a forensic Minecraft modding troubleshooter. When the user describes a bug, structure the answer as: 1) **Likely cause** (one paragraph), 2) **Concrete fix** with code or JSON snippets, 3) **Prevention tip**. Reference the exact file paths Minecraft expects (assets/<modid>/blockstates/, models/block/, etc.) when relevant. Be specific — never say "check your code" without telling the user what to check.',
  },
  {
    id: 'advisor',
    name: 'Performance Advisor',
    icon: Gauge,
    color: '#22c55e',
    description: 'Optimization tips and TPS improvement',
    examples: [
      'My mod causes TPS drops to 12',
      'Optimize entity spawning loop',
      'Is my event handler too heavy?',
    ],
    systemPrompt:
      'You are Performance Advisor — optimisation expert for Minecraft mods. Diagnose bottlenecks (TPS, memory, GC) and suggest targeted fixes ordered by expected impact. Quantify when possible (e.g. "O(n²) per tick → cache players every 5 ticks for ~80% drop in CPU time"). Recommend tools like Spark/JVM Flight Recorder for measurement. Always include a code snippet showing the optimised version when proposing a change.',
  },
  {
    id: 'generator',
    name: 'Asset Generator',
    icon: Image,
    color: '#a855f7',
    description: 'Generate textures and models from text prompts',
    examples: [
      'Create a 16x16 ruby ore texture',
      'Generate emerald sword pixel art',
      'Design a custom mob face texture',
    ],
    systemPrompt:
      'You are Asset Generator — Minecraft asset assistant. You cannot produce binary images, but you DO produce: 1) detailed pixel-art design briefs (palette, shading rules, edge highlights) the user can hand to an image AI or paint manually; 2) ready-to-paste model JSON (`assets/<modid>/models/...`); 3) blockstate JSON; 4) texture mapping diagrams using ASCII grids. Always specify the canvas size (16×16 default for blocks/items) and the file path the asset belongs at.',
  },
  {
    id: 'docs',
    name: 'Doc Writer',
    icon: FileText,
    color: '#f59e0b',
    description: 'Auto-generate README, wiki, and API docs',
    examples: [
      'Write README for my mod',
      'Document all custom blocks',
      'Generate changelog from commits',
    ],
    systemPrompt:
      'You are Doc Writer — produce clear, well-formatted Markdown documentation for Minecraft mods. Sections you commonly write: Overview, Features, Installation (Forge/Fabric specific instructions), Crafting Recipes (as Markdown tables), Configuration, FAQ, Changelog. Match the tone the project requests (formal, casual, beginner-friendly). Never invent features the user did not mention — ask if context is unclear.',
  },
  {
    id: 'migration',
    name: 'Migration Helper',
    icon: ArrowRightLeft,
    color: '#06b6d4',
    description: 'Convert between Forge/Fabric/NeoForge',
    examples: [
      'Convert this Forge event to Fabric',
      'Migrate from 1.19 to 1.20.4',
      'Port NeoForge mixin to Forge',
    ],
    systemPrompt:
      'You are Migration Helper — expert at translating mod code across loaders (Forge ↔ Fabric ↔ NeoForge ↔ Quilt) and across Minecraft versions (1.19 → 1.20 → 1.21). For each migration, show the original snippet, the converted snippet, and a bullet list of *Key changes*. Flag any constructs that have no direct equivalent (e.g. capabilities → data attachments) so the user knows where manual work is required.',
  },
];

// ==================== Component ====================

export const AIAgentHub: FC = () => {
  const [activeAgent, setActiveAgent] = useState<AgentType>('copilot');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => Boolean(aiService.getConfig().apiKey));
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentAgent = agents.find((a) => a.id === activeAgent)!;

  // Re-check API-key presence whenever the user reopens the hub or switches agents
  useEffect(() => {
    setHasApiKey(Boolean(aiService.getConfig().apiKey));
  }, [activeAgent]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    if (!aiService.getConfig().apiKey) {
      setHasApiKey(false);
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      agent: activeAgent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Swap the system prompt for the agent's specialty, then restore it.
    const previousPrompt = aiService.getConfig().systemPrompt;
    aiService.setSystemPrompt(currentAgent.systemPrompt);

    // Each agent owns its own conversation thread — clear shared history so
    // a previous Code Copilot exchange does not leak into Migration Helper.
    aiService.clearHistory();

    try {
      const response = await aiService.chat(userMsg.content);
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.content,
        agent: activeAgent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Surface a console line for transparency / debugging
      useProjectStore.getState().addConsoleMessage({
        id: `msg-${Date.now()}-ai`,
        timestamp: new Date(),
        level: 'info',
        message: `${currentAgent.name} replied (${response.tokens.total} tokens, ${response.provider})`,
        source: 'AI',
      });
    } catch (e) {
      const message =
        e instanceof AIServiceError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}_err`,
          role: 'system',
          content: `**AI request failed:** ${message}`,
          agent: activeAgent,
          timestamp: new Date(),
        },
      ]);
    } finally {
      aiService.setSystemPrompt(previousPrompt);
      setIsLoading(false);
      window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [input, isLoading, activeAgent, currentAgent]);

  const copyCode = useCallback((code: string, msgId: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedId(msgId);
    window.setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Render a message, splitting code fences out for syntax-highlighted blocks
  const renderMessage = (msg: ChatMessage) => {
    const parts = msg.content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const lang = lines[0].replace('```', '').trim();
        const code = lines.slice(1, -1).join('\n');
        return (
          <div key={i} className="my-2 rounded-lg overflow-hidden border border-slate-700">
            <div className="flex items-center justify-between px-3 py-1 bg-slate-800">
              <span className="text-[9px] text-slate-400 font-mono">{lang || 'code'}</span>
              <button
                onClick={() => copyCode(code, msg.id + i)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              >
                {copiedId === msg.id + i ? (
                  <Check size={10} className="text-green-400" />
                ) : (
                  <Copy size={10} />
                )}
              </button>
            </div>
            <pre className="px-3 py-2 bg-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.split('**').map((s, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="text-white">
                {s}
              </strong>
            ) : (
              s
            )
          )}
        </span>
      );
    });
  };

  return (
    <div className="flex h-full w-full bg-slate-900">
      {/* Left — Agent Selector */}
      <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          <span className="text-xs font-bold text-slate-200">AI Agents</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agents.map((agent) => {
            const Icon = agent.icon;
            const isActive = activeAgent === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setActiveAgent(agent.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-blue-600/15 border border-blue-500/40'
                    : 'hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: agent.color + '20' }}
                >
                  <Icon size={14} style={{ color: agent.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-[11px] font-semibold truncate ${
                      isActive ? 'text-blue-200' : 'text-slate-300'
                    }`}
                  >
                    {agent.name}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">{agent.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick examples */}
        <div className="border-t border-slate-700 p-3">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Quick Prompts</span>
          <div className="mt-2 space-y-1">
            {currentAgent.examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => setInput(ex)}
                className="w-full px-2 py-1.5 text-left rounded text-[9px] text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/50 hover:border-slate-600 transition-colors truncate"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center — Chat */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: currentAgent.color + '20' }}
          >
            <currentAgent.icon size={13} style={{ color: currentAgent.color }} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200">{currentAgent.name}</span>
            <span className="text-[9px] text-slate-500 ml-2">
              {messages.filter((m) => m.agent === activeAgent).length} messages
            </span>
          </div>
          <div className="flex-1" />
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="History">
            <History size={13} />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Settings">
            <Settings size={13} />
          </button>
          <button
            onClick={() => setMessages([])}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
            title="Clear"
          >
            <X size={13} />
          </button>
        </div>

        {/* Missing-API-key banner */}
        {!hasApiKey && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-200 text-[10px] flex items-start gap-2">
            <KeyRound size={12} className="mt-0.5 flex-shrink-0" />
            <div>
              No AI provider key is configured yet. Open the AI Chat panel
              (gear icon → API key) to enter your DeepSeek or Gemini key.
              Until then, the agents in this hub are inactive.
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: currentAgent.color + '15' }}
              >
                <currentAgent.icon size={28} style={{ color: currentAgent.color }} />
              </div>
              <h3 className="text-sm font-bold text-slate-200">{currentAgent.name}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{currentAgent.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {currentAgent.examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(ex)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages
            .filter((m) => m.agent === activeAgent)
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role !== 'user' && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: currentAgent.color + '20' }}
                  >
                    <currentAgent.icon size={13} style={{ color: currentAgent.color }} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : msg.role === 'system'
                        ? 'bg-red-950/30 border border-red-500/40'
                        : 'bg-slate-800 border border-slate-700'
                  } rounded-xl px-4 py-3`}
                >
                  <div className="text-[11px] text-slate-200 leading-relaxed">
                    {renderMessage(msg)}
                  </div>
                  <div className="text-[8px] text-slate-500 mt-2">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}

          {isLoading && (
            <div className="flex gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: currentAgent.color + '20' }}
              >
                <Loader2 size={13} className="animate-spin" style={{ color: currentAgent.color }} />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>{currentAgent.name} is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 bg-slate-800/80 border-t border-slate-700">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={`Ask ${currentAgent.name}...`}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 resize-none outline-none transition-colors"
                rows={1}
                style={{ minHeight: 40, maxHeight: 120 }}
              />
            </div>
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading || !hasApiKey}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] text-slate-500">
              Enter to send · Shift+Enter for new line
            </span>
            <span className="text-[9px] text-slate-500 flex items-center gap-1">
              <Zap size={8} /> Powered by {aiService.getConfig().provider}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
