import { useEffect, useRef, useCallback } from 'react';
import { useElectron } from './useElectron';

interface AutoSaveOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onSaveSuccess?: (path?: string) => void;
  onSaveError?: (error: Error) => void;
}

/**
 * Custom hook for auto-saving project data
 * Automatically saves project data at specified intervals
 */
export const useAutoSave = (
  projectData: Record<string, any>,
  options: AutoSaveOptions = {}
) => {
  const {
    enabled = true,
    interval = 5 * 60 * 1000, // 5 minutes default
    onSaveSuccess,
    onSaveError,
  } = options;

  const { saveProject } = useElectron();
  const timeoutRef = useRef<any>(null);
  const lastSaveRef = useRef<string>('');

  // Serialize project data for comparison
  const serializeData = useCallback((data: Record<string, any>) => {
    return JSON.stringify(data);
  }, []);

  // Perform the auto-save
  const performAutoSave = useCallback(async () => {
    if (!enabled || !projectData) {
      return;
    }

    try {
      const serialized = serializeData(projectData);

      // Only save if data has changed
      if (serialized === lastSaveRef.current) {
        return;
      }

      // Try to save with Electron API if available
      try {
        const result = await saveProject(projectData);
        if (result.success) {
          lastSaveRef.current = serialized;
          onSaveSuccess?.(result.path);
        } else {
          throw new Error(result.error || 'Save failed');
        }
      } catch (electronError) {
        // Fallback: save to localStorage
        try {
          const autoSaveKey = `autosave-${projectData.id || 'temp'}`;
          localStorage.setItem(autoSaveKey, JSON.stringify(projectData));
          lastSaveRef.current = serialized;
          onSaveSuccess?.();
        } catch (storageError) {
          onSaveError?.(storageError as Error);
        }
      }
    } catch (error) {
      onSaveError?.(error as Error);
    }
  }, [enabled, projectData, serializeData, saveProject, onSaveSuccess, onSaveError]);

  // Setup auto-save interval
  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      return;
    }

    // Initial save
    performAutoSave();

    // Setup interval
    const timer = setInterval(() => {
      performAutoSave();
    }, interval);

    timeoutRef.current = timer;

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [enabled, interval, performAutoSave]);

  // Perform save on unmount (cleanup)
  useEffect(() => {
    return () => {
      performAutoSave();
    };
  }, [performAutoSave]);

  // Manual save trigger
  const triggerSave = useCallback(async () => {
    await performAutoSave();
  }, [performAutoSave]);

  return {
    triggerSave,
    lastSaveRef,
  };
};

/**
 * Hook to recover auto-saved project data
 */
export const useAutoSaveRecovery = (projectId?: string | number) => {
  const recoverAutoSave = useCallback(() => {
    if (!projectId) {
      return null;
    }

    try {
      const autoSaveKey = `autosave-${projectId}`;
      const saved = localStorage.getItem(autoSaveKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to recover auto-save:', error);
      return null;
    }
  }, [projectId]);

  const clearAutoSave = useCallback(() => {
    if (!projectId) {
      return;
    }

    try {
      const autoSaveKey = `autosave-${projectId}`;
      localStorage.removeItem(autoSaveKey);
    } catch (error) {
      console.error('Failed to clear auto-save:', error);
    }
  }, [projectId]);

  return {
    recoverAutoSave,
    clearAutoSave,
  };
};
