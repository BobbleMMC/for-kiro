/**
 * AI Agent Hub — Multi-Agent System v2
 * Specialized AI agents: Code Copilot, Bug Detective, Performance Advisor,
 * Asset Generator, Documentation, Migration Helper
 * Inspired by Unity Agentic AI (GDC 2025) + GitHub Copilot
 */
import { useState, useRef, useCallback, type FC } from 'react';
import { Bot, Code, Bug, Gauge, Image, FileText, ArrowRightLeft, Sparkles, Send, Loader2, Copy, Check, X, Settings, History, Zap } from 'lucide-react';

// ==================== Types ====================

type AgentType = 'copilot' | 'detective' | 'advisor' | 'generator' | 'docs' | 'migration';

interface Agent {
  id: AgentType;
  name: string;
  icon: typeof Bot;
  color: string;
  description: string;
  examples: string[];
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
  { id: 'copilot', name: 'Code Copilot', icon: Code, color: '#3b82f6', description: 'Intelligent code completion and node graph suggestions', examples: ['Create a block that drops diamonds when broken', 'Add knockback to my sword item', 'Generate a smelting recipe for custom ore'] },
  { id: 'detective', name: 'Bug Detective', icon: Bug, color: '#ef4444', description: 'AI-powered error diagnosis and fix suggestions', examples: ['Why does my block not render?', 'Fix NullPointerException in entity tick', 'My recipe is not showing in crafting table'] },
  { id: 'advisor', name: 'Performance Advisor', icon: Gauge, color: '#22c55e', description: 'Optimization tips and TPS improvement', examples: ['My mod causes TPS drops to 12', 'Optimize entity spawning loop', 'Is my event handler too heavy?'] },
  { id: 'generator', name: 'Asset Generator', icon: Image, color: '#a855f7', description: 'Generate textures and models from text prompts', examples: ['Create a 16x16 ruby ore texture', 'Generate emerald sword pixel art', 'Design a custom mob face texture'] },
  { id: 'docs', name: 'Doc Writer', icon: FileText, color: '#f59e0b', description: 'Auto-generate README, wiki, and API docs', examples: ['Write README for my mod', 'Document all custom blocks', 'Generate changelog from commits'] },
  { id: 'migration', name: 'Migration Helper', icon: ArrowRightLeft, color: '#06b6d4', description: 'Convert between Forge/Fabric/NeoForge', examples: ['Convert this Forge event to Fabric', 'Migrate from 1.19 to 1.20.4', 'Port NeoForge mixin to Forge'] },
];

// ==================== Mock AI Responses ====================

const mockResponses: Record<AgentType, string[]> = {
  copilot: [
    "Here's the implementation for a diamond-dropping block:\n\n```java\n@Override\npublic List<ItemStack> getDrops(BlockState state, LootParams.Builder builder) {\n    List<ItemStack> drops = super.getDrops(state, builder);\n    drops.add(new ItemStack(Items.DIAMOND, 1 + random.nextInt(3)));\n    return drops;\n}\n```\n\nI've also added Fortune enchantment support. The drop count scales with the enchantment level.",
    "To add knockback to your sword, modify the `attackDamage` properties:\n\n```java\npublic class CustomSword extends SwordItem {\n    public CustomSword() {\n        super(Tiers.DIAMOND, 3, -2.4f,\n            new Item.Properties()\n                .attributes(createAttributes(Tiers.DIAMOND, 3, -2.4f))\n        );\n    }\n    \n    @Override\n    public boolean hurtEnemy(ItemStack stack, LivingEntity target, LivingEntity attacker) {\n        target.knockback(1.5, attacker.getX() - target.getX(), attacker.getZ() - target.getZ());\n        return super.hurtEnemy(stack, target, attacker);\n    }\n}\n```",
  ],
  detective: [
    "**Bug Analysis Complete** 🔍\n\n**Issue:** Block not rendering\n**Root Cause:** Missing blockstate JSON mapping\n\n**Fix:**\n1. Create `assets/yourmod/blockstates/custom_block.json`:\n```json\n{\n  \"variants\": {\n    \"\": { \"model\": \"yourmod:block/custom_block\" }\n  }\n}\n```\n\n2. Ensure model file exists at `assets/yourmod/models/block/custom_block.json`\n3. Verify texture path matches model definition\n\n**Prevention:** Always run the Resource Pack Validator before building.",
  ],
  advisor: [
    "**Performance Analysis** ⚡\n\n**Issue:** TPS drops to 12 during entity spawning\n\n**Hotspot detected:**\n```\nonEntitySpawn → findNearestPlayer() → O(n²) entity scan\n```\n\n**Recommendations:**\n1. 🔴 Replace `level.getEntities()` with spatial partitioning (chunk-based lookup)\n2. 🟡 Add cooldown between spawn attempts (20 ticks minimum)\n3. 🟢 Cache player positions every 5 ticks instead of per-spawn\n\n**Expected improvement:** TPS 12 → 19+ after fixes\n\nShall I generate the optimized code?",
  ],
  generator: [
    "**Texture Generated** 🎨\n\nI've created a 16×16 ruby ore texture with:\n- Dark stone base (similar to deepslate)\n- Red crystal clusters (3-4 pixels each)\n- Subtle gradient from dark red to bright red\n- 1px darker outline for depth\n\nThe texture has been saved to: `textures/block/ruby_ore.png`\n\nWould you like me to also generate:\n- Ruby item texture?\n- Deepslate ruby ore variant?\n- Block model with random rotation?",
  ],
  docs: [
    "**README.md Generated** 📄\n\n```markdown\n# My Awesome Mod\n\n## Overview\nA Minecraft mod that adds custom blocks, items, and entities.\n\n## Features\n- 5 Custom Blocks (Ruby Ore, Sapphire Block, etc.)\n- 3 Custom Items (Magic Sword, Healing Potion, etc.)\n- 2 Custom Entities (Fire Golem, Ice Fairy)\n\n## Installation\n1. Install Forge 1.20.4\n2. Drop the .jar file into `/mods/`\n3. Launch Minecraft\n\n## Crafting Recipes\n| Item | Recipe |\n|------|--------|\n| Magic Sword | 2 Diamonds + 1 Stick |\n```\n\nI've included all your custom content. Shall I add API documentation too?",
  ],
  migration: [
    "**Migration: Forge → Fabric** 🔄\n\n**Original (Forge):**\n```java\n@SubscribeEvent\npublic static void onBlockBreak(BlockEvent.BreakEvent event) {\n    Player player = event.getPlayer();\n    // ...\n}\n```\n\n**Converted (Fabric):**\n```java\nPlayerBlockBreakEvents.BEFORE.register((world, player, pos, state, entity) -> {\n    // Your logic here\n    return true; // false to cancel\n});\n```\n\n**Key changes:**\n1. Event annotations → Lambda registration\n2. `BlockEvent.BreakEvent` → `PlayerBlockBreakEvents.BEFORE`\n3. Return type: void → boolean (for cancellation)\n\n3 more events need migration. Continue?",
  ],
};

// ==================== Main Component ====================

export const AIAgentHub: FC = () => {
  const [activeAgent, setActiveAgent] = useState<AgentType>('copilot');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentAgent = agents.find(a => a.id === activeAgent)!;

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      agent: activeAgent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));

    const responses = mockResponses[activeAgent];
    const responseText = responses[Math.floor(Math.random() * responses.length)];

    const aiMsg: ChatMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: responseText,
      agent: activeAgent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [input, isLoading, activeAgent]);

  const copyCode = useCallback((code: string, msgId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Extract code blocks from message
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
              <button onClick={() => copyCode(code, msg.id + i)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                {copiedId === msg.id + i ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              </button>
            </div>
            <pre className="px-3 py-2 bg-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto"><code>{code}</code></pre>
          </div>
        );
      }
      // Render markdown-like formatting
      return <span key={i} className="whitespace-pre-wrap">{part.split('**').map((s, j) => j % 2 === 1 ? <strong key={j} className="text-white">{s}</strong> : s)}</span>;
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
          {agents.map(agent => {
            const Icon = agent.icon;
            const isActive = activeAgent === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setActiveAgent(agent.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive ? 'bg-blue-600/15 border border-blue-500/40' : 'hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: agent.color + '20' }}>
                  <Icon size={14} style={{ color: agent.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-semibold truncate ${isActive ? 'text-blue-200' : 'text-slate-300'}`}>{agent.name}</div>
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
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: currentAgent.color + '20' }}>
            <currentAgent.icon size={13} style={{ color: currentAgent.color }} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200">{currentAgent.name}</span>
            <span className="text-[9px] text-slate-500 ml-2">{messages.filter(m => m.agent === activeAgent).length} messages</span>
          </div>
          <div className="flex-1" />
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="History"><History size={13} /></button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Settings"><Settings size={13} /></button>
          <button onClick={() => setMessages([])} className="p-1.5 hover:bg-slate-700 rounded text-slate-400" title="Clear"><X size={13} /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: currentAgent.color + '15' }}>
                <currentAgent.icon size={28} style={{ color: currentAgent.color }} />
              </div>
              <h3 className="text-sm font-bold text-slate-200">{currentAgent.name}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">{currentAgent.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {currentAgent.examples.map((ex, i) => (
                  <button key={i} onClick={() => setInput(ex)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.filter(m => m.agent === activeAgent).map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: currentAgent.color + '20' }}>
                  <currentAgent.icon size={13} style={{ color: currentAgent.color }} />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-800 border border-slate-700'} rounded-xl px-4 py-3`}>
                <div className="text-[11px] text-slate-200 leading-relaxed">
                  {renderMessage(msg)}
                </div>
                <div className="text-[8px] text-slate-500 mt-2">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: currentAgent.color + '20' }}>
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Ask ${currentAgent.name}...`}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 resize-none outline-none transition-colors"
                rows={1}
                style={{ minHeight: 40, maxHeight: 120 }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[9px] text-slate-500">Enter to send · Shift+Enter for new line</span>
            <span className="text-[9px] text-slate-500 flex items-center gap-1"><Zap size={8} /> Powered by local AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
