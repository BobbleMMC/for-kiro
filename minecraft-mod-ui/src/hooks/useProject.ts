import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import * as tauri from '../lib/tauri-api';
import { projectFromTauri } from '../lib/tauri-mappers';
import type { Project } from '../types';

/**
 * Hook for project operations.
 *
 * When running inside Tauri the projects list is hydrated from the SQLite
 * database on mount, and create/update/delete are persisted before the
 * Zustand store is mutated. In a pure-browser dev environment the hook
 * falls back to in-memory operation so the UI stays usable.
 */
export const useProject = () => {
  const {
    projects,
    currentProject,
    setCurrentProject,
    addProject,
    updateProject: storeUpdate,
    deleteProject: storeDelete,
  } = useProjectStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // ----- Hydrate from DB on first mount -----
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (!tauri.isTauri()) return;

    (async () => {
      try {
        setIsLoading(true);
        const rows = await tauri.getProjects();
        // Replace store contents with whatever the DB has
        const store = useProjectStore.getState();
        // Remove existing projects (in-memory) and seed with DB rows
        for (const p of store.projects) store.deleteProject(p.id);
        for (const row of rows) store.addProject(projectFromTauri(row));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!tauri.isTauri()) return;
    try {
      setIsLoading(true);
      const rows = await tauri.getProjects();
      const store = useProjectStore.getState();
      for (const p of store.projects) store.deleteProject(p.id);
      for (const row of rows) store.addProject(projectFromTauri(row));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a project, persist to DB if available, return the saved project
   * (with the real DB-assigned id).
   */
  const createProject = useCallback(
    async (
      data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'build_count' | 'is_archived'>
    ): Promise<Project> => {
      const now = new Date().toISOString();

      if (tauri.isTauri()) {
        try {
          const id = await tauri.createProject({
            name: data.name,
            description: data.description,
            minecraft_version: data.minecraft_version,
            mod_loader: data.mod_loader,
            mod_version: data.mod_version,
            author: data.author,
            namespace: data.namespace,
          });
          const saved: Project = {
            id,
            name: data.name,
            description: data.description,
            minecraft_version: data.minecraft_version,
            mod_loader: data.mod_loader,
            mod_version: data.mod_version,
            author: data.author,
            namespace: data.namespace,
            build_count: 0,
            is_archived: false,
            created_at: now,
            updated_at: now,
          };
          addProject(saved);
          setError(null);
          return saved;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          throw e;
        }
      }

      // Browser fallback — in-memory id assignment
      const fallback: Project = {
        id: Date.now(),
        ...data,
        build_count: 0,
        is_archived: false,
        created_at: now,
        updated_at: now,
      };
      addProject(fallback);
      return fallback;
    },
    [addProject]
  );

  const updateProject = useCallback(
    async (project: Project): Promise<void> => {
      if (tauri.isTauri()) {
        try {
          await tauri.updateProject({
            id: project.id,
            name: project.name,
            description: project.description ?? null,
            minecraft_version: project.minecraft_version,
            mod_loader: project.mod_loader,
            mod_version: project.mod_version,
            author: project.author,
            namespace: project.namespace,
          });
          setError(null);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          throw e;
        }
      }
      storeUpdate({ ...project, updated_at: new Date().toISOString() });
    },
    [storeUpdate]
  );

  const removeProject = useCallback(
    async (id: number): Promise<void> => {
      if (tauri.isTauri()) {
        try {
          await tauri.deleteProject(id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
          throw e;
        }
      }
      storeDelete(id);
      if (currentProject?.id === id) setCurrentProject(null);
    },
    [storeDelete, currentProject, setCurrentProject]
  );

  const selectProject = useCallback(
    (project: Project) => {
      setCurrentProject(project);
    },
    [setCurrentProject]
  );

  const getProjectStats = useCallback((projectId: number) => {
    const store = useProjectStore.getState();
    return {
      blocks: store.blocks.filter((b) => b.project_id === projectId).length,
      items: store.items.filter((i) => i.project_id === projectId).length,
      recipes: store.recipes.filter((r) => r.project_id === projectId).length,
      entities: store.entities.filter((e) => e.project_id === projectId).length,
    };
  }, []);

  return {
    projects,
    currentProject,
    isLoading,
    error,
    createProject,
    selectProject,
    removeProject,
    updateProject,
    refreshProjects,
    getProjectStats,
  };
};
