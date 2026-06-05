import { useState, type FC } from 'react';
import { Plus, Trash2, Trophy, GitBranch, Star, Eye } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface AdvancementCriterion {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, any>;
}

export interface AdvancementReward {
  experience?: number;
  recipes?: string[];
  loot?: string[];
  function?: string;
}

export interface AdvancementDisplay {
  icon: string;
  title: string;
  description: string;
  frame: 'task' | 'goal' | 'challenge';
  showToast: boolean;
  announceToChat: boolean;
  hidden: boolean;
  background?: string;
}

export interface Advancement {
  id: string;
  name: string;
  parent?: string;
  display: AdvancementDisplay;
  criteria: AdvancementCriterion[];
  requirements?: string[][];
  rewards: AdvancementReward;
}

interface AdvancementEditorProps {
  onSave?: (advancement: Advancement) => void;
}

const TRIGGER_TYPES = [
  'minecraft:impossible',
  'minecraft:player_killed_entity',
  'minecraft:entity_killed_player',
  'minecraft:inventory_changed',
  'minecraft:consume_item',
  'minecraft:placed_block',
  'minecraft:enter_block',
  'minecraft:bred_animals',
  'minecraft:changed_dimension',
  'minecraft:construct_beacon',
  'minecraft:enchanted_item',
  'minecraft:brewed_potion',
  'minecraft:fishing_rod_hooked',
  'minecraft:hero_of_the_village',
  'minecraft:killed_by_crossbow',
  'minecraft:levitation',
  'minecraft:location',
  'minecraft:nether_travel',
  'minecraft:recipe_unlocked',
  'minecraft:shot_crossbow',
  'minecraft:slept_in_bed',
  'minecraft:tick',
  'minecraft:used_ender_eye',
  'minecraft:villager_trade',
  'minecraft:voluntary_exile',
];

const FRAME_COLORS: Record<string, string> = {
  task: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
  goal: 'from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-800/20',
  challenge: 'from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-800/20',
};

const FRAME_BORDERS: Record<string, string> = {
  task: 'border-green-400',
  goal: 'border-yellow-400',
  challenge: 'border-purple-400',
};

export const AdvancementEditor: FC<AdvancementEditorProps> = ({ onSave }) => {
  const [advancement, setAdvancement] = useState<Advancement>({
    id: `advancement_${Date.now()}`,
    name: 'custom_advancement',
    display: {
      icon: 'minecraft:diamond',
      title: 'Custom Achievement',
      description: 'Complete this custom challenge!',
      frame: 'task',
      showToast: true,
      announceToChat: true,
      hidden: false,
    },
    criteria: [
      {
        id: 'criterion_1',
        name: 'requirement',
        trigger: 'minecraft:inventory_changed',
        conditions: {},
      },
    ],
    requirements: [],
    rewards: {
      experience: 10,
      recipes: [],
      loot: [],
    },
  });

  const [newRecipe, setNewRecipe] = useState('');
  const [newLoot, setNewLoot] = useState('');

  const updateDisplay = (updates: Partial<AdvancementDisplay>) => {
    setAdvancement({
      ...advancement,
      display: { ...advancement.display, ...updates },
    });
  };

  const updateRewards = (updates: Partial<AdvancementReward>) => {
    setAdvancement({
      ...advancement,
      rewards: { ...advancement.rewards, ...updates },
    });
  };

  const handleAddCriterion = () => {
    setAdvancement({
      ...advancement,
      criteria: [
        ...advancement.criteria,
        {
          id: `criterion_${Date.now()}`,
          name: `criterion_${advancement.criteria.length + 1}`,
          trigger: 'minecraft:impossible',
          conditions: {},
        },
      ],
    });
  };

  const handleRemoveCriterion = (id: string) => {
    setAdvancement({
      ...advancement,
      criteria: advancement.criteria.filter(c => c.id !== id),
    });
  };

  const handleUpdateCriterion = (id: string, field: keyof AdvancementCriterion, value: any) => {
    setAdvancement({
      ...advancement,
      criteria: advancement.criteria.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    });
  };

  const handleAddRecipe = () => {
    if (newRecipe.trim()) {
      updateRewards({
        recipes: [...(advancement.rewards.recipes || []), newRecipe.trim()],
      });
      setNewRecipe('');
    }
  };

  const handleRemoveRecipe = (recipe: string) => {
    updateRewards({
      recipes: (advancement.rewards.recipes || []).filter(r => r !== recipe),
    });
  };

  const handleAddLoot = () => {
    if (newLoot.trim()) {
      updateRewards({
        loot: [...(advancement.rewards.loot || []), newLoot.trim()],
      });
      setNewLoot('');
    }
  };

  const handleRemoveLoot = (loot: string) => {
    updateRewards({
      loot: (advancement.rewards.loot || []).filter(l => l !== loot),
    });
  };

  const handleSave = () => {
    if (!advancement.display.title.trim()) {
      alert('Please enter advancement title');
      return;
    }
    if (advancement.criteria.length === 0) {
      alert('Please add at least one criterion');
      return;
    }
    onSave?.(advancement);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Trophy size={20} className="mr-2" />
          Advancement Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Advancement ID</label>
            <input
              type="text"
              value={advancement.name}
              onChange={(e) => setAdvancement({ ...advancement, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
              placeholder="custom_advancement"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Parent Advancement</label>
            <input
              type="text"
              value={advancement.parent || ''}
              onChange={(e) => setAdvancement({ ...advancement, parent: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
              placeholder="modid:parent_advancement (optional)"
            />
          </div>
        </div>
      </Card>

      {/* Display Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Eye size={20} className="mr-2" />
          Display Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={advancement.display.title}
              onChange={(e) => updateDisplay({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="Custom Achievement"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Icon Item</label>
            <input
              type="text"
              value={advancement.display.icon}
              onChange={(e) => updateDisplay({ icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
              placeholder="minecraft:diamond"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={advancement.display.description}
            onChange={(e) => updateDisplay({ description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            rows={2}
            placeholder="Describe what the player needs to do..."
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Frame Type</label>
            <select
              value={advancement.display.frame}
              onChange={(e) => updateDisplay({ frame: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="task">Task (Square)</option>
              <option value="goal">Goal (Rounded)</option>
              <option value="challenge">Challenge (Star)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Background (Root only)</label>
            <input
              type="text"
              value={advancement.display.background || ''}
              onChange={(e) => updateDisplay({ background: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
              placeholder="minecraft:textures/block/stone.png"
            />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={advancement.display.showToast} onChange={(e) => updateDisplay({ showToast: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm"><strong>Show Toast</strong> - Display popup notification</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={advancement.display.announceToChat} onChange={(e) => updateDisplay({ announceToChat: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm"><strong>Announce to Chat</strong> - Show message in chat</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={advancement.display.hidden} onChange={(e) => updateDisplay({ hidden: e.target.checked })} className="w-4 h-4 rounded" />
            <span className="text-sm"><strong>Hidden</strong> - Don't show until completed</span>
          </label>
        </div>
      </Card>

      {/* Criteria */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <GitBranch size={20} className="mr-2" />
            Criteria ({advancement.criteria.length})
          </h3>
          <Button onClick={handleAddCriterion} size="sm">
            <Plus size={16} className="mr-2" />
            Add Criterion
          </Button>
        </div>
        <div className="space-y-3">
          {advancement.criteria.map((criterion) => (
            <div key={criterion.id} className="p-4 border border-gray-300 dark:border-gray-600 rounded-md">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Criterion Name</label>
                  <input
                    type="text"
                    value={criterion.name}
                    onChange={(e) => handleUpdateCriterion(criterion.id, 'name', e.target.value)}
                    placeholder="requirement_name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">Trigger Type</label>
                  <select
                    value={criterion.trigger}
                    onChange={(e) => handleUpdateCriterion(criterion.id, 'trigger', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  >
                    {TRIGGER_TYPES.map(trigger => (
                      <option key={trigger} value={trigger}>
                        {trigger.replace('minecraft:', '')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {advancement.criteria.length > 1 && (
                <button
                  onClick={() => handleRemoveCriterion(criterion.id)}
                  className="w-full mt-2 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm flex items-center justify-center"
                >
                  <Trash2 size={14} className="mr-1" />
                  Remove Criterion
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Rewards */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Star size={20} className="mr-2" />
          Rewards
        </h3>

        {/* Experience */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Experience Points</label>
          <input
            type="number"
            value={advancement.rewards.experience || 0}
            onChange={(e) => updateRewards({ experience: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            min="0"
          />
        </div>

        {/* Recipes */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Unlocked Recipes</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newRecipe}
              onChange={(e) => setNewRecipe(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRecipe()}
              placeholder="minecraft:recipe_name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
            />
            <Button onClick={handleAddRecipe} size="sm">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(advancement.rewards.recipes || []).map(recipe => (
              <span key={recipe} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-xs flex items-center gap-1">
                {recipe}
                <button onClick={() => handleRemoveRecipe(recipe)} className="hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Loot Tables */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Loot Tables</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newLoot}
              onChange={(e) => setNewLoot(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLoot()}
              placeholder="modid:loot_table"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
            />
            <Button onClick={handleAddLoot} size="sm">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(advancement.rewards.loot || []).map(loot => (
              <span key={loot} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-xs flex items-center gap-1">
                {loot}
                <button onClick={() => handleRemoveLoot(loot)} className="hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Function */}
        <div>
          <label className="block text-sm font-medium mb-2">Reward Function</label>
          <input
            type="text"
            value={advancement.rewards.function || ''}
            onChange={(e) => updateRewards({ function: e.target.value || undefined })}
            placeholder="modid:reward_function (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
          />
        </div>
      </Card>

      {/* Preview */}
      <Card className={`p-6 bg-gradient-to-r ${FRAME_COLORS[advancement.display.frame]} border-2 ${FRAME_BORDERS[advancement.display.frame]}`}>
        <h3 className="text-lg font-semibold mb-4">Advancement Preview</h3>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-600">
            <Trophy size={32} className={`${
              advancement.display.frame === 'challenge' ? 'text-purple-400' :
              advancement.display.frame === 'goal' ? 'text-yellow-400' : 'text-green-400'
            }`} />
          </div>
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-lg">{advancement.display.title || 'Untitled'}</h4>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                advancement.display.frame === 'challenge' ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200' :
                advancement.display.frame === 'goal' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
              }`}>
                {advancement.display.frame}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{advancement.display.description}</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Icon:</strong> {advancement.display.icon}</p>
              <p><strong>Criteria:</strong> {advancement.criteria.length} requirement(s)</p>
              <p><strong>Rewards:</strong> {advancement.rewards.experience || 0} XP
                {(advancement.rewards.recipes?.length || 0) > 0 && `, ${advancement.rewards.recipes?.length} recipes`}
                {(advancement.rewards.loot?.length || 0) > 0 && `, ${advancement.rewards.loot?.length} loot`}
              </p>
              {advancement.parent && <p><strong>Parent:</strong> {advancement.parent}</p>}
              <div className="flex gap-2 mt-1">
                {advancement.display.showToast && <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Toast</span>}
                {advancement.display.announceToChat && <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Chat</span>}
                {advancement.display.hidden && <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Hidden</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* JSON Preview */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <h4 className="font-semibold mb-3">JSON Preview</h4>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
          <pre>{JSON.stringify({
            parent: advancement.parent,
            display: {
              icon: { item: advancement.display.icon },
              title: advancement.display.title,
              description: advancement.display.description,
              frame: advancement.display.frame,
              show_toast: advancement.display.showToast,
              announce_to_chat: advancement.display.announceToChat,
              hidden: advancement.display.hidden,
              ...(advancement.display.background ? { background: advancement.display.background } : {}),
            },
            criteria: Object.fromEntries(
              advancement.criteria.map(c => [c.name, { trigger: c.trigger, conditions: c.conditions }])
            ),
            rewards: {
              ...(advancement.rewards.experience ? { experience: advancement.rewards.experience } : {}),
              ...(advancement.rewards.recipes?.length ? { recipes: advancement.rewards.recipes } : {}),
              ...(advancement.rewards.loot?.length ? { loot: advancement.rewards.loot } : {}),
              ...(advancement.rewards.function ? { function: advancement.rewards.function } : {}),
            },
          }, null, 2)}</pre>
        </div>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} className="w-full">
        Save Advancement
      </Button>
    </div>
  );
};
