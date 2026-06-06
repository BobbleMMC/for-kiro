import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export interface ConditionNodeData {
  label: string;
  conditionType: string;
  operator: string;
  leftValue?: string;
  rightValue?: string;
}

const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as ConditionNodeData;
  
  return (
    <div
      className={`min-w-[220px] rounded-lg border-2 shadow-lg ${
        selected
          ? 'border-yellow-400 shadow-yellow-500/30'
          : 'border-yellow-600/50 shadow-yellow-900/20'
      } bg-gradient-to-b from-yellow-950 to-yellow-900`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-yellow-300"
        id="input"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-yellow-700/50 bg-yellow-800/30 rounded-t-lg">
        <GitBranch size={14} className="text-yellow-400" />
        <span className="text-xs font-bold text-yellow-200 uppercase tracking-wide">
          Condition
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        <div className="text-sm font-semibold text-yellow-100 mb-1">
          {nodeData.label || 'If Condition'}
        </div>
        <div className="flex items-center gap-1 text-xs text-yellow-300/80 font-mono bg-yellow-950/50 px-2 py-1 rounded">
          <span>{nodeData.leftValue || 'value'}</span>
          <span className="text-yellow-400 font-bold">{nodeData.operator || '=='}</span>
          <span>{nodeData.rightValue || 'value'}</span>
        </div>
      </div>

      {/* Output Handles - True and False branches */}
      <div className="flex flex-col gap-4 absolute right-0 top-1/2 -translate-y-1/2">
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-300"
          id="true"
          style={{ top: '35%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-300"
          id="false"
          style={{ top: '65%' }}
        />
      </div>

      {/* Branch labels */}
      <div className="flex justify-end px-3 pb-2 gap-6">
        <span className="text-[10px] text-green-400 font-bold">TRUE</span>
        <span className="text-[10px] text-red-400 font-bold">FALSE</span>
      </div>
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
export default ConditionNode;
