import type { FC } from 'react';
import { Pickaxe, Settings, Menu } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';

interface HeaderProps {
  currentPage: 'dashboard' | 'workspace';
  onPageChange: (page: 'dashboard' | 'workspace') => void;
}

const Header: FC<HeaderProps> = ({ currentPage, onPageChange }) => {
  const { currentProject } = useProjectStore();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between h-full">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark">
            <Pickaxe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Minecraft Mod Generator
            </h1>
            {currentProject && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentProject.name} • {currentProject.minecraft_version}
              </p>
            )}
          </div>
        </div>

        {/* Center Navigation */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => onPageChange('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === 'dashboard'
                ? 'bg-primary text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Dashboard
          </button>
          {currentProject && (
            <button
              onClick={() => onPageChange('workspace')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === 'workspace'
                  ? 'bg-primary text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Workspace
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button className="p-2 sm:hidden hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
