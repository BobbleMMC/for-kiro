import type { FC } from 'react';
import { useProjectStore } from '../../stores/projectStore';

const Workspace: FC = () => {
  const { currentProject } = useProjectStore();

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            No project selected
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Select a project from the dashboard to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Workspace Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {currentProject.name}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Minecraft {currentProject.minecraft_version} • {currentProject.mod_loader}
        </p>
      </div>

      {/* Workspace Content Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - File Explorer (placeholder) */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            File Explorer
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            File explorer will be implemented in Phase 2
          </p>
        </div>

        {/* Center Panel - Editor Area */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
          {/* Editor Toolbar */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Code editor and content editor will be implemented in Phase 3
            </p>
          </div>

          {/* Editor Content (placeholder) */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-500 dark:text-slate-400">
                Select an item from the sidebar to start editing
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Properties
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            Properties panel will be implemented in Phase 3
          </p>
        </div>
      </div>

      {/* Bottom Console */}
      <div className="h-48 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Console Output
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Console and build output will appear here...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
