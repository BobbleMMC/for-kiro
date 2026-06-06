import { FC } from 'react';
import { Zap, GitBranch, Play, Hash, X } from 'lucide-react';

interface NodePaletteProps {
  onAddNode: (type: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

interface PaletteItem {
  type: string;
  label: string;
  icon: typeof Zap;
  color: string;
  description: string;
  defaultData: Record<string, unknown>;
}

const triggerEvents: PaletteItem[] = [
  {
    type: 'trigger',
    label: 'On Block Break',
    icon: Zap,
    color: 'text-red-400 bg-red-950 border-red-700',
    description: 'Fires when any block is broken',
    defaultData: { label: 'Block Break', eventType: 'onBlockBreak', description: 'When a block is destroyed' },
  },
  {
    type: 'trigger',
    label: 'On Player Join',
    icon: Zap,
    color: 'text-red-400 bg-red-950 border-red-700',
    description: 'Fires when a player connects',
    defaultData: { label: 'Player Join', eventType: 'onPlayerJoin', description: 'When a player logs in' },
  },
  {
    type: 'trigger',
    label: 'On Entity Death',
    icon: Zap,
    color: 'text-red-400 bg-red-950 border-red-700',
    description: 'Fires when an entity dies',
    defaultData: { label: 'Entity Death', eventType: 'onEntityDeath', description: 'When any entity is killed' },
  },
  {
    type: 'trigger',
    label: 'On Item Use',
    icon: Zap,
    color: 'text-red-400 bg-red-950 border-red-700',
    description: 'Fires when an item is used',
    defaultData: { label: 'Item Use', eventType: 'onItemUse', description: 'When player right-clicks with item' },
  },
  {
    type: 'trigger',
    label: 'On Tick',
    icon: Zap,
    color: 'text-red-400 bg-red-950 border-red-700',
    description: 'Fires every server tick (20/sec)',
    defaultData: { label: 'Server Tick', eventType: 'onServerTick', description: 'Every game tick' },
  },
];

const conditionNodes: PaletteItem[] = [
  {
    type: 'condition',
    label: 'If Equal',
    icon: GitBranch,
    color: 'text-yellow-400 bg-yellow-950 border-yellow-700',
    description: 'Branch if values are equal',
    defaultData: { label: 'Check Equal', conditionType: 'if', operator: '==', leftValue: '', rightValue: '' },
  },
  {
    type: 'condition',
    label: 'If Greater Than',
    icon: GitBranch,
    color: 'text-yellow-400 bg-yellow-950 border-yellow-700',
    description: 'Branch if left > right',
    defaultData: { label: 'Check Greater', conditionType: 'if', operator: '>', leftValue: '', rightValue: '' },
  },
  {
    type: 'condition',
    label: 'Has Item',
    icon: GitBranch,
    color: 'text-yellow-400 bg-yellow-950 border-yellow-700',
    description: 'Check if player has item',
    defaultData: { label: 'Has Item?', conditionType: 'hasItem', operator: '!=', leftValue: 'inventory.count', rightValue: '0' },
  },
  {
    type: 'condition',
    label: 'Is Sneaking',
    icon: GitBranch,
    color: 'text-yellow-400 bg-yellow-950 border-yellow-700',
    description: 'Check if player is crouching',
    defaultData: { label: 'Is Sneaking?', conditionType: 'if', operator: '==', leftValue: 'player.isSneaking', rightValue: 'true' },
  },
];

const actionNodes: PaletteItem[] = [
  {
    type: 'action',
    label: 'Send Message',
    icon: Play,
    color: 'text-blue-400 bg-blue-950 border-blue-700',
    description: 'Send chat message to player',
    defaultData: { label: 'Send Message', actionType: 'sendMessage', target: 'player', parameters: { message: 'Hello!' } },
  },
  {
    type: 'action',
    label: 'Give Item',
    icon: Play,
    color: 'text-blue-400 bg-blue-950 border-blue-700',
    description: 'Give item to player inventory',
    defaultData: { label: 'Give Item', actionType: 'giveItem', target: 'player', parameters: { item: 'diamond', count: '1' } },
  },
  {
    type: 'action',
    label: 'Set Block',
    icon: Play,
    color: 'text-blue-400 bg-blue-950 border-blue-700',
    description: 'Place/replace block in world',
    defaultData: { label: 'Set Block', actionType: 'setBlock', target: 'world', parameters: { block: 'stone' } },
  },
  {
    type: 'action',
    label: 'Spawn Entity',
    icon: Play,
    color: 'text-blue-400 bg-blue-950 border-blue-700',
    description: 'Spawn entity at position',
    defaultData: { label: 'Spawn Entity', actionType: 'spawnEntity', target: 'world', parameters: { entity: 'zombie' } },
  },
  {
    type: 'action',
    label: 'Play Sound',
    icon: Play,
    color: 'text-blue-400 bg-blue-950 border-blue-700',
    description: 'Play sound effect',
    defaultData: { label: 'Play Sound', actionType: 'playSound', target: 'player', parameters: { sound: 'entity.experience_orb.pickup' } },
  },
  {
    type: 'action',
    label: 'Teleport',
    icon: Play,
    color: 'text-blue-400 bg-blue-950 border-blue-700',
    description: 'Teleport entity to position',
    defaultData: { label: 'Teleport', actionType: 'teleport', target: 'player', parameters: { x: '0', y: '100', z: '0' } },
  },
];

const valueNodes: PaletteItem[] = [
  {
    type: 'value',
    label: 'Integer',
    icon: Hash,
    color: 'text-green-400 bg-green-950 border-green-700',
    description: 'Numeric integer value',
    defaultData: { label: 'Number', valueType: 'integer', value: '0' },
  },
  {
    type: 'value',
    label: 'String',
    icon: Hash,
    color: 'text-pink-400 bg-pink-950 border-pink-700',
    description: 'Text string value',
    defaultData: { label: 'Text', valueType: 'string', value: '' },
  },
  {
    type: 'value',
    label: 'Boolean',
    icon: Hash,
    color: 'text-orange-400 bg-orange-950 border-orange-700',
    description: 'True/False toggle',
    defaultData: { label: 'Flag', valueType: 'boolean', value: 'true' },
  },
  {
    type: 'value',
    label: 'Block Reference',
    icon: Hash,
    color: 'text-purple-400 bg-purple-950 border-purple-700',
    description: 'Reference to a block type',
    defaultData: { label: 'Block', valueType: 'blockRef', value: 'minecraft:stone' },
  },
];

const NodePalette: FC<NodePaletteProps> = ({ onAddNode, onClose }) => {
  return (
    <div className="absolute top-14 left-2 z-50 w-80 max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <h3 className="text-sm font-bold text-slate-100">Node Palette</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
          <X size={14} className="text-slate-400" />
        </button>
      </div>

      {/* Node Categories */}
      <div className="overflow-y-auto max-h-[65vh] p-3 space-y-4 custom-scrollbar">
        {/* Triggers */}
        <PaletteSection title="Event Triggers" color="text-red-400" items={triggerEvents} onAdd={onAddNode} />
        
        {/* Conditions */}
        <PaletteSection title="Conditions" color="text-yellow-400" items={conditionNodes} onAdd={onAddNode} />
        
        {/* Actions */}
        <PaletteSection title="Actions" color="text-blue-400" items={actionNodes} onAdd={onAddNode} />
        
        {/* Values */}
        <PaletteSection title="Values" color="text-green-400" items={valueNodes} onAdd={onAddNode} />
      </div>
    </div>
  );
};

// Palette section component
const PaletteSection: FC<{
  title: string;
  color: string;
  items: PaletteItem[];
  onAdd: (type: string, data: Record<string, unknown>) => void;
}> = ({ title, color, items, onAdd }) => (
  <div>
    <h4 className={`text-xs font-bold ${color} uppercase tracking-wider mb-2`}>{title}</h4>
    <div className="space-y-1">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => onAdd(item.type, item.defaultData)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border ${item.color} hover:opacity-80 transition-opacity text-left`}
        >
          <item.icon size={14} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200">{item.label}</div>
            <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

export default NodePalette;
