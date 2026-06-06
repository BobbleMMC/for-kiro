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
 */
import { useState, useEffect, useCallback, useMemo, type FC } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { DockLayout } from '../dock-layout';
import '../dock-layout/dock-styles.css';

import { Save, Play, Download, Sun, Moon } from 'lucide-react';
import { HotReloadStatus } from '../hot-reload/HotReloadStatus';
import { CommandPalette, OnboardingWizard, NotificationBell, NotificationCenter } from '../ux';
import { createWorkspacePanels } from './workspacePanels';

export const DockWorkspace: FC = () => {
  // Stable selectors avoid full-store subscriptions and prevent re-renders
  // when unrelated state (e.g. console logs) changes.
  const currentProject = useProjectStore((s) => s.currentProject);
  const addConsoleMessage = useProjectStore((s) => s.addConsoleMessage);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Panel registry is heavy (30+ JSX nodes including lazy components).
  // Build it ONCE per workspace mount, not on every keystroke / log update.
  const panels = useMemo(() => createWorkspacePanels(), []);

  const log = useCallback(
    (level: 'info' | 'success' | 'warning' | 'error', message: string, source = 'Workspace') => {
      addConsoleMessage({
        id: `msg-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level,
        message,
        source,
      });
    },
    [addConsoleMessage]
  );

  const handleSave = useCallback(() => log('success', 'Project saved', 'Save'), [log]);
  const handleBuild = useCallback(() => log('info', 'Build started…', 'Gradle'), [log]);
  const handleExport = useCallback(() => log('info', 'Exporting .jar…', 'Export'), [log]);
  const handleRun = useCallback(() => log('info', 'Launching Minecraft client…', 'Run'), [log]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleBuild();
      } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExport();
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
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-medium rounded transition-colors"
              title="Save (Ctrl+S)"
            >
              <Save size={11} /> Save
            </button>
            <button
              onClick={handleBuild}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-medium rounded transition-colors"
              title="Build (Ctrl+B)"
            >
              <Play size={11} /> Build
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-medium rounded transition-colors"
              title="Export .jar (Ctrl+E)"
            >
              <Download size={11} /> Export
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
          log('success', `Project setup complete: ${data.modName || 'Untitled'}`, 'Onboarding');
        }}
      />
    </>
  );
};
