/**
 * High-level project actions used by the workspace header (Save, Build, Export).
 *
 * Each action:
 *   1. Surfaces progress to the project console (`addConsoleMessage`).
 *   2. Falls back gracefully when not running in Tauri.
 *   3. Returns a structured result so callers can show toasts / open dialogs.
 *
 * The "save" action is mostly a no-op now because every editor persists
 * through the typed hooks already; it exists as a single hook entry point so
 * the header button has something definite to call (and so we can later add
 * "save all dirty editors" semantics here).
 */

import { useCallback } from 'react';
import { useProjectStore } from '../stores/projectStore';
import * as tauri from '../lib/tauri-api';
import type { Project } from '../types';

export interface BuildSummary {
  status: 'success' | 'failed' | 'skipped';
  message: string;
  artifactPath?: string | null;
  durationMs?: number;
}

const consoleMessage = (
  level: 'info' | 'success' | 'warning' | 'error',
  message: string,
  source = 'Workspace'
) => {
  useProjectStore.getState().addConsoleMessage({
    id: `msg-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    level,
    message,
    source,
  });
};

/**
 * Pick a directory using the Tauri dialog plugin. Returns null when the
 * user cancels or the dialog plugin is unavailable.
 */
async function pickDirectory(title: string): Promise<string | null> {
  if (!tauri.isTauri()) return null;
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({ directory: true, multiple: false, title });
    if (!selected) return null;
    return Array.isArray(selected) ? selected[0] : selected;
  } catch (e) {
    consoleMessage('error', `Could not open directory picker: ${e}`, 'Dialog');
    return null;
  }
}

export function useProjectActions() {
  /**
   * "Save" — flush in-memory state to disk. Editors already persist on
   * each change, so for now we just emit a confirmation log and bump the
   * project's `updated_at` timestamp (when in Tauri).
   */
  const save = useCallback(async (project: Project | null): Promise<void> => {
    if (!project) {
      consoleMessage('warning', 'No project selected — nothing to save', 'Save');
      return;
    }
    consoleMessage('info', `Saving "${project.name}"…`, 'Save');
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
      } catch (e) {
        consoleMessage('error', `Save failed: ${e}`, 'Save');
        return;
      }
    }
    consoleMessage('success', `Saved "${project.name}"`, 'Save');
  }, []);

  /**
   * Ensure the project has an on-disk scaffold. Returns the project path
   * or null if the user cancelled / scaffolding failed.
   */
  const ensureScaffold = useCallback(
    async (project: Project): Promise<string | null> => {
      if (!tauri.isTauri()) {
        consoleMessage(
          'warning',
          'Scaffolding requires the desktop app (running in browser dev mode)',
          'Scaffold'
        );
        return null;
      }

      // Already scaffolded?
      try {
        const existing = await tauri.getProjectPath(project.id);
        if (existing) return existing;
      } catch (e) {
        consoleMessage('warning', `Could not check existing path: ${e}`, 'Scaffold');
      }

      const target = await pickDirectory(`Choose a folder for "${project.name}"`);
      if (!target) {
        consoleMessage('info', 'Scaffold cancelled — no folder selected', 'Scaffold');
        return null;
      }

      consoleMessage('info', `Writing ${project.mod_loader} skeleton to ${target}…`, 'Scaffold');
      try {
        const result = await tauri.scaffoldProject(project.id, target);
        consoleMessage(
          'success',
          `Scaffolded ${result.files_written.length} files to ${result.project_path}`,
          'Scaffold'
        );
        return result.project_path;
      } catch (e) {
        consoleMessage('error', `Scaffold failed: ${e}`, 'Scaffold');
        return null;
      }
    },
    []
  );

  /**
   * Build the project with Gradle. Scaffolds first if the project has no
   * on-disk path yet.
   */
  const build = useCallback(
    async (project: Project | null): Promise<BuildSummary> => {
      if (!project) {
        consoleMessage('warning', 'No project selected', 'Build');
        return { status: 'skipped', message: 'No project selected' };
      }

      if (!tauri.isTauri()) {
        consoleMessage('warning', 'Build requires the desktop app', 'Build');
        return { status: 'skipped', message: 'Browser mode — Gradle unavailable' };
      }

      const path = await ensureScaffold(project);
      if (!path) return { status: 'skipped', message: 'No project path' };

      consoleMessage('info', `Running ./gradlew clean build in ${path}`, 'Gradle');
      try {
        const result = await tauri.runGradleBuild({ project_id: project.id, project_path: path });
        const durationStr = `${(result.build_time_ms / 1000).toFixed(1)}s`;
        if (result.status === 'success') {
          consoleMessage(
            'success',
            `Build succeeded in ${durationStr}${result.artifact_path ? ` → ${result.artifact_path}` : ''}`,
            'Gradle'
          );
        } else {
          consoleMessage(
            'error',
            `Build failed in ${durationStr} — ${result.errors.length} error(s)`,
            'Gradle'
          );
          for (const err of result.errors.slice(0, 5)) {
            consoleMessage('error', err, 'Gradle');
          }
        }
        return {
          status: result.status === 'success' ? 'success' : 'failed',
          message: result.output.slice(-2000), // last 2 KB of log
          artifactPath: result.artifact_path,
          durationMs: result.build_time_ms,
        };
      } catch (e) {
        consoleMessage('error', `Gradle invocation failed: ${e}`, 'Gradle');
        return { status: 'failed', message: String(e) };
      }
    },
    [ensureScaffold]
  );

  /**
   * Export — run a build and tell the user where the .jar landed.
   * (Optional copy-out to a chosen folder is left for a follow-up PR.)
   */
  const exportJar = useCallback(
    async (project: Project | null): Promise<BuildSummary> => {
      if (!project) {
        consoleMessage('warning', 'No project selected', 'Export');
        return { status: 'skipped', message: 'No project selected' };
      }
      consoleMessage('info', `Exporting .jar for "${project.name}"…`, 'Export');
      const result = await build(project);
      if (result.status === 'success' && result.artifactPath) {
        consoleMessage(
          'success',
          `Export ready: ${result.artifactPath}`,
          'Export'
        );
      }
      return result;
    },
    [build]
  );

  return { save, build, exportJar, ensureScaffold };
}
