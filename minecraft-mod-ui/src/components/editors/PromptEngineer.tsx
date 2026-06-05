import { useState, type FC } from 'react';
import { Zap, Copy, Check, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'code_gen' | 'review' | 'optimization' | 'documentation';
  prompt: string;
  placeholders: string[];
  author?: string;
  rating?: number;
  uses: number;
  timestamp: number;
}

interface PromptEngineerProps {
  onPromptSelect?: (prompt: string) => void;
}

/**
 * Prompt Engineer
 * Design and optimize AI prompts for better results
 */
export const PromptEngineer: FC<PromptEngineerProps> = ({ onPromptSelect }) => {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    {
      id: 'tpl_1',
      name: 'Java Block Generator',
      description: 'Generate Minecraft block class code',
      category: 'code_gen',
      prompt: 'Generate a Minecraft ${version} block class named ${blockName}. The block should have ${properties}. Use ${modLoader} modding framework.',
      placeholders: ['version', 'blockName', 'properties', 'modLoader'],
      author: 'System',
      uses: 45,
      timestamp: Date.now(),
    },
    {
      id: 'tpl_2',
      name: 'Recipe JSON Generator',
      description: 'Generate crafting recipe JSON',
      category: 'code_gen',
      prompt: 'Create a Minecraft ${recipeType} recipe JSON for ${itemName}. Inputs: ${ingredients}. Output: ${output}.',
      placeholders: ['recipeType', 'itemName', 'ingredients', 'output'],
      author: 'System',
      uses: 32,
      timestamp: Date.now(),
    },
  ]);

  const [currentPrompt, setCurrentPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: 'code_gen' as PromptTemplate['category'],
    prompt: '',
  });
  const [copied, setCopied] = useState(false);
  const [replacements, setReplacements] = useState<Record<string, string>>({});

  const selectedTpl = selectedTemplate ? prompts.find(p => p.id === selectedTemplate) : null;

  const extractPlaceholders = (text: string): string[] => {
    const matches = text.match(/\$\{([^}]+)\}/g) || [];
    return [...new Set(matches.map(m => m.slice(2, -1)))];
  };

  const replacePlaceholders = (text: string, replacements: Record<string, string>): string => {
    let result = text;
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    });
    return result;
  };

  const finalPrompt = selectedTpl
    ? replacePlaceholders(selectedTpl.prompt, replacements)
    : currentPrompt;

  const handleAddTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.prompt.trim()) return;

    const template: PromptTemplate = {
      id: `tpl_${Date.now()}`,
      ...newTemplate,
      placeholders: extractPlaceholders(newTemplate.prompt),
      author: 'User',
      uses: 0,
      timestamp: Date.now(),
    };

    setPrompts(prev => [template, ...prev]);
    setNewTemplate({ name: '', description: '', category: 'code_gen', prompt: '' });
    setSelectedTemplate(template.id);
  };

  const handleDelete = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    if (selectedTemplate === id) {
      setSelectedTemplate(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryColor = (cat: PromptTemplate['category']) => {
    switch (cat) {
      case 'code_gen':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'review':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
      case 'optimization':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'documentation':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Prompt Editor */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Edit2 size={20} />
          Prompt Editor
        </h3>

        {selectedTpl ? (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Original Prompt:</p>
              <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                {selectedTpl.prompt}
              </pre>
            </div>

            {/* Placeholder Replacements */}
            {selectedTpl.placeholders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Replacements:</p>
                {selectedTpl.placeholders.map(placeholder => (
                  <div key={placeholder}>
                    <label className="block text-xs font-medium mb-1">${`{${placeholder}}`}</label>
                    <input
                      type="text"
                      value={replacements[placeholder] || ''}
                      onChange={(e) =>
                        setReplacements(prev => ({
                          ...prev,
                          [placeholder]: e.target.value,
                        }))
                      }
                      placeholder={`Enter value for ${placeholder}`}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="Write your custom prompt here... Use ${placeholder} syntax for variables"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg resize-vertical text-sm font-mono"
            rows={5}
          />
        )}
      </Card>

      {/* Final Prompt Preview */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Final Prompt</h4>
          <div className="flex gap-2">
            <Button onClick={handleCopy} size="sm" variant="outline">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
            {onPromptSelect && (
              <Button onClick={() => onPromptSelect(finalPrompt)} size="sm">
                <Zap size={14} className="mr-1" />
                Use This
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
          <pre className="text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap overflow-x-auto">
            {finalPrompt || '(Empty prompt)'}
          </pre>
        </div>
      </Card>

      {/* Template Library */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Prompt Library</h4>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            size="sm"
            variant="outline"
          >
            {isEditing ? 'Done' : <Plus size={14} />}
          </Button>
        </div>

        {isEditing && (
          <div className="mb-6 p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h5 className="font-semibold text-sm mb-3">Create New Template</h5>
            <div className="space-y-3">
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Template name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded text-sm"
              />
              <input
                type="text"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded text-sm"
              />
              <select
                value={newTemplate.category}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded text-sm"
              >
                <option value="code_gen">Code Generation</option>
                <option value="review">Code Review</option>
                <option value="optimization">Optimization</option>
                <option value="documentation">Documentation</option>
              </select>
              <textarea
                value={newTemplate.prompt}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Prompt template (use ${placeholder} syntax)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded text-sm font-mono"
                rows={3}
              />
              <Button onClick={handleAddTemplate} className="w-full">
                <Save size={14} className="mr-1" />
                Save Template
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {prompts.map(prompt => (
            <button
              key={prompt.id}
              onClick={() => setSelectedTemplate(prompt.id)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                selectedTemplate === prompt.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{prompt.name}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {prompt.description}
                  </p>
                </div>
                {selectedTemplate === prompt.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(prompt.id);
                    }}
                    className="p-1 hover:bg-red-200 dark:hover:bg-red-800 rounded text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded ${getCategoryColor(prompt.category)}`}>
                  {prompt.category.replace('_', ' ')}
                </span>
                {prompt.uses > 0 && (
                  <span className="text-gray-600 dark:text-gray-400">
                    Used {prompt.uses} times
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PromptEngineer;
