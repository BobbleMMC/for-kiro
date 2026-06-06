import { FC } from 'react';
import { Grid3x3, Zap } from 'lucide-react';

export const CanvasWorkspace: FC<{ onOpenNodeEditor?: () => void }> = ({ onOpenNodeEditor }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Main Content */}
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
            <Grid3x3 size={64} className="text-blue-400 relative z-10" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Canvas Workspace</h2>
        <p className="text-slate-400 mb-8">
          Select an asset from the left panel or create a new editor to get started.
        </p>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-left hover:border-blue-500 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-slate-300">Editor Status</span>
            </div>
            <p className="text-xs text-slate-500">Ready</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-left hover:border-blue-500 transition-colors cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-yellow-500" />
              <span className="text-xs font-semibold text-slate-300">Performance</span>
            </div>
            <p className="text-xs text-slate-500">60 FPS</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <button 
            onClick={onOpenNodeEditor}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Node Editor
          </button>
          <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-lg transition-colors">
            + New Texture Canvas
          </button>
          <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium rounded-lg transition-colors">
            + New 3D Model
          </button>
        </div>
      </div>

      {/* Bottom Status */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-500">
        <span>Canvas v1.0</span>
        <span>Ready to edit</span>
      </div>
    </div>
  );
};
