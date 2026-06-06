/**
 * DockWorkspace — Professional dockable workspace with full editor integration.
 *
 * Provides:
 *  - Top header with project info, Save/Build/Export, hot-reload status
 *  - Notification bell with dropdown center
 *  - Command Palette (Ctrl+Shift+P)
 *  - Onboarding wizard for first-time users
 *  - 25+ editors registered as dockable panels (right dock strip)
 *  - Keyboard shortcuts (Ctrl+S, Ctrl+B, F5)
 *
 * Save / Build / Export are wired through `useProjectActions`, which talks to
 * the Rust backend (SQLite + Gradle) when running inside Tauri and falls back
 * to in-memory operation in the browser dev server.
 */
import { useState, useEffect, useCallback, useMemo, type FC } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useProjectActions } from '../../hooks/useProjectActions';
import { DockLayout } from '../dock-layout';
import '../dock-layout/dock-styles.css';

import { Save, Play, Download, Sun, Moon, Loader2 } from 'lucide-react';
import { HotReloadStatus } from '../hot-reload/HotReloadStatus';
import { CommandPalette, OnboardingWizard, NotificationBell, NotificationCenter } from '../ux';
import { createWorkspacePanels } from './workspacePanels';

export const DockWorkspace: FC = () => {
  const currentProject = useProjectStore((s) => s.currentProject);
  const { save, build, exportJar } = useProjectActions();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [busy, setBusy] = useState<null | 'save' | 'build' | 'export'>(null);

  // Panel registry is heavy (30+ JSX nodes including lazy components).
  // Build it ONCE per workspace mount, not on every keystroke / log update.
  const panels = useMemo(() => createWorkspacePanels(), []);

  const handleSave = useCallback(async () => {
    if (busy) return;
    setBusy('save');
    try {
      await save(currentProject);
    } finally {
      setBusy(null);
    }
  }, [busy, save, currentProject]);

  const handleBuild = useCallback(async () => {
    if (busy) return;
    setBusy('build');
    try {
      await build(currentProject);
    } finally {
      setBusy(null);
    }
  }, [busy, build, currentProject]);

  const handleExport = useCallback(async () => {
    if (busy) return;
    setBusy('export');
    try {
      await exportJar(currentProject);
    } finally {
      setBusy(null);
    }
  }, [busy, exportJar, currentProject]);

  const handleRun = useCallback(() => {
    // Run-in-Minecraft (gradle runClient) is a separate follow-up task.
    useProjectStore.getState().addConsoleMessage({
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      level: 'info',
      message: 'Run client is not yet wired — use Build for now',
      source: 'Run',
    });
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        void handleBuild();
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        void handleExport();
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleBuild, handleExport, handleRun]);

  // Open onboarding for projects with build_count = 0 (first launch)
  useEffect(() => {
    if (currentProject && currentProject.build_count === 0) {
      const seen = sessionStorage.getItem(`onboarding-${currentProject.id}`);
      if (!seen) setOnboardingOpen(true);
    }
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">No project selected</h2>
          <p className="text-slate-400">Select a project from the dashboard to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DockLayout
        panels={panels}
        headerContent={
          <div className="flex items-center gap-3 w-full">
            {/* Left: Project identity */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">M</span>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200">{currentProject.name}</span>
                <span className="text-[9px] text-slate-500 ml-2">
                  {currentProject.minecraft_version} · {currentProject.mod_loader}
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-700" />
            <HotReloadStatus />

            <div className="flex-1" />

            {/* Action buttons */}
            <button
              onClick={handleSave}
              disabled={busy !== null}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-medium rounded transition-colors"
              title="Save (Ctrl+S)"
            >
              {busy === 'save' ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Save
            </button>
            <button
              onClick={handleBuild}
              disabled={busy !== null}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-medium rounded transition-colors"
              title="Build (Ctrl+B)"
            >
              {busy === 'build' ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              Build
            </button>
            <button
              onClick={handleExport}
              disabled={busy !== null}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-medium rounded transition-colors"
              title="Export .jar (Ctrl+E)"
            >
              {busy === 'export' ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              Export
            </button>

            <div className="h-4 w-px bg-slate-700" />

            <button
              onClick={() => setPaletteOpen(true)}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] font-mono rounded border border-slate-600"
              title="Command Palette"
            >
              ⌘K
            </button>

            <NotificationBell count={2} onClick={() => setNotifOpen((o) => !o)} />

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
              title="Toggle theme"
            >
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        }
      />

      {/* Overlays — these need to live above the dock */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <OnboardingWizard
        isOpen={onboardingOpen}
        onClose={() => {
          if (currentProject) sessionStorage.setItem(`onboarding-${currentProject.id}`, '1');
          setOnboardingOpen(false);
        }}
        onComplete={(data) => {
          useProjectStore.getState().addConsoleMessage({
            id: `msg-${Date.now()}`,
            timestamp: new Date(),
            level: 'success',
            message: `Project setup complete: ${data.modName || 'Untitled'}`,
            source: 'Onboarding',
          });
        }}
      />
    </>
  );
};
