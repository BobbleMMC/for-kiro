/**
 * Console panel — renders the project store's console log with a cap
 * and lightweight windowing.
 *
 * Performance design:
 *  - Subscribes to the store with a stable selector (logs only) so it
 *    re-renders only when logs actually change.
 *  - LogRow is React.memo'd; identity-stable thanks to the message id
 *    cap in the store.
 *  - Windowing renders only the last MAX_RENDER rows from the filtered
 *    list. Older entries stay in memory (capped at 200) but skip JSX
 *    cost — keeps DOM nodes ≤ 80 even on a busy build.
 *  - Auto-scroll uses requestAnimationFrame to coalesce consecutive log
 *    bursts into one paint.
 */
import { FC, memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Trash2, Copy } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import type { ConsoleMessage } from '../../types';

const MAX_RENDER = 80;

type Filter = 'all' | 'info' | 'warning' | 'error' | 'success';

const LEVEL_COLORS: Record<ConsoleMessage['level'], string> = {
  info: 'text-blue-400 bg-blue-500/5',
  warning: 'text-yellow-400 bg-yellow-500/5',
  error: 'text-red-400 bg-red-500/5',
  success: 'text-green-400 bg-green-500/5',
};

const LEVEL_ICONS: Record<ConsoleMessage['level'], string> = {
  info: 'i',
  warning: '!',
  error: 'x',
  success: '✓',
};

const formatTime = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString([], { hour12: false });
};

const LogRow = memo(function LogRow({ log }: { log: ConsoleMessage }) {
  const colorClass = LEVEL_COLORS[log.level];
  return (
    <div className={`flex items-start gap-2 px-2 py-1 rounded text-xs font-mono ${colorClass}`}>
      <span className="text-slate-500 flex-shrink-0 w-16">[{formatTime(log.timestamp)}]</span>
      <span className="flex-shrink-0 w-3 text-center">{LEVEL_ICONS[log.level]}</span>
      {log.source && <span className="flex-shrink-0 text-slate-500">[{log.source}]</span>}
      <span className="break-all">{log.message}</span>
    </div>
  );
});

export const Console: FC = () => {
  // Stable selectors — re-renders only when the specific slice changes.
  const consoleLogs = useProjectStore((s) => s.consoleLogs);
  const clearConsole = useProjectStore((s) => s.clearConsole);

  const [filter, setFilter] = useState<Filter>('all');
  const endRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const filteredLogs = useMemo(
    () => (filter === 'all' ? consoleLogs : consoleLogs.filter((l) => l.level === filter)),
    [consoleLogs, filter]
  );

  // Render only the last MAX_RENDER rows for performance.
  const visibleLogs = useMemo(
    () => filteredLogs.slice(-MAX_RENDER),
    [filteredLogs]
  );

  const hiddenCount = filteredLogs.length - visibleLogs.length;

  // Auto-scroll to bottom, coalesced via rAF so log bursts paint once.
  useEffect(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [visibleLogs]);

  const handleCopyAll = useCallback(() => {
    const text = filteredLogs
      .map((log) => `[${formatTime(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
  }, [filteredLogs]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Filter:</span>
          {(['all', 'info', 'warning', 'error', 'success'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
          <span className="text-xs text-slate-500 ml-4">
            {filteredLogs.length} / {consoleLogs.length} messages
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Copy all logs"
          >
            <Copy size={14} className="text-slate-400" />
          </button>
          <button
            onClick={clearConsole}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Clear console"
          >
            <Trash2 size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 p-3">
        {hiddenCount > 0 && (
          <div className="text-[10px] text-slate-500 italic px-2 py-1">
            … {hiddenCount} older entries hidden (showing last {MAX_RENDER})
          </div>
        )}
        {visibleLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p className="text-xs">No logs to display</p>
          </div>
        ) : (
          visibleLogs.map((log) => <LogRow key={log.id} log={log} />)
        )}
        <div ref={endRef} />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
        <span>● Ready</span>
        <span>{consoleLogs.length} total · cap 200</span>
      </div>
    </div>
  );
};
