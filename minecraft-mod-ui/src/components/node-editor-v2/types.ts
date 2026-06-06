/**
 * Visual Scripting v2 — Type System
 * Full Blueprint-style type definitions for the advanced node editor
 */

export type SocketType =
  | 'exec' | 'integer' | 'float' | 'string' | 'boolean'
  | 'entity' | 'block' | 'item' | 'position' | 'level'
  | 'player' | 'nbt' | 'array' | 'any';

export const SOCKET_COLORS: Record<SocketType, string> = {
  exec: '#ffffff', integer: '#22c55e', float: '#86efac', string: '#ec4899',
  boolean: '#ef4444', entity: '#a855f7', block: '#92400e', item: '#f97316',
  position: '#06b6d4', level: '#3b82f6', player: '#eab308', nbt: '#6b7280',
  array: '#14b8a6', any: '#94a3b8',
};

export type NodeCategory = 'trigger' | 'condition' | 'action' | 'variable' | 'math' | 'flow' | 'function' | 'data';

export const CATEGORY_COLORS: Record<NodeCategory, { bg: string; border: string; text: string }> = {
  trigger: { bg: 'from-red-950 to-red-900', border: 'border-red-600', text: 'text-red-300' },
  condition: { bg: 'from-yellow-950 to-yellow-900', border: 'border-yellow-600', text: 'text-yellow-300' },
  action: { bg: 'from-blue-950 to-blue-900', border: 'border-blue-600', text: 'text-blue-300' },
  variable: { bg: 'from-green-950 to-green-900', border: 'border-green-600', text: 'text-green-300' },
  math: { bg: 'from-emerald-950 to-emerald-900', border: 'border-emerald-600', text: 'text-emerald-300' },
  flow: { bg: 'from-slate-800 to-slate-700', border: 'border-slate-500', text: 'text-slate-300' },
  function: { bg: 'from-purple-950 to-purple-900', border: 'border-purple-600', text: 'text-purple-300' },
  data: { bg: 'from-cyan-950 to-cyan-900', border: 'border-cyan-600', text: 'text-cyan-300' },
};

export interface PortDef {
  id: string;
  label: string;
  type: SocketType;
  direction: 'input' | 'output';
  defaultValue?: string | number | boolean;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  inputs: PortDef[];
  outputs: PortDef[];
  isCompact?: boolean;
  isPure?: boolean;
  keywords?: string[];
}

export interface Variable {
  id: string;
  name: string;
  type: SocketType;
  scope: 'local' | 'global' | 'persistent';
  defaultValue: string;
}

export interface ExecutionState {
  activeNodeId: string | null;
  breakpoints: Set<string>;
  executionPath: string[];
  isPaused: boolean;
  isRunning: boolean;
}
