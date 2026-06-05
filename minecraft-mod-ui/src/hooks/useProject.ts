import { useProjectStore } from '../stores/projectStore';
import type { Project } from '../types';

/**
 * Hook for project operations
 */
export const useProject = () => {
  const {
    projects,
    currentProject,
    setCurrentProject,
    addProject,
    updateProject,
    deleteProject,
  } = useProjectStore();

  const createProject = (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'build_count' | 'is_archived'>) => {
    const newProject: Project = {
      id: projects.length + 1,
      ...projectData,
      build_count: 0,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addProject(newProject);
    return newProject;
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
  };

  const removeProject = (id: number) => {
    deleteProject(id);
    if (currentProject?.id === id) {
      setCurrentProject(null);
    }
  };

  const getProjectStats = (projectId: number) => {
    const store = useProjectStore.getState();
    return {
      blocks: store.blocks.filter(b => b.project_id === projectId).length,
      items: store.items.filter(i => i.project_id === projectId).length,
      recipes: store.recipes.filter(r => r.project_id === projectId).length,
      entities: store.entities.filter(e => e.project_id === projectId).length,
    };
  };

  return {
    projects,
    currentProject,
    createProject,
    selectProject,
    removeProject,
    updateProject,
    getProjectStats,
  };
};
