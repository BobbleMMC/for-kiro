import type { FC } from 'react';
import { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useProject, useContent, useBuild } from '../../hooks';
import { Button, Modal, Card } from '../../components/common';

interface DashboardProps {
  onProjectSelect?: () => void;
}

const Dashboard: FC<DashboardProps> = ({ onProjectSelect }) => {
  const { projects, setCurrentProject } = useProjectStore();
  const { createProject, selectProject } = useProject();
  const { getProjectBlocks, getProjectItems, getProjectRecipes } = useContent();
  const { getProjectBuilds } = useBuild();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    minecraft_version: '1.20.1',
    mod_loader: 'fabric' as const,
    mod_version: '1.0.0',
    author: '',
    namespace: '',
    description: '',
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();

    const newProject = createProject({
      name: formData.name,
      description: formData.description,
      minecraft_version: formData.minecraft_version,
      mod_loader: formData.mod_loader,
      mod_version: formData.mod_version,
      author: formData.author,
      namespace: formData.namespace,
      last_build_at: undefined,
    });

    setCurrentProject(newProject);
    selectProject(newProject);
    setShowCreateModal(false);
    setFormData({
      name: '',
      minecraft_version: '1.20.1',
      mod_loader: 'fabric',
      mod_version: '1.0.0',
      author: '',
      namespace: '',
      description: '',
    });

    onProjectSelect?.();
  };

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Projects
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Manage and create your Minecraft mod projects
        </p>
      </div>

      {/* Create Project Button */}
      <Button
        onClick={() => setShowCreateModal(true)}
        size="lg"
        icon={<Plus className="w-5 h-5" />}
        className="mb-8"
      >
        Create New Project
      </Button>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-500 dark:text-slate-400 mb-2">
            No projects yet
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Create your first Minecraft mod project to get started
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const blocks = getProjectBlocks(project.id);
            const items = getProjectItems(project.id);
            const recipes = getProjectRecipes(project.id);
            const builds = getProjectBuilds(project.id);

            return (
              <Card
                key={project.id}
                hoverable
                onClick={() => {
                  setCurrentProject(project);
                  selectProject(project);
                  onProjectSelect?.();
                }}
              >
                {/* Project Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {project.namespace}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                      <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Project Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded">
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Minecraft</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {project.minecraft_version}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded">
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Loader</p>
                    <p className="font-medium text-slate-900 dark:text-white capitalize">
                      {project.mod_loader}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded">
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Content</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {blocks.length + items.length} items
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded">
                    <p className="text-slate-600 dark:text-slate-400 text-xs">Builds</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {builds.length}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {/* Content Stats */}
                <div className="flex gap-2 mb-4 text-xs">
                  {blocks.length > 0 && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded">
                      {blocks.length} block{blocks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {items.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {recipes.length > 0 && (
                    <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 rounded">
                      {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => {
                    setCurrentProject(project);
                    selectProject(project);
                    onProjectSelect?.();
                  }}
                  variant="primary"
                  className="w-full"
                >
                  Open Project
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create New Project"
        onClose={() => setShowCreateModal(false)}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                handleCreateProject(e as any);
              }}
              className="flex-1"
            >
              Create Project
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              placeholder="My Awesome Mod"
            />
          </div>

          {/* Namespace */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Namespace *
            </label>
            <input
              type="text"
              required
              value={formData.namespace}
              onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              placeholder="mymod"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Author *
            </label>
            <input
              type="text"
              required
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              placeholder="Your Name"
            />
          </div>

          {/* Minecraft Version */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Minecraft Version
            </label>
            <select
              value={formData.minecraft_version}
              onChange={(e) => setFormData({ ...formData, minecraft_version: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option>1.20.1</option>
              <option>1.20</option>
              <option>1.19.2</option>
              <option>1.19</option>
            </select>
          </div>

          {/* Mod Loader */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Mod Loader
            </label>
            <select
              value={formData.mod_loader}
              onChange={(e) => setFormData({ ...formData, mod_loader: e.target.value as any })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="fabric">Fabric</option>
              <option value="forge">Forge</option>
              <option value="neoforge">NeoForge</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-primary resize-none"
              rows={3}
              placeholder="Describe your mod..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
