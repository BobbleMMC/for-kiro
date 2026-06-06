import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

export interface ActionNodeData {
  label: string;
  actionType: string;
  target?: string;
  parameters?: Record<string, string>;
}

const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ActionNodeData;
  
  return (
    <div
      className={`min-w-[200px] rounded-lg border-2 shadow-lg ${
        selected
          ? 'border-blue-400 shadow-blue-500/30'
          : 'border-blue-600/50 shadow-blue-900/20'
      } bg-gradient-to-b from-blue-950 to-blue-900`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
        id="input"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-700/50 bg-blue-800/30 rounded-t-lg">
        <Play size={14} className="text-blue-400" />
        <span className="text-xs font-bold text-blue-200 uppercase tracking-wide">
          Action
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        <div className="text-sm font-semibold text-blue-100 mb-1">
          {nodeData.label || 'Execute Action'}
        </div>
        <div className="text-xs text-blue-300/70">
          {nodeData.actionType || 'custom'}
        </div>
        {nodeData.target && (
          <div className="text-xs text-blue-400/60 mt-1">
            Target: <span className="text-blue-300">{nodeData.target}</span>
          </div>
        )}
        {nodeData.parameters && Object.keys(nodeData.parameters).length > 0 && (
          <div className="mt-2 space-y-1">
            {Object.entries(nodeData.parameters).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-[10px]">
                <span className="text-blue-400">{key}:</span>
                <span className="text-blue-200 font-mono">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output Handle - chain to next action */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
        id="output"
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
export default ActionNode;
