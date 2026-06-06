import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

export interface TriggerNodeData {
  label: string;
  eventType: string;
  description?: string;
}

const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as TriggerNodeData;
  
  return (
    <div
      className={`min-w-[200px] rounded-lg border-2 shadow-lg ${
        selected
          ? 'border-red-400 shadow-red-500/30'
          : 'border-red-600/50 shadow-red-900/20'
      } bg-gradient-to-b from-red-950 to-red-900`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-red-700/50 bg-red-800/30 rounded-t-lg">
        <Zap size={14} className="text-red-400" />
        <span className="text-xs font-bold text-red-200 uppercase tracking-wide">
          Event Trigger
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        <div className="text-sm font-semibold text-red-100 mb-1">
          {nodeData.label || 'Unnamed Event'}
        </div>
        <div className="text-xs text-red-300/70">
          {nodeData.eventType || 'onCustomEvent'}
        </div>
        {nodeData.description && (
          <div className="text-xs text-red-400/60 mt-1 italic">
            {nodeData.description}
          </div>
        )}
      </div>

      {/* Output Handle - only output (this is an entry point) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-300"
        id="output"
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
export default TriggerNode;
