import React, { useState, useEffect } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Save,
  RotateCcw,
  Code,
  HardDrive,
  Zap,
  X,
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  autoSave: boolean;
  autoSaveInterval: number; // in minutes
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
  codeEditor: 'monaco' | 'ace';
  tabSize: number;
  enableLineNumbers: boolean;
  enableMinimap: boolean;
  storageLocation: string;
  language: 'en' | 'uz' | 'ru';
}

interface SettingsPanelProps {
  onClose: () => void;
  onSettingsChange: (settings: Settings) => void;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  autoSave: true,
  autoSaveInterval: 5,
  fontSize: 'medium',
  notifications: true,
  codeEditor: 'monaco',
  tabSize: 2,
  enableLineNumbers: true,
  enableMinimap: false,
  storageLocation: '',
  language: 'en',
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onSettingsChange }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('modgen-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
    }
  }, []);

  const handleChange = (key: keyof Settings, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('modgen-settings', JSON.stringify(settings));
    onSettingsChange(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings & Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Theme Settings */}
          <Card title="🎨 Appearance" subtitle="Customize how the app looks">
            <div className="space-y-4">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Theme
                </label>
                <div className="flex gap-3">
                  {['light', 'dark', 'auto'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleChange('theme', theme as 'light' | 'dark' | 'auto')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition ${
                        settings.theme === theme
                          ? 'border-blue-500 bg-blue-50 dark:bg-slate-800 text-blue-600'
                          : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
                      }`}
                    >
                      {theme === 'light' && <Sun className="w-4 h-4" />}
                      {theme === 'dark' && <Moon className="w-4 h-4" />}
                      {theme === 'auto' && <Zap className="w-4 h-4" />}
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Font Size
                </label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => handleChange('fontSize', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Small (12px)</option>
                  <option value="medium">Medium (14px)</option>
                  <option value="large">Large (16px)</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="uz">Uzbek (O'zbek)</option>
                  <option value="ru">Russian (Русский)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Auto-save Settings */}
          <Card title="💾 Auto-save" subtitle="Automatic project saving">
            <div className="space-y-4">
              {/* Enable Auto-save */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => handleChange('autoSave', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Enable Auto-save
                </span>
              </label>

              {/* Auto-save Interval */}
              {settings.autoSave && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Save interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.autoSaveInterval}
                    onChange={(e) => handleChange('autoSaveInterval', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Storage Location */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Storage Location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.storageLocation}
                    readOnly
                    placeholder="Default project location"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
                  />
                  <Button variant="outline" size="sm">
                    Browse
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Code Editor Settings */}
          <Card title="<> Code Editor" subtitle="Configure the code editor">
            <div className="space-y-4">
              {/* Code Editor Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Code Editor
                </label>
                <div className="flex gap-3">
                  {['monaco', 'ace'].map((editor) => (
                    <button
                      key={editor}
                      onClick={() => handleChange('codeEditor', editor as 'monaco' | 'ace')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                        settings.codeEditor === editor
                          ? 'border-blue-500 bg-blue-50 dark:bg-slate-800 text-blue-600'
                          : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
                      }`}
                    >
                      <Code className="w-4 h-4 inline mr-2" />
                      {editor.charAt(0).toUpperCase() + editor.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Size */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Tab Size (spaces)
                </label>
                <select
                  value={settings.tabSize}
                  onChange={(e) => handleChange('tabSize', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2">2 spaces</option>
                  <option value="4">4 spaces</option>
                  <option value="8">8 spaces</option>
                </select>
              </div>

              {/* Line Numbers */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableLineNumbers}
                  onChange={(e) => handleChange('enableLineNumbers', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Show line numbers
                </span>
              </label>

              {/* Minimap */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableMinimap}
                  onChange={(e) => handleChange('enableMinimap', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Show minimap
                </span>
              </label>
            </div>
          </Card>

          {/* Notifications */}
          <Card title="🔔 Notifications" subtitle="Build and system alerts">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleChange('notifications', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Enable notifications
              </span>
            </label>
          </Card>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 p-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
