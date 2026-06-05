import { useState, type FC } from 'react';
import { Wand2, Code, Copy, Check, Download, Loader2, RefreshCw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { aiService, type AICodeGenRequest } from '../../services/ai';

interface AICodeGeneratorProps {
  onCodeGenerated?: (code: string, language: string) => void;
}

export const AICodeGenerator: FC<AICodeGeneratorProps> = ({ onCodeGenerated }) => {
  const [request, setRequest] = useState<AICodeGenRequest>({
    type: 'block',
    name: '',
    description: '',
    properties: {},
    language: 'java',
  });

  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Property templates per type
  const propertyTemplates: Record<string, { key: string; label: string; type: 'text' | 'number' | 'boolean' | 'select'; options?: string[] }[]> = {
    block: [
      { key: 'hardness', label: 'Hardness', type: 'number' },
      { key: 'resistance', label: 'Blast Resistance', type: 'number' },
      { key: 'material', label: 'Material', type: 'select', options: ['stone', 'wood', 'metal', 'glass', 'dirt', 'ice'] },
      { key: 'requiresTool', label: 'Requires Tool', type: 'boolean' },
      { key: 'luminance', label: 'Light Level (0-15)', type: 'number' },
      { key: 'hasGravity', label: 'Has Gravity', type: 'boolean' },
    ],
    item: [
      { key: 'maxStackSize', label: 'Max Stack Size', type: 'number' },
      { key: 'durability', label: 'Durability', type: 'number' },
      { key: 'rarity', label: 'Rarity', type: 'select', options: ['common', 'uncommon', 'rare', 'epic'] },
      { key: 'isFood', label: 'Is Food', type: 'boolean' },
      { key: 'fireResistant', label: 'Fire Resistant', type: 'boolean' },
    ],
    entity: [
      { key: 'health', label: 'Max Health', type: 'number' },
      { key: 'attackDamage', label: 'Attack Damage', type: 'number' },
      { key: 'speed', label: 'Movement Speed', type: 'number' },
      { key: 'hostility', label: 'Behavior', type: 'select', options: ['hostile', 'passive', 'neutral'] },
      { key: 'isFlying', label: 'Can Fly', type: 'boolean' },
    ],
    recipe: [
      { key: 'recipeType', label: 'Recipe Type', type: 'select', options: ['shaped', 'shapeless', 'smelting', 'smithing'] },
      { key: 'resultCount', label: 'Result Count', type: 'number' },
    ],
    enchantment: [
      { key: 'maxLevel', label: 'Max Level', type: 'number' },
      { key: 'rarity', label: 'Rarity', type: 'select', options: ['common', 'uncommon', 'rare', 'very_rare'] },
      { key: 'isTreasure', label: 'Treasure Only', type: 'boolean' },
      { key: 'isCurse', label: 'Is Curse', type: 'boolean' },
    ],
    biome: [
      { key: 'temperature', label: 'Temperature', type: 'number' },
      { key: 'precipitation', label: 'Precipitation', type: 'select', options: ['none', 'rain', 'snow'] },
      { key: 'category', label: 'Category', type: 'select', options: ['plains', 'forest', 'desert', 'ocean', 'mountain'] },
    ],
    dimension: [
      { key: 'hasSkylight', label: 'Has Skylight', type: 'boolean' },
      { key: 'hasCeiling', label: 'Has Ceiling', type: 'boolean' },
      { key: 'ultrawarm', label: 'Ultrawarm', type: 'boolean' },
      { key: 'naturalSpawn', label: 'Natural Mob Spawning', type: 'boolean' },
    ],
    advancement: [
      { key: 'frame', label: 'Frame Type', type: 'select', options: ['task', 'goal', 'challenge'] },
      { key: 'experience', label: 'XP Reward', type: 'number' },
      { key: 'hidden', label: 'Hidden', type: 'boolean' },
    ],
    event: [
      { key: 'eventType', label: 'Event Category', type: 'select', options: ['entity', 'block', 'world', 'player', 'server'] },
      { key: 'cancelable', label: 'Cancelable', type: 'boolean' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['highest', 'high', 'normal', 'low', 'lowest'] },
    ],
  };

  const handleGenerate = async () => {
    if (!request.name.trim() || !request.description.trim()) {
      setError('Please fill in the name and description');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedCode('');

    try {
      const code = await aiService.generateCode(request);
      setGeneratedCode(code);
      onCodeGenerated?.(code, request.language || 'java');
    } catch (err: any) {
      setError(err.message || 'Failed to generate code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = request.language === 'json' ? 'json' : 'java';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${request.name || 'generated'}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePropertyChange = (key: string, value: any) => {
    setRequest({
      ...request,
      properties: { ...request.properties, [key]: value },
    });
  };

  const currentProperties = propertyTemplates[request.type] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center gap-3">
          <Wand2 size={28} className="text-purple-600" />
          <div>
            <h3 className="text-lg font-bold">AI Code Generator</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Describe what you want and AI will generate the code for you
            </p>
          </div>
        </div>
      </Card>

      {/* Configuration */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">What do you want to create?</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={request.type}
              onChange={(e) => setRequest({ ...request, type: e.target.value as any, properties: {} })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="block">Block</option>
              <option value="item">Item</option>
              <option value="entity">Entity</option>
              <option value="recipe">Recipe</option>
              <option value="enchantment">Enchantment</option>
              <option value="biome">Biome</option>
              <option value="dimension">Dimension</option>
              <option value="advancement">Advancement</option>
              <option value="event">Event Handler</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select
              value={request.language}
              onChange={(e) => setRequest({ ...request, language: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="java">Java</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={request.name}
            onChange={(e) => setRequest({ ...request, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            placeholder="e.g., MagicOreBlock, DragonSword, CustomBoss"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={request.description}
            onChange={(e) => setRequest({ ...request, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            rows={3}
            placeholder="Describe what this should do, its behavior, special features..."
          />
        </div>
      </Card>

      {/* Properties */}
      {currentProperties.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Properties</h4>
          <div className="grid grid-cols-2 gap-4">
            {currentProperties.map((prop) => (
              <div key={prop.key}>
                <label className="block text-sm font-medium mb-2">{prop.label}</label>
                {prop.type === 'text' && (
                  <input
                    type="text"
                    value={(request.properties?.[prop.key] as string) || ''}
                    onChange={(e) => handlePropertyChange(prop.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  />
                )}
                {prop.type === 'number' && (
                  <input
                    type="number"
                    value={(request.properties?.[prop.key] as number) || ''}
                    onChange={(e) => handlePropertyChange(prop.key, parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  />
                )}
                {prop.type === 'boolean' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(request.properties?.[prop.key] as boolean) || false}
                      onChange={(e) => handlePropertyChange(prop.key, e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                )}
                {prop.type === 'select' && (
                  <select
                    value={(request.properties?.[prop.key] as string) || ''}
                    onChange={(e) => handlePropertyChange(prop.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  >
                    <option value="">Select...</option>
                    {prop.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !request.name.trim() || !request.description.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        {isGenerating ? (
          <>
            <Loader2 size={18} className="mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 size={18} className="mr-2" />
            Generate Code with AI
          </>
        )}
      </Button>

      {/* Error */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">⚠️ {error}</p>
        </Card>
      )}

      {/* Generated Code */}
      {generatedCode && (
        <Card className="p-6 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Code size={18} />
              Generated Code
            </h4>
            <div className="flex gap-2">
              <Button onClick={() => handleGenerate()} size="sm" variant="outline">
                <RefreshCw size={14} className="mr-1" />
                Regenerate
              </Button>
              <Button onClick={handleCopy} size="sm" variant="outline">
                {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button onClick={handleDownload} size="sm">
                <Download size={14} className="mr-1" />
                Download
              </Button>
            </div>
          </div>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
            <pre>{generatedCode}</pre>
          </div>
        </Card>
      )}
    </div>
  );
};
