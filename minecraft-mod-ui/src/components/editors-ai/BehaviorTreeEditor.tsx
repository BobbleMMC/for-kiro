/**
 * Mob AI Behavior Tree Editor
 * Visual drag-and-drop editor for entity AI behavior trees
 * Supports: Selector (priority), Sequence (ordered), Decorator, Action leaf nodes
 * Based on Minecraft's Goal/Target system (PathfinderGoal equivalents)
 */
import { useState, useCallback, useRef, type FC } from 'react';
import {
  GitBranch,
  ListOrdered,
  Repeat,
  Zap,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  Download,
  Copy,
  GripVertical,
  Shield,
  Crosshair,
  Footprints,
  Eye,
  Heart,
  Flame,
  Target,
  Navigation,
} from 'lucide-react';

// ==================== Types ====================

type BehaviorNodeType = 'selector' | 'sequence' | 'decorator' | 'action';

interface BehaviorNode {
  id: string;
  type: BehaviorNodeType;
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  children: BehaviorNode[];
  // Action-specific
  actionType?: string;
  parameters?: Record<string, string | number | boolean>;
  // Decorator-specific
  decoratorType?: 'repeat' | 'invert' | 'cooldown' | 'probability';
  decoratorValue?: number;
}

interface BehaviorTemplate {
  name: string;
  icon: typeof Zap;
  color: string;
  description: string;
  node: Partial<BehaviorNode>;
}

// ==================== Prebuilt AI Goal Templates ====================

const goalTemplates: BehaviorTemplate[] = [
  {
    name: 'Melee Attack',
    icon: Crosshair,
    color: 'text-red-400',
    description: 'Attack target in melee range',
    node: { type: 'action', actionType: 'meleeAttack', parameters: { speed: 1.0, followRange: 16 } },
  },
  {
    name: 'Ranged Attack',
    icon: Target,
    color: 'text-orange-400',
    description: 'Attack target with projectile',
    node: { type: 'action', actionType: 'rangedAttack', parameters: { speed: 1.0, cooldown: 40, range: 15 } },
  },
  {
    name: 'Wander',
    icon: Footprints,
    color: 'text-green-400',
    description: 'Random wandering movement',
    node: { type: 'action', actionType: 'wander', parameters: { speed: 0.8, radius: 10 } },
  },
  {
    name: 'Look at Player',
    icon: Eye,
    color: 'text-blue-400',
    description: 'Face nearest player',
    node: { type: 'action', actionType: 'lookAtPlayer', parameters: { range: 8.0 } },
  },
  {
    name: 'Flee',
    icon: Navigation,
    color: 'text-yellow-400',
    description: 'Run away from threat',
    node: { type: 'action', actionType: 'flee', parameters: { speed: 1.5, fleeDistance: 16 } },
  },
  {
    name: 'Follow Owner',
    icon: Heart,
    color: 'text-pink-400',
    description: 'Follow tamed owner',
    node: { type: 'action', actionType: 'followOwner', parameters: { speed: 1.0, minDist: 2, maxDist: 10 } },
  },
  {
    name: 'Defend Village',
    icon: Shield,
    color: 'text-purple-400',
    description: 'Protect nearby villagers',
    node: { type: 'action', actionType: 'defendVillage', parameters: { range: 32 } },
  },
  {
    name: 'Burn in Sunlight',
    icon: Flame,
    color: 'text-amber-400',
    description: 'Take damage from sun exposure',
    node: { type: 'action', actionType: 'sunlightDamage', parameters: { damage: 1.0 } },
  },
];

const compositeTemplates: BehaviorTemplate[] = [
  {
    name: 'Selector (Priority)',
    icon: GitBranch,
    color: 'text-emerald-400',
    description: 'Try children in order, stop on first success',
    node: { type: 'selector', children: [] },
  },
  {
    name: 'Sequence (Ordered)',
    icon: ListOrdered,
    color: 'text-cyan-400',
    description: 'Execute all children in order, fail on first failure',
    node: { type: 'sequence', children: [] },
  },
  {
    name: 'Repeat Decorator',
    icon: Repeat,
    color: 'text-violet-400',
    description: 'Repeat child N times',
    node: { type: 'decorator', decoratorType: 'repeat', decoratorValue: 3, children: [] },
  },
];

// ==================== Tree Node Component ====================

interface TreeNodeProps {
  node: BehaviorNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string, child: BehaviorNode) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

const TreeNodeComponent: FC<TreeNodeProps> = ({
  node,
  depth,
  selectedId,
  onSelect,
  onDelete,
  onToggle,
  onAddChild,
  onMove,
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.id === selectedId;
  const isComposite = node.type === 'selector' || node.type === 'sequence' || node.type === 'decorator';

  const getNodeIcon = () => {
    switch (node.type) {
      case 'selector': return GitBranch;
      case 'sequence': return ListOrdered;
      case 'decorator': return Repeat;
      case 'action': return Zap;
      default: return Zap;
    }
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'selector': return 'border-emerald-600 bg-emerald-950/50';
      case 'sequence': return 'border-cyan-600 bg-cyan-950/50';
      case 'decorator': return 'border-violet-600 bg-violet-950/50';
      case 'action': return 'border-blue-600 bg-blue-950/50';
      default: return 'border-slate-600 bg-slate-900';
    }
  };

  const getTypeLabel = () => {
    switch (node.type) {
      case 'selector': return 'SELECTOR';
      case 'sequence': return 'SEQUENCE';
      case 'decorator': return `DECORATOR (${node.decoratorType})`;
      case 'action': return 'ACTION';
      default: return 'NODE';
    }
  };

  const Icon = getNodeIcon();

  return (
    <div style={{ marginLeft: depth * 20 }}>
      {/* Node Row */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border mb-1 cursor-pointer transition-all ${
          isSelected
            ? `${getNodeColor()} ring-1 ring-white/20 shadow-lg`
            : `${getNodeColor()} hover:border-slate-500 opacity-90`
        } ${!node.enabled ? 'opacity-40' : ''}`}
        onClick={() => onSelect(node.id)}
      >
        {/* Drag handle */}
        <GripVertical size={12} className="text-slate-500 cursor-grab" />

        {/* Expand/collapse */}
        {isComposite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5"
          >
            {expanded ? (
              <ChevronDown size={12} className="text-slate-400" />
            ) : (
              <ChevronRight size={12} className="text-slate-400" />
            )}
          </button>
        )}
        {!isComposite && <div className="w-4" />}

        {/* Icon */}
        <Icon size={14} className={
          node.type === 'selector' ? 'text-emerald-400' :
          node.type === 'sequence' ? 'text-cyan-400' :
          node.type === 'decorator' ? 'text-violet-400' :
          'text-blue-400'
        } />

        {/* Name & Type */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-200 truncate">{node.name}</div>
          <div className="text-[9px] text-slate-500">{getTypeLabel()}</div>
        </div>

        {/* Priority badge */}
        <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
          P{node.priority}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove(node.id, 'up');
            }}
            className="p-0.5 hover:bg-slate-600 rounded text-slate-500 hover:text-white text-[10px]"
            title="Move Up"
          >
            ↑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove(node.id, 'down');
            }}
            className="p-0.5 hover:bg-slate-600 rounded text-slate-500 hover:text-white text-[10px]"
            title="Move Down"
          >
            ↓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-0.5 hover:bg-red-900/50 rounded text-slate-500 hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="border-l border-slate-700 ml-4 pl-1">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== Main Component ====================

export const BehaviorTreeEditor: FC = () => {
  const idCounter = useRef(10);
  const generateId = () => `bt_${++idCounter.current}`;

  // Initial demo tree: Zombie-like AI
  const [tree, setTree] = useState<BehaviorNode>({
    id: 'root',
    type: 'selector',
    name: 'Root Selector',
    priority: 0,
    enabled: true,
    children: [
      {
        id: 'combat_seq',
        type: 'sequence',
        name: 'Combat Behavior',
        priority: 1,
        enabled: true,
        children: [
          {
            id: 'find_target',
            type: 'action',
            name: 'Find Nearest Player',
            actionType: 'findTarget',
            priority: 1,
            enabled: true,
            children: [],
            parameters: { range: 16, targetType: 'player' },
          },
          {
            id: 'chase',
            type: 'action',
            name: 'Chase Target',
            actionType: 'pathfindToTarget',
            priority: 2,
            enabled: true,
            children: [],
            parameters: { speed: 1.2, stopDistance: 2 },
          },
          {
            id: 'attack',
            type: 'action',
            name: 'Melee Attack',
            actionType: 'meleeAttack',
            priority: 3,
            enabled: true,
            children: [],
            parameters: { damage: 3.0, cooldown: 20 },
          },
        ],
      },
      {
        id: 'idle_seq',
        type: 'sequence',
        name: 'Idle Behavior',
        priority: 5,
        enabled: true,
        children: [
          {
            id: 'wander',
            type: 'action',
            name: 'Random Wander',
            actionType: 'wander',
            priority: 1,
            enabled: true,
            children: [],
            parameters: { speed: 0.6, radius: 8 },
          },
          {
            id: 'look',
            type: 'action',
            name: 'Look Around',
            actionType: 'lookAtPlayer',
            priority: 2,
            enabled: true,
            children: [],
            parameters: { range: 8 },
          },
        ],
      },
    ],
  });

  const [selectedId, setSelectedId] = useState<string | null>('root');

  // ===== Tree Operations =====

  const findNode = useCallback((root: BehaviorNode, id: string): BehaviorNode | null => {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const findParent = useCallback((root: BehaviorNode, childId: string): BehaviorNode | null => {
    for (const child of root.children) {
      if (child.id === childId) return root;
      const found = findParent(child, childId);
      if (found) return found;
    }
    return null;
  }, []);

  const updateTree = useCallback((updater: (root: BehaviorNode) => BehaviorNode) => {
    setTree((prev) => updater(JSON.parse(JSON.stringify(prev))));
  }, []);

  const addChild = useCallback((parentId: string, template: Partial<BehaviorNode>) => {
    updateTree((root) => {
      const parent = findNode(root, parentId);
      if (!parent) return root;
      if (parent.type === 'action') return root; // Can't add children to action nodes

      const newNode: BehaviorNode = {
        id: generateId(),
        type: template.type || 'action',
        name: template.name || 'New Node',
        priority: parent.children.length + 1,
        enabled: true,
        children: template.children || [],
        actionType: template.actionType,
        parameters: template.parameters as Record<string, string | number | boolean>,
        decoratorType: template.decoratorType,
        decoratorValue: template.decoratorValue,
      };

      parent.children.push(newNode);
      return root;
    });
  }, [updateTree, findNode]);

  const deleteNode = useCallback((id: string) => {
    if (id === 'root') return;
    updateTree((root) => {
      const parent = findParent(root, id);
      if (parent) {
        parent.children = parent.children.filter((c) => c.id !== id);
      }
      return root;
    });
    if (selectedId === id) setSelectedId(null);
  }, [updateTree, findParent, selectedId]);

  const toggleNode = useCallback((id: string) => {
    updateTree((root) => {
      const node = findNode(root, id);
      if (node) node.enabled = !node.enabled;
      return root;
    });
  }, [updateTree, findNode]);

  const moveNode = useCallback((id: string, direction: 'up' | 'down') => {
    updateTree((root) => {
      const parent = findParent(root, id);
      if (!parent) return root;

      const index = parent.children.findIndex((c) => c.id === id);
      if (index === -1) return root;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= parent.children.length) return root;

      const temp = parent.children[index];
      parent.children[index] = parent.children[newIndex];
      parent.children[newIndex] = temp;

      return root;
    });
  }, [updateTree, findParent]);

  const updateNodeProperty = useCallback((id: string, key: string, value: unknown) => {
    updateTree((root) => {
      const node = findNode(root, id);
      if (node) {
        (node as any)[key] = value;
      }
      return root;
    });
  }, [updateTree, findNode]);

  const updateNodeParam = useCallback((id: string, paramKey: string, value: string | number | boolean) => {
    updateTree((root) => {
      const node = findNode(root, id);
      if (node) {
        if (!node.parameters) node.parameters = {};
        node.parameters[paramKey] = value;
      }
      return root;
    });
  }, [updateTree, findNode]);

  const selectedNode = selectedId ? findNode(tree, selectedId) : null;

  // ===== Render =====

  return (
    <div className="flex w-full h-full bg-slate-900">
      {/* Left - Template Palette */}
      <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700">
          <span className="text-xs font-bold text-slate-200">AI Goal Templates</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Composite Nodes */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase px-1 mb-1">Composite</h4>
            <div className="space-y-1">
              {compositeTemplates.map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => selectedId && addChild(selectedId, { ...tmpl.node, name: tmpl.name })}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-slate-700 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left"
                  title={`Add to selected: ${tmpl.description}`}
                >
                  <tmpl.icon size={12} className={tmpl.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-slate-300 truncate">{tmpl.name}</div>
                    <div className="text-[9px] text-slate-500 truncate">{tmpl.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Nodes (Goals) */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase px-1 mb-1">Goals / Actions</h4>
            <div className="space-y-1">
              {goalTemplates.map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => selectedId && addChild(selectedId, { ...tmpl.node, name: tmpl.name })}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded border border-slate-700 hover:border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left"
                  title={tmpl.description}
                >
                  <tmpl.icon size={12} className={tmpl.color} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-slate-300 truncate">{tmpl.name}</div>
                    <div className="text-[9px] text-slate-500 truncate">{tmpl.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center - Behavior Tree */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Behavior Tree</span>

          <div className="flex-1" />

          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400" title="Save">
            <Save size={14} />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400" title="Duplicate Tree">
            <Copy size={14} />
          </button>
          <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-purple-400" title="Export JSON">
            <Download size={14} />
          </button>
        </div>

        {/* Tree View */}
        <div className="flex-1 overflow-y-auto p-4">
          <TreeNodeComponent
            node={tree}
            depth={0}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={deleteNode}
            onToggle={toggleNode}
            onAddChild={addChild}
            onMove={moveNode}
          />

          {/* Empty state hint */}
          {tree.children.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              <p>Tree is empty. Select the root node and add children from the template palette.</p>
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
          <span>Total nodes: {countNodes(tree)}</span>
          <span>Entity AI · Behavior Tree v1.0</span>
        </div>
      </div>

      {/* Right - Inspector */}
      <div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700">
          <span className="text-xs font-bold text-slate-200">Node Inspector</span>
        </div>

        {selectedNode ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
              <input
                type="text"
                value={selectedNode.name}
                onChange={(e) => updateNodeProperty(selectedNode.id, 'name', e.target.value)}
                className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white"
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
              <div className="mt-1 px-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-300 capitalize">
                {selectedNode.type}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Priority</label>
              <input
                type="number"
                min={0}
                max={99}
                value={selectedNode.priority}
                onChange={(e) => updateNodeProperty(selectedNode.id, 'priority', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white"
              />
              <p className="text-[9px] text-slate-500 mt-0.5">Lower = higher priority</p>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Enabled</label>
              <button
                onClick={() => toggleNode(selectedNode.id)}
                className={`px-3 py-1 rounded text-[10px] font-bold ${
                  selectedNode.enabled
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-600 text-slate-400'
                }`}
              >
                {selectedNode.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Decorator settings */}
            {selectedNode.type === 'decorator' && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Decorator Type</label>
                <select
                  value={selectedNode.decoratorType || 'repeat'}
                  onChange={(e) => updateNodeProperty(selectedNode.id, 'decoratorType', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                >
                  <option value="repeat">Repeat N Times</option>
                  <option value="invert">Invert Result</option>
                  <option value="cooldown">Cooldown (ticks)</option>
                  <option value="probability">Probability (%)</option>
                </select>

                <label className="text-[10px] font-bold text-slate-400 uppercase mt-3 block">Value</label>
                <input
                  type="number"
                  value={selectedNode.decoratorValue || 1}
                  onChange={(e) => updateNodeProperty(selectedNode.id, 'decoratorValue', parseFloat(e.target.value) || 1)}
                  className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                />
              </div>
            )}

            {/* Action Parameters */}
            {selectedNode.type === 'action' && selectedNode.parameters && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Parameters</label>
                <div className="mt-2 space-y-2">
                  {Object.entries(selectedNode.parameters).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-[9px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        step={typeof value === 'number' ? '0.1' : undefined}
                        value={String(value)}
                        onChange={(e) => {
                          const newVal = typeof value === 'number'
                            ? parseFloat(e.target.value) || 0
                            : e.target.value;
                          updateNodeParam(selectedNode.id, key, newVal);
                        }}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-[10px] text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Type */}
            {selectedNode.type === 'action' && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Action Type</label>
                <input
                  type="text"
                  value={selectedNode.actionType || ''}
                  onChange={(e) => updateNodeProperty(selectedNode.id, 'actionType', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white font-mono"
                />
              </div>
            )}

            {/* Children count */}
            {(selectedNode.type === 'selector' || selectedNode.type === 'sequence') && (
              <div className="pt-2 border-t border-slate-700">
                <div className="text-[10px] text-slate-500">
                  Children: <span className="text-slate-300">{selectedNode.children.length}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-xs text-slate-500">
              <GitBranch size={32} className="mx-auto mb-2 text-slate-600" />
              <p>Select a node to edit its properties</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to count all nodes recursively
function countNodes(node: BehaviorNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}
