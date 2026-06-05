import type { FC } from 'react';
import { useRef, useEffect } from 'react';
import { Trash2, Copy } from 'lucide-react';
import type { ConsoleMessage } from '../../types';

interface ConsoleProps {
  messages: ConsoleMessage[];
  onClear: () => void;
}

const Console: FC<ConsoleProps> = ({ messages, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getLevelBgColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-slate-50 dark:bg-slate-900/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Console Output
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Clear console"
        >
          <Trash2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Console Messages */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
        {messages.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">
            No console output yet...
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 p-2 rounded ${getLevelBgColor(msg.level)} group hover:bg-opacity-100 transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  {/* Timestamp */}
                  <span className="text-slate-500 dark:text-slate-500 flex-shrink-0">
                    [{msg.timestamp.toLocaleTimeString()}]
                  </span>

                  {/* Source */}
                  {msg.source && (
                    <span className="text-primary dark:text-primary flex-shrink-0">
                      {msg.source}:
                    </span>
                  )}

                  {/* Level Badge */}
                  <span className={`font-semibold flex-shrink-0 ${getLevelColor(msg.level)}`}>
                    {msg.level.toUpperCase()}
                  </span>

                  {/* Message */}
                  <span className={`flex-1 break-words ${getLevelColor(msg.level)}`}>
                    {msg.message}
                  </span>
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(msg.message);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded flex-shrink-0"
                title="Copy message"
              >
                <Copy className="w-3 h-3 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Console Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ready for input...
        </p>
      </div>
    </div>
  );
};

export default Console;
