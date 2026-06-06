/**
 * Performance Profiler — Unity Profiler inspired
 * Real-time TPS monitoring, memory usage, entity count, handler timing
 */
import { useState, useEffect, useRef, type FC } from 'react';
import { Activity, Cpu, HardDrive, Users, AlertTriangle, Play, Pause, RotateCcw, Download, ChevronDown, ChevronRight, Gauge, Clock, Zap } from 'lucide-react';

interface ProfileFrame { tick: number; tps: number; msPerTick: number; entityCount: number; memoryMB: number; handlers: { name: string; timeMs: number; calls: number }[]; }
interface ProfileWarning { id: string; message: string; severity: 'warning' | 'critical'; }

function generateMockFrame(tick: number): ProfileFrame {
  const baseTps = 19.5 + Math.random() * 1.5;
  const spike = Math.random() > 0.95 ? Math.random() * 10 : 0;
  const tps = Math.max(5, baseTps - spike * 3);
  return {
    tick, tps: Math.round(tps * 10) / 10, msPerTick: Math.round((1000 / tps) * 100) / 100,
    entityCount: 120 + Math.floor(Math.random() * 80), memoryMB: 280 + Math.floor(Math.random() * 100),
    handlers: [
      { name: 'onBlockBreak', timeMs: 0.5 + Math.random() * 2 + spike * 3, calls: Math.floor(Math.random() * 5) },
      { name: 'onEntityTick', timeMs: 1.0 + Math.random() * 1.5, calls: 50 + Math.floor(Math.random() * 100) },
      { name: 'onPlayerMove', timeMs: 0.3 + Math.random() * 0.5, calls: Math.floor(Math.random() * 8) },
      { name: 'onChunkLoad', timeMs: Math.random() * 3, calls: Math.floor(Math.random() * 3) },
      { name: 'customHandler', timeMs: spike * 5, calls: spike > 0 ? 1 : 0 },
    ].filter(h => h.calls > 0),
  };
}

export const Profiler: FC = () => {
  const [isRecording, setIsRecording] = useState(true);
  const [frames, setFrames] = useState<ProfileFrame[]>([]);
  const [warnings, setWarnings] = useState<ProfileWarning[]>([]);
  const [expandHandlers, setExpandHandlers] = useState(true);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      tickRef.current++;
      const frame = generateMockFrame(tickRef.current);
      setFrames(prev => [...prev, frame].slice(-500));
      if (frame.tps < 15) setWarnings(prev => [...prev, { id: `w${Date.now()}`, message: `TPS dropped to ${frame.tps}`, severity: 'critical' }].slice(-20));
    }, 50);
    return () => clearInterval(interval);
  }, [isRecording]);

  const latest = frames[frames.length - 1];
  const avgTps = frames.length > 0 ? (frames.slice(-100).reduce((s, f) => s + f.tps, 0) / Math.min(100, frames.length)).toFixed(1) : '—';

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-sm">
      {/* Header */}
      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <Gauge size={16} className="text-emerald-400" />
        <span className="text-sm font-bold text-slate-100">Performance Profiler</span>
        <div className="flex-1" />
        <button onClick={() => setIsRecording(!isRecording)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isRecording ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {isRecording ? <Pause size={12} /> : <Play size={12} />}
          {isRecording ? 'Pause' : 'Record'}
        </button>
        <button onClick={() => { setFrames([]); setWarnings([]); }} className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><RotateCcw size={14} /></button>
        <button className="p-1.5 hover:bg-slate-700 rounded text-slate-400"><Download size={14} /></button>
        <span className="text-[10px] text-slate-500">{frames.length} frames</span>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-slate-700 grid grid-cols-4 gap-3">
        {[
          { icon: Activity, label: 'TPS', value: latest ? `${latest.tps}` : '—', sub: `avg: ${avgTps}/20`, color: 'text-green-400', warn: latest && latest.tps < 15 },
          { icon: Clock, label: 'MS/Tick', value: latest ? `${latest.msPerTick.toFixed(1)}` : '—', sub: 'target: <50ms', color: 'text-blue-400', warn: latest && latest.msPerTick > 50 },
          { icon: Users, label: 'Entities', value: latest ? `${latest.entityCount}` : '—', sub: 'loaded', color: 'text-purple-400', warn: latest && latest.entityCount > 300 },
          { icon: HardDrive, label: 'Memory', value: latest ? `${latest.memoryMB}` : '—', sub: 'MB / 2048', color: 'text-orange-400', warn: latest && latest.memoryMB > 350 },
        ].map(({ icon: Icon, label, value, sub, color, warn }) => (
          <div key={label} className={`px-3 py-2 rounded-lg border ${warn ? 'border-red-600 bg-red-950/30' : 'border-slate-700 bg-slate-800/50'}`}>
            <div className="flex items-center gap-2 mb-1"><Icon size={12} className={color} /><span className="text-[9px] text-slate-400 uppercase font-bold">{label}</span>{warn && <AlertTriangle size={10} className="text-red-400" />}</div>
            <div className="text-lg font-bold text-white leading-none">{value}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="px-4 py-2 border-b border-slate-700">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Frame Timeline (last 100)</span>
          <div className="flex gap-3 text-[9px] text-slate-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-sm" /> Good</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-sm" /> Warn</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-sm" /> Bad</span>
          </div>
        </div>
        <div className="flex items-end gap-px h-14 bg-slate-950 rounded-lg border border-slate-700 px-1 overflow-hidden">
          {frames.slice(-100).map((frame, i) => {
            const height = Math.min(100, (frame.msPerTick / 65) * 100);
            return <div key={i} className={`flex-shrink-0 w-1.5 rounded-t-sm ${frame.tps < 15 ? 'bg-red-500' : frame.tps < 18 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ height: `${Math.max(4, height)}%` }} />;
          })}
        </div>
      </div>

      {/* Handlers */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div>
          <button onClick={() => setExpandHandlers(!expandHandlers)} className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mb-2">
            {expandHandlers ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            <Zap size={11} /> Top Handlers
          </button>
          {expandHandlers && latest && (
            <div className="space-y-1">
              {latest.handlers.sort((a, b) => b.timeMs - a.timeMs).map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-28 truncate font-mono">{h.name}</span>
                  <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${h.timeMs > 5 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, h.timeMs / 10 * 100)}%` }} />
                  </div>
                  <span className={`text-[10px] font-mono w-14 text-right ${h.timeMs > 5 ? 'text-red-400' : 'text-slate-300'}`}>{h.timeMs.toFixed(2)}ms</span>
                  <span className="text-[9px] text-slate-500 w-6 text-right">×{h.calls}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {warnings.length > 0 && (
          <div>
            <span className="text-[10px] font-bold text-yellow-400 uppercase flex items-center gap-1"><AlertTriangle size={11} /> Warnings ({warnings.length})</span>
            <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
              {warnings.slice(-8).reverse().map(w => (
                <div key={w.id} className={`px-2 py-1 rounded text-[10px] border ${w.severity === 'critical' ? 'border-red-700 bg-red-950/30 text-red-300' : 'border-yellow-700 bg-yellow-950/30 text-yellow-300'}`}>{w.message}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-1.5 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
        <span>{isRecording ? '● Recording' : '⏸ Paused'}</span>
        <span>Profiler v1.0</span>
      </div>
    </div>
  );
};
