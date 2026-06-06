/**
 * ExportMod — pre-flight panel for exporting the current project as a real
 * `.jar`.
 *
 * Behaviour:
 *   1. Pre-fills the form fields from `currentProject` so the user can
 *      tweak metadata (name, version, description, author) before export.
 *   2. On Export:
 *        a. If the metadata fields differ from the project, persist the
 *           changes via `useProject.updateProject` first.
 *        b. Call `useProjectActions.exportJar` which scaffolds the project
 *           on disk if needed and runs `gradlew clean build`.
 *        c. On success, open a folder picker via the Tauri dialog plugin
 *           and copy the produced `build/libs/*.jar` to the chosen folder.
 *   3. Renders real Gradle progress via `build-status` events.
 *
 * The previous implementation generated a JSON metadata blob, named it
 * `*.jar`, and downloaded it via an `<a>` element — the file Minecraft
 * would have rejected immediately. That theatre is fully removed.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Zap,
  CheckCircle,
  AlertCircle,
  FileJson,
  FolderOpen,
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useProjectStore } from '../../stores/projectStore';
import { useProject } from '../../hooks/useProject';
import { useProjectActions } from '../../hooks/useProjectActions';
import {
  isTauri,
  listenToBuildStatus,
} from '../../lib/tauri-api';

export interface ModExportSettings {
  modName: string;
  modId: string;
  version: string;
  author: string;
  description: string;
  minecraftVersion: string;
  loaderType: 'forge' | 'fabric' | 'quilt' | 'neoforge';
  license: string;
}

interface ExportModProps {
  onExport?: (settings: ModExportSettings) => void;
}

type Step = 'idle' | 'saving' | 'building' | 'copying' | 'complete' | 'error';

export const ExportMod: React.FC<ExportModProps> = ({ onExport }) => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { updateProject } = useProject();
  const { exportJar } = useProjectActions();

  // Initial form state — re-derive when currentProject changes.
  const initialSettings = useMemo<ModExportSettings>(
    () => ({
      modName: currentProject?.name ?? 'My Custom Mod',
      modId: currentProject?.namespace ?? 'my_custom_mod',
      version: currentProject?.mod_version ?? '1.0.0',
      author: currentProject?.author ?? '',
      description: currentProject?.description ?? '',
      minecraftVersion: currentProject?.minecraft_version ?? '1.20.1',
      loaderType:
        ((currentProject?.mod_loader as ModExportSettings['loaderType']) ??
          'forge'),
      license: 'MIT',
    }),
    [currentProject]
  );
  const [settings, setSettings] = useState<ModExportSettings>(initialSettings);
  useEffect(() => setSettings(initialSettings), [initialSettings]);

  const [exportStatus, setExportStatus] = useState<{
    step: Step;
    progress: number;
    message: string;
    artifactPath?: string;
    copiedTo?: string;
    error?: string;
  }>({ step: 'idle', progress: 0, message: '' });

  // Mirror Gradle stdout high-level events into the progress bar.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | null = null;
    (async () => {
      unlisten = await listenToBuildStatus((status) => {
        setExportStatus((prev) => {
          if (prev.step === 'idle' || prev.step === 'complete' || prev.step === 'error') {
            return prev;
          }
          if (status === 'started') {
            return {
              ...prev,
              step: 'building',
              progress: 60,
              message: 'Gradle building…',
            };
          }
          if (status === 'success') {
            return { ...prev, progress: 90, message: 'Build OK — locating artifact…' };
          }
          return prev;
        });
      });
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  const persistMetadataIfChanged = async () => {
    if (!currentProject) return;
    const changed =
      currentProject.name !== settings.modName ||
      currentProject.namespace !== settings.modId ||
      currentProject.mod_version !== settings.version ||
      currentProject.author !== settings.author ||
      (currentProject.description ?? '') !== settings.description ||
      currentProject.minecraft_version !== settings.minecraftVersion ||
      currentProject.mod_loader !== settings.loaderType;
    if (!changed) return;

    setExportStatus({ step: 'saving', progress: 15, message: 'Saving project metadata…' });
    await updateProject({
      ...currentProject,
      name: settings.modName,
      namespace: settings.modId,
      mod_version: settings.version,
      author: settings.author,
      description: settings.description,
      minecraft_version: settings.minecraftVersion,
      mod_loader: settings.loaderType,
    });
  };

  const handleExport = async () => {
    if (!currentProject) {
      alert('Please select or create a project first.');
      return;
    }
    if (!settings.modName.trim() || !settings.modId.trim()) {
      alert('Please fill in mod name and mod ID');
      return;
    }
    if (!isTauri()) {
      setExportStatus({
        step: 'error',
        progress: 0,
        message: 'Export requires the desktop app — Gradle is not available in browser dev mode.',
      });
      return;
    }

    try {
      // 1. Save any metadata edits before building.
      await persistMetadataIfChanged();

      // 2. Build via the same pipeline the workspace header uses.
      setExportStatus({
        step: 'building',
        progress: 30,
        message: 'Scaffolding (if needed) and running Gradle…',
      });
      // We pass currentProject (latest store state will already reflect the
      // metadata save above thanks to updateProject's optimistic update).
      const result = await exportJar(currentProject);

      if (result.status !== 'success' || !result.artifactPath) {
        setExportStatus({
          step: 'error',
          progress: 0,
          message:
            result.status === 'skipped'
              ? 'Export skipped (project has no scaffold and user cancelled the folder picker).'
              : `Build failed${result.durationMs ? ` after ${(result.durationMs / 1000).toFixed(1)}s` : ''}.`,
          error: result.message?.split('\n').slice(-3).join('\n'),
        });
        return;
      }

      // 3. Ask the user where to drop the produced .jar.
      setExportStatus({
        step: 'copying',
        progress: 95,
        message: 'Pick a destination for the .jar…',
        artifactPath: result.artifactPath,
      });

      const { save } = await import('@tauri-apps/plugin-dialog');
      const target = await save({
        title: 'Save mod JAR',
        defaultPath: `${settings.modId}-${settings.version}.jar`,
        filters: [{ name: 'Java Archive', extensions: ['jar'] }],
      });

      if (!target) {
        setExportStatus({
          step: 'complete',
          progress: 100,
          message: `Build succeeded — JAR is at ${result.artifactPath}. (You skipped the copy step.)`,
          artifactPath: result.artifactPath,
        });
        onExport?.(settings);
        return;
      }

      const { copyFile } = await import('@tauri-apps/plugin-fs');
      // copyFile signature differs slightly across plugin versions; spread
      // through any-cast keeps us forward/backward compatible.
      await (copyFile as unknown as (src: string, dst: string) => Promise<void>)(
        result.artifactPath,
        target
      );

      setExportStatus({
        step: 'complete',
        progress: 100,
        message: 'Export complete!',
        artifactPath: result.artifactPath,
        copiedTo: target,
      });
      onExport?.(settings);
    } catch (e) {
      setExportStatus({
        step: 'error',
        progress: 0,
        message: 'Export failed',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const getStatusColor = () => {
    switch (exportStatus.step) {
      case 'complete':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20';
      case 'error':
        return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20';
      case 'saving':
      case 'building':
      case 'copying':
        return 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20';
      default:
        return '';
    }
  };

  const inProgress =
    exportStatus.step === 'saving' ||
    exportStatus.step === 'building' ||
    exportStatus.step === 'copying';

  return (
    <div className="space-y-6">
      {/* Project banner */}
      {!currentProject && (
        <Card className="p-4 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5" />
            <div className="text-sm">
              <strong>No project selected.</strong> Create or open a project from the
              dashboard before exporting.
            </div>
          </div>
        </Card>
      )}

      {/* Mod Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Mod Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mod Name</label>
            <input
              type="text"
              value={settings.modName}
              onChange={(e) => setSettings({ ...settings, modName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="My Custom Mod"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mod ID (namespace)</label>
            <input
              type="text"
              value={settings.modId}
              onChange={(e) =>
                setSettings({ ...settings, modId: e.target.value.toLowerCase() })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono"
              placeholder="my_custom_mod"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Version</label>
            <input
              type="text"
              value={settings.version}
              onChange={(e) => setSettings({ ...settings, version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="1.0.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Author</label>
            <input
              type="text"
              value={settings.author}
              onChange={(e) => setSettings({ ...settings, author: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              placeholder="Mod Creator"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={settings.description}
            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            rows={2}
            placeholder="Describe your mod..."
          />
        </div>
      </Card>

      {/* Technical Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Technical Settings</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mod Loader</label>
            <select
              value={settings.loaderType}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  loaderType: e.target.value as ModExportSettings['loaderType'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="forge">Forge</option>
              <option value="fabric">Fabric</option>
              <option value="neoforge">NeoForge</option>
              <option value="quilt">Quilt</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Minecraft Version</label>
            <select
              value={settings.minecraftVersion}
              onChange={(e) =>
                setSettings({ ...settings, minecraftVersion: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              {['1.19', '1.19.2', '1.20', '1.20.1', '1.20.4', '1.21'].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">License</label>
            <select
              value={settings.license}
              onChange={(e) => setSettings({ ...settings, license: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="MIT">MIT</option>
              <option value="Apache-2.0">Apache 2.0</option>
              <option value="GPL-3.0">GPL 3.0</option>
              <option value="LGPL-2.1">LGPL 2.1</option>
              <option value="ISC">ISC</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Export Status */}
      {exportStatus.step !== 'idle' && (
        <Card className={`p-6 bg-gradient-to-r ${getStatusColor()}`}>
          <div className="flex items-start gap-4">
            <div>
              {exportStatus.step === 'complete' && (
                <CheckCircle size={32} className="text-green-600" />
              )}
              {exportStatus.step === 'error' && (
                <AlertCircle size={32} className="text-red-600" />
              )}
              {inProgress && <Zap size={32} className="text-blue-600 animate-pulse" />}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">
                {exportStatus.step === 'complete' && '✅ Export Complete!'}
                {exportStatus.step === 'error' && '❌ Export Failed'}
                {inProgress && '⏳ Exporting…'}
              </h4>
              <p className="text-sm mb-3">{exportStatus.message}</p>
              {exportStatus.copiedTo && (
                <div className="text-xs font-mono bg-white/50 dark:bg-black/20 px-2 py-1 rounded mb-2">
                  → {exportStatus.copiedTo}
                </div>
              )}
              {exportStatus.error && (
                <pre className="text-xs font-mono bg-red-100/50 dark:bg-red-950/40 px-3 py-2 rounded text-red-900 dark:text-red-200 overflow-x-auto whitespace-pre-wrap mb-2">
                  {exportStatus.error}
                </pre>
              )}
              <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${exportStatus.progress}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Module Preview */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <h4 className="font-semibold mb-3 flex items-center">
          <FileJson size={18} className="mr-2" />
          Mod Metadata Preview
        </h4>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
          <pre>
            {JSON.stringify(
              {
                modid: settings.modId,
                name: settings.modName,
                description: settings.description,
                version: settings.version,
                minecraft_version: settings.minecraftVersion,
                mod_loader: settings.loaderType,
                authors: [settings.author],
                license: settings.license,
              },
              null,
              2
            )}
          </pre>
        </div>
      </Card>

      {/* Export Button */}
      <div className="flex gap-3">
        <Button
          onClick={() => void handleExport()}
          disabled={!currentProject || inProgress}
          className="flex-1"
        >
          <Download size={18} className="mr-2" />
          {inProgress ? 'Exporting…' : 'Export Mod (.jar)'}
        </Button>
        {(exportStatus.step === 'complete' || exportStatus.step === 'error') && (
          <Button
            onClick={() => setExportStatus({ step: 'idle', progress: 0, message: '' })}
            variant="outline"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <FolderOpen size={14} /> What happens when you click Export
        </h4>
        <ol className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-decimal list-inside">
          <li>Any metadata changes above are saved to the project.</li>
          <li>
            If the project has not been written to disk yet, the studio asks for a
            folder and scaffolds the Forge / Fabric mod skeleton.
          </li>
          <li>
            <code>./gradlew clean build</code> runs in that folder.
          </li>
          <li>
            On success, the produced <code>build/libs/*.jar</code> is copied to a
            location of your choice.
          </li>
        </ol>
      </Card>
    </div>
  );
};
