import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions {
  enabled?: boolean;
  /** Auto-save period in milliseconds (default: 5 minutes). */
  interval?: number;
  onSaveSuccess?: (key?: string) => void;
  onSaveError?: (error: Error) => void;
}

/**
 * Auto-save the supplied project draft into `localStorage` every `interval`
 * milliseconds. Returns a `triggerSave` function callers can call to flush
 * the latest draft on demand (e.g. before unmount or before navigating).
 *
 * The persistent project state lives in SQLite (managed by `useProject` /
 * `useContent`); this hook is purely a *crash recovery* belt-and-braces, so
 * an unsaved-form snapshot can be restored after an unexpected reload.
 */
export const useAutoSave = (
  projectData: Record<string, unknown>,
  options: AutoSaveOptions = {}
) => {
  const {
    enabled = true,
    interval = 5 * 60 * 1000,
    onSaveSuccess,
    onSaveError,
  } = options;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSerializedRef = useRef<string>('');

  const serialize = useCallback((data: Record<string, unknown>) => JSON.stringify(data), []);

  const performAutoSave = useCallback(async () => {
    if (!enabled || !projectData) return;

    try {
      const serialized = serialize(projectData);
      if (serialized === lastSerializedRef.current) return;

      const id = (projectData.id as string | number | undefined) ?? 'temp';
      const key = `autosave-${id}`;
      localStorage.setItem(key, serialized);
      lastSerializedRef.current = serialized;
      onSaveSuccess?.(key);
    } catch (e) {
      onSaveError?.(e as Error);
    }
  }, [enabled, projectData, serialize, onSaveSuccess, onSaveError]);

  // Periodic save
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    void performAutoSave();
    timerRef.current = setInterval(() => void performAutoSave(), interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval, performAutoSave]);

  // Flush on unmount
  useEffect(() => {
    return () => void performAutoSave();
  }, [performAutoSave]);

  const triggerSave = useCallback(async () => {
    await performAutoSave();
  }, [performAutoSave]);

  return { triggerSave, lastSaveRef: lastSerializedRef };
};

/**
 * Recover the latest auto-save snapshot for a given project id, or clear it
 * after the user accepts/declines the recovery prompt.
 */
export const useAutoSaveRecovery = (projectId?: string | number) => {
  const recoverAutoSave = useCallback(() => {
    if (projectId == null) return null;
    try {
      const saved = localStorage.getItem(`autosave-${projectId}`);
      return saved ? (JSON.parse(saved) as Record<string, unknown>) : null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to recover auto-save:', e);
      return null;
    }
  }, [projectId]);

  const clearAutoSave = useCallback(() => {
    if (projectId == null) return;
    try {
      localStorage.removeItem(`autosave-${projectId}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear auto-save:', e);
    }
  }, [projectId]);

  return { recoverAutoSave, clearAutoSave };
};
