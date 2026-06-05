import { useState, type FC } from 'react';
import { Lightbulb, Loader2, RefreshCw, AlertTriangle, CheckCircle, Zap, Shield, Bug } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { aiService, type AIModAdvice } from '../../services/ai';

interface AIModAdvisorProps {
  projectContext?: string;
}

const CATEGORY_ICONS: Record<string, typeof Lightbulb> = {
  optimization: Zap,
  bug_fix: Bug,
  feature: Lightbulb,
  best_practice: CheckCircle,
  security: Shield,
};

const CATEGORY_COLORS: Record<string, string> = {
  optimization: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-700',
  bug_fix: 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-300 dark:border-red-700',
  feature: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700',
  best_practice: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700',
  security: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  low: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
};

const ANALYSIS_PRESETS = [
  {
    id: 'performance',
    label: '⚡ Performance Analysis',
    prompt: 'Analyze my Minecraft mod for performance issues. Look for: inefficient tick handlers, memory leaks, unnecessary entity updates, unoptimized rendering, excessive packet sending.',
  },
  {
    id: 'security',
    label: '🔒 Security Audit',
    prompt: 'Check my Minecraft mod for security vulnerabilities. Look for: client-side validation only, permission bypass, resource exhaustion attacks, packet manipulation.',
  },
  {
    id: 'bestpractices',
    label: '✅ Best Practices',
    prompt: 'Review my Minecraft mod for coding best practices. Check: registry usage, event bus patterns, capability system usage, data fixers, networking patterns.',
  },
  {
    id: 'compatibility',
    label: '🔗 Compatibility Check',
    prompt: 'Analyze my Minecraft mod for potential mod compatibility issues. Check: ore dictionary/tags usage, biome modification safety, event priority conflicts, mixin compatibility.',
  },
  {
    id: 'features',
    label: '💡 Feature Ideas',
    prompt: 'Based on my mod\'s current features, suggest creative new features that would enhance the gameplay experience and integrate well with existing content.',
  },
];

export const AIModAdvisor: FC<AIModAdvisorProps> = ({ projectContext }) => {
  const [adviceList, setAdviceList] = useState<AIModAdvice[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customContext, setCustomContext] = useState(projectContext || '');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [expandedAdvice, setExpandedAdvice] = useState<Set<number>>(new Set());

  const handleAnalyze = async (presetPrompt?: string) => {
    const context = presetPrompt
      ? `${presetPrompt}\n\nMod Context:\n${customContext || 'General Minecraft mod with blocks, items, and entities.'}`
      : customContext || 'Analyze a general Minecraft mod and provide improvement suggestions.';

    setIsAnalyzing(true);
    setError(null);

    try {
      const advice = await aiService.getModAdvice(context);
      setAdviceList(advice);
    } catch (err: any) {
      setError(err.message || 'Failed to get AI advice');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedAdvice);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedAdvice(newExpanded);
  };

  const getStats = () => {
    const high = adviceList.filter(a => a.priority === 'high').length;
    const medium = adviceList.filter(a => a.priority === 'medium').length;
    const low = adviceList.filter(a => a.priority === 'low').length;
    return { high, medium, low, total: adviceList.length };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <div className="flex items-center gap-3">
          <Lightbulb size={28} className="text-amber-600" />
          <div>
            <h3 className="text-lg font-bold">AI Mod Advisor</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get AI-powered suggestions to improve your mod's quality, performance, and features
            </p>
          </div>
        </div>
      </Card>

      {/* Analysis Presets */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Quick Analysis</h4>
        <div className="grid grid-cols-2 gap-3">
          {ANALYSIS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPreset(preset.id);
                handleAnalyze(preset.prompt);
              }}
              disabled={isAnalyzing}
              className={`p-3 rounded-lg border-2 text-left text-sm font-medium transition ${
                selectedPreset === preset.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
              } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Custom Context */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Mod Context</h4>
        <textarea
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
          rows={4}
          placeholder="Describe your mod's current state: what blocks/items you have, what features are implemented, any known issues...

Example: My mod adds 5 custom ores, a boss entity, and a new dimension. I use Forge 1.20.1. The boss entity sometimes causes lag when spawned in large groups."
        />
        <Button
          onClick={() => handleAnalyze()}
          disabled={isAnalyzing}
          className="mt-3 w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Lightbulb size={18} className="mr-2" />
              Get AI Advice
            </>
          )}
        </Button>
      </Card>

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">⚠️ {error}</p>
        </Card>
      )}

      {/* Results Statistics */}
      {adviceList.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <span className="text-sm"><strong>{stats.total}</strong> suggestions</span>
              {stats.high > 0 && <span className="text-sm text-red-600">🔴 {stats.high} high</span>}
              {stats.medium > 0 && <span className="text-sm text-yellow-600">🟡 {stats.medium} medium</span>}
              {stats.low > 0 && <span className="text-sm text-green-600">🟢 {stats.low} low</span>}
            </div>
            <Button onClick={() => handleAnalyze()} size="sm" variant="outline">
              <RefreshCw size={14} className="mr-1" />
              Re-analyze
            </Button>
          </div>
        </Card>
      )}

      {/* Advice List */}
      {adviceList.length > 0 && (
        <div className="space-y-4">
          {adviceList.map((advice, index) => {
            const Icon = CATEGORY_ICONS[advice.category] || Lightbulb;
            const colorClass = CATEGORY_COLORS[advice.category] || CATEGORY_COLORS.feature;
            const isExpanded = expandedAdvice.has(index);

            return (
              <Card
                key={index}
                className={`p-5 bg-gradient-to-r ${colorClass} border-2 cursor-pointer transition hover:shadow-md`}
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-start gap-3">
                  <Icon size={22} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">{advice.title}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PRIORITY_STYLES[advice.priority]}`}>
                        {advice.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {isExpanded ? advice.description : advice.description.slice(0, 120) + (advice.description.length > 120 ? '...' : '')}
                    </p>

                    {isExpanded && advice.code && (
                      <div className="mt-3 bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                        <pre>{advice.code}</pre>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs capitalize">
                        {advice.category.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isAnalyzing && adviceList.length === 0 && !error && (
        <Card className="p-8 text-center">
          <AlertTriangle size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">
            Select a quick analysis preset or describe your mod context to get AI-powered suggestions.
          </p>
        </Card>
      )}
    </div>
  );
};
