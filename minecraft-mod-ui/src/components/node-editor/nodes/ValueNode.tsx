import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hash, Type, ToggleLeft, Box } from 'lucide-react';

export interface ValueNodeData {
  label: string;
  valueType: 'integer' | 'float' | 'string' | 'boolean' | 'blockRef' | 'itemRef' | 'entityRef' | 'position';
  value: string;
}

const typeIcons: Record<string, typeof Hash> = {
  integer: Hash,
  float: Hash,
  string: Type,
  boolean: ToggleLeft,
  blockRef: Box,
  itemRef: Box,
  entityRef: Box,
  position: Box,
};

const typeColors: Record<string, { border: string; bg: string; text: string; handle: string }> = {
  integer: { border: 'border-green-600/50', bg: 'from-green-950 to-green-900', text: 'text-green-200', handle: '!bg-green-500 !border-green-300' },
  float: { border: 'border-green-600/50', bg: 'from-green-950 to-green-900', text: 'text-green-200', handle: '!bg-green-500 !border-green-300' },
  string: { border: 'border-pink-600/50', bg: 'from-pink-950 to-pink-900', text: 'text-pink-200', handle: '!bg-pink-500 !border-pink-300' },
  boolean: { border: 'border-orange-600/50', bg: 'from-orange-950 to-orange-900', text: 'text-orange-200', handle: '!bg-orange-500 !border-orange-300' },
  blockRef: { border: 'border-purple-600/50', bg: 'from-purple-950 to-purple-900', text: 'text-purple-200', handle: '!bg-purple-500 !border-purple-300' },
  itemRef: { border: 'border-purple-600/50', bg: 'from-purple-950 to-purple-900', text: 'text-purple-200', handle: '!bg-purple-500 !border-purple-300' },
  entityRef: { border: 'border-purple-600/50', bg: 'from-purple-950 to-purple-900', text: 'text-purple-200', handle: '!bg-purple-500 !border-purple-300' },
  position: { border: 'border-teal-600/50', bg: 'from-teal-950 to-teal-900', text: 'text-teal-200', handle: '!bg-teal-500 !border-teal-300' },
};

const ValueNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ValueNodeData;
  const colors = typeColors[nodeData.valueType] || typeColors.string;
  const Icon = typeIcons[nodeData.valueType] || Hash;

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 shadow-lg ${
        selected ? 'border-white/50 shadow-white/10' : colors.border
      } bg-gradient-to-b ${colors.bg}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={12} className={colors.text} />
        <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
          {nodeData.valueType || 'Value'}
        </span>
      </div>

      {/* Value Display */}
      <div className="px-3 pb-3">
        <div className="text-xs text-slate-400 mb-1">{nodeData.label}</div>
        <div className={`text-sm font-mono font-semibold ${colors.text} bg-black/20 px-2 py-1 rounded`}>
          {nodeData.value || '(empty)'}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className={`!w-3 !h-3 !border-2 ${colors.handle}`}
        id="output"
      />
    </div>
  );
});

ValueNode.displayName = 'ValueNode';
export default ValueNode;
