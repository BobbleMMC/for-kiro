import { useState, type FC } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { FileExplorer } from '../editors/FileExplorer';
import { RecipeEditor } from '../editors/RecipeEditor';
import { EntityEditor } from '../editors/EntityEditor';
import { EnchantmentEditor } from '../editors/EnchantmentEditor';
import { BiomeEditor } from '../editors/BiomeEditor';
import { TextureSelector } from '../editors/TextureSelector';
import { ResourcePackManager } from '../editors/ResourcePackManager';
import { ExportMod } from '../editors/ExportMod';
import { Package, Settings, Code2, Palette, Globe, Zap } from 'lucide-react';

type EditorTab = 'overview' | 'recipes' | 'entities' | 'enchantments' | 'biomes' | 'textures' | 'resources' | 'export';

const Workspace: FC = () => {
  const { currentProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<EditorTab>('overview');

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

      {/* Workspace Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6">
          <div className="flex gap-2 overflow-x-auto">
            <TabButton
              icon={<Settings size={18} />}
              label="Overview"
              isActive={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              icon={<Zap size={18} />}
              label="Recipes"
              isActive={activeTab === 'recipes'}
              onClick={() => setActiveTab('recipes')}
            />
            <TabButton
              icon={<Package size={18} />}
              label="Entities"
              isActive={activeTab === 'entities'}
              onClick={() => setActiveTab('entities')}
            />
            <TabButton
              icon={<Zap size={18} />}
              label="Enchantments"
              isActive={activeTab === 'enchantments'}
              onClick={() => setActiveTab('enchantments')}
            />
            <TabButton
              icon={<Globe size={18} />}
              label="Biomes"
              isActive={activeTab === 'biomes'}
              onClick={() => setActiveTab('biomes')}
            />
            <TabButton
              icon={<Palette size={18} />}
              label="Textures"
              isActive={activeTab === 'textures'}
              onClick={() => setActiveTab('textures')}
            />
            <TabButton
              icon={<Package size={18} />}
              label="Resources"
              isActive={activeTab === 'resources'}
              onClick={() => setActiveTab('resources')}
            />
            <TabButton
              icon={<Code2 size={18} />}
              label="Export"
              isActive={activeTab === 'export'}
              onClick={() => setActiveTab('export')}
            />
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Project Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Mod Loader</p>
                      <p className="font-semibold">{currentProject.mod_loader}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Minecraft Version</p>
                      <p className="font-semibold">{currentProject.minecraft_version}</p>
                    </div>
                  </div>
                </div>
                <FileExplorer />
              </div>
            )}

            {/* Recipes Tab */}
            {activeTab === 'recipes' && (
              <RecipeEditor />
            )}

            {/* Entities Tab */}
            {activeTab === 'entities' && (
              <EntityEditor />
            )}

            {/* Enchantments Tab */}
            {activeTab === 'enchantments' && (
              <EnchantmentEditor />
            )}

            {/* Biomes Tab */}
            {activeTab === 'biomes' && (
              <BiomeEditor />
            )}

            {/* Textures Tab */}
            {activeTab === 'textures' && (
              <TextureSelector />
            )}

            {/* Resources Tab */}
            {activeTab === 'resources' && (
              <ResourcePackManager />
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <ExportMod />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: FC<TabButtonProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 font-medium transition whitespace-nowrap ${
      isActive
        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default Workspace;
