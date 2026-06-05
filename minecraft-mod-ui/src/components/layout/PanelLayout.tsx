import { FC, ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PanelLayoutProps {
  header: ReactNode;
  assetExplorer: ReactNode;
  canvas: ReactNode;
  inspector: ReactNode;
  console: ReactNode;
}

export const PanelLayout: FC<PanelLayoutProps> = ({
  header,
  assetExplorer,
  canvas,
  inspector,
  console: consolePanel,
}) => {
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700">
        {header}
      </div>

      {/* Main Content Area with 3 columns */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel: Asset Explorer */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-auto">
          {assetExplorer}
        </div>

        {/* Center Panel: Canvas Workspace */}
        <div className="flex-1 bg-slate-900 border-r border-slate-700 overflow-auto">
          {canvas}
        </div>

        {/* Right Panel: Smart Inspector */}
        <div className="w-72 bg-slate-800 border-l border-slate-700 overflow-auto">
          {inspector}
        </div>
      </div>

      {/* Bottom Panel: Console (Collapsible) */}
      <div className="flex-shrink-0 border-t border-slate-700 bg-slate-850">
        {/* Console Collapse/Expand */}
        <button
          onClick={() => setConsoleCollapsed(!consoleCollapsed)}
          className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 transition-colors"
        >
          <span>📋 Console & AI Logs</span>
          {consoleCollapsed ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </button>

        {/* Console Content */}
        {!consoleCollapsed && (
          <div className="h-40 overflow-auto bg-slate-900">
            {consolePanel}
          </div>
        )}
      </div>
    </div>
  );
};
