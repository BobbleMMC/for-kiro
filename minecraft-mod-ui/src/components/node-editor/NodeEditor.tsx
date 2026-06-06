import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TriggerNode from './nodes/TriggerNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import ValueNode from './nodes/ValueNode';
import NodePalette from './NodePalette';

import { Plus, Save, Code, Trash2 } from 'lucide-react';

// Register custom node types
const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  value: ValueNode,
};

// Socket type compatibility map
const socketCompatibility: Record<string, string[]> = {
  output: ['input', 'true', 'false'],
  true: ['input'],
  false: ['input'],
};

// Initial demo nodes
const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 50, y: 150 },
    data: {
      label: 'Player Joins',
      eventType: 'onPlayerJoin',
      description: 'Fires when a player connects',
    },
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 350, y: 100 },
    data: {
      label: 'Is First Join?',
      conditionType: 'if',
      operator: '==',
      leftValue: 'player.firstJoin',
      rightValue: 'true',
    },
  },
  {
    id: 'action-1',
    type: 'action',
    position: { x: 680, y: 50 },
    data: {
      label: 'Welcome Message',
      actionType: 'sendMessage',
      target: 'player',
      parameters: { message: 'Welcome to the server!' },
    },
  },
  {
    id: 'action-2',
    type: 'action',
    position: { x: 680, y: 220 },
    data: {
      label: 'Give Starter Kit',
      actionType: 'giveItem',
      target: 'player',
      parameters: { item: 'diamond_sword', count: '1' },
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'trigger-1', target: 'condition-1', sourceHandle: 'output', targetHandle: 'input', animated: true, style: { stroke: '#ef4444' } },
  { id: 'e2', source: 'condition-1', target: 'action-1', sourceHandle: 'true', targetHandle: 'input', style: { stroke: '#22c55e' } },
  { id: 'e3', source: 'condition-1', target: 'action-2', sourceHandle: 'false', targetHandle: 'input', style: { stroke: '#ef4444' } },
];

interface NodeEditorProps {
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onGenerateCode?: (nodes: Node[], edges: Edge[]) => void;
}

export function NodeEditor({ onSave, onGenerateCode }: NodeEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showPalette, setShowPalette] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(5);

  // Validate connection compatibility
  const isValidConnection = useCallback((connection: Connection) => {
    const sourceHandle = connection.sourceHandle || 'output';
    const targetHandle = connection.targetHandle || 'input';
    const allowed = socketCompatibility[sourceHandle];
    return allowed ? allowed.includes(targetHandle) : false;
  }, []);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      let edgeColor = '#64748b';
      
      if (sourceNode?.type === 'trigger') edgeColor = '#ef4444';
      else if (connection.sourceHandle === 'true') edgeColor = '#22c55e';
      else if (connection.sourceHandle === 'false') edgeColor = '#ef4444';
      else if (sourceNode?.type === 'action') edgeColor = '#3b82f6';
      else if (sourceNode?.type === 'value') edgeColor = '#a855f7';

      const edge: Edge = {
        ...connection,
        id: `e-${Date.now()}`,
        style: { stroke: edgeColor },
        animated: sourceNode?.type === 'trigger',
      } as Edge;

      setEdges((eds) => addEdge(edge, eds));
    },
    [nodes, setEdges]
  );

  // Add new node from palette
  const addNode = useCallback(
    (type: string, data: Record<string, unknown>) => {
      const id = `${type}-${++nodeIdCounter.current}`;
      const newNode: Node = {
        id,
        type,
        position: { x: 400, y: 250 + Math.random() * 100 },
        data,
      };
      setNodes((nds) => [...nds, newNode]);
      setShowPalette(false);
    },
    [setNodes]
  );

  // Delete selected nodes
  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave?.(nodes, edges);
  }, [nodes, edges, onSave]);

  // Handle code generation
  const handleGenerateCode = useCallback(() => {
    onGenerateCode?.(nodes, edges);
  }, [nodes, edges, onGenerateCode]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className="bg-slate-950"
        defaultEdgeOptions={{
          style: { strokeWidth: 2 },
          type: 'smoothstep',
        }}
      >
        {/* Controls */}
        <Controls className="!bg-slate-800 !border-slate-700 !shadow-xl [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-white [&>button:hover]:!bg-slate-600" />

        {/* Minimap */}
        <MiniMap
          className="!bg-slate-900 !border-slate-700"
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#ef4444';
              case 'condition': return '#eab308';
              case 'action': return '#3b82f6';
              case 'value': return '#a855f7';
              default: return '#64748b';
            }
          }}
        />

        {/* Grid Background */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />

        {/* Top Toolbar */}
        <Panel position="top-left" className="flex gap-2">
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-white transition-colors"
          >
            <Plus size={14} />
            Add Node
          </button>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-red-700 border border-slate-600 rounded-lg text-sm text-white transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-green-700 border border-slate-600 rounded-lg text-sm text-white transition-colors"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={handleGenerateCode}
            className="flex items-center gap-2 px-3 py-2 bg-blue-700 hover:bg-blue-600 border border-blue-500 rounded-lg text-sm text-white transition-colors"
          >
            <Code size={14} />
            Generate Java
          </button>
        </Panel>

        {/* Node count info */}
        <Panel position="bottom-left" className="text-xs text-slate-500">
          Nodes: {nodes.length} | Edges: {edges.length}
        </Panel>
      </ReactFlow>

      {/* Node Palette Dropdown */}
      {showPalette && (
        <NodePalette onAddNode={addNode} onClose={() => setShowPalette(false)} />
      )}
    </div>
  );
}
