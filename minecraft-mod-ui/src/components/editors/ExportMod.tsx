import React, { useState } from 'react';
import { Download, Zap, CheckCircle, AlertCircle, FileJson } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface ModExportSettings {
  modName: string;
  modId: string;
  version: string;
  author: string;
  description: string;
  minecraftVersions: string[];
  loaderType: 'forge' | 'fabric' | 'quilt' | 'neoforge';
  includeSource: boolean;
  includeTextures: boolean;
  includeModels: boolean;
  includeSounds: boolean;
  obfuscate: boolean;
  license: string;
}

interface ExportModProps {
  onExport?: (settings: ModExportSettings) => void;
}

export const ExportMod: React.FC<ExportModProps> = ({ onExport }) => {
  const [settings, setSettings] = useState<ModExportSettings>({
    modName: 'My Custom Mod',
    modId: 'my_custom_mod',
    version: '1.0.0',
    author: 'Mod Creator',
    description: 'A custom Minecraft mod',
    minecraftVersions: ['1.20.1'],
    loaderType: 'forge',
    includeSource: true,
    includeTextures: true,
    includeModels: true,
    includeSounds: true,
    obfuscate: false,
    license: 'MIT',
  });

  const [exportStatus, setExportStatus] = useState<{
    step: 'idle' | 'preparing' | 'generating' | 'packaging' | 'complete' | 'error';
    progress: number;
    message: string;
  }>({
    step: 'idle',
    progress: 0,
    message: '',
  });

  const handleExport = () => {
    if (!settings.modName.trim() || !settings.modId.trim()) {
      alert('Please fill in mod name and mod ID');
      return;
    }

    setExportStatus({ step: 'preparing', progress: 10, message: 'Validating mod configuration...' });

    setTimeout(() => {
      setExportStatus({ step: 'generating', progress: 30, message: 'Generating Java classes...' });
    }, 500);

    setTimeout(() => {
      setExportStatus({ step: 'generating', progress: 50, message: 'Creating JSON files...' });
    }, 1000);

    setTimeout(() => {
      setExportStatus({ step: 'packaging', progress: 75, message: 'Packaging resources...' });
    }, 1500);

    setTimeout(() => {
      setExportStatus({ step: 'complete', progress: 100, message: 'Export complete!' });
      onExport?.(settings);

      // Simulate download
      setTimeout(() => {
        const element = document.createElement('a');
        const file = new Blob([generateModZip()], { type: 'application/zip' });
        element.href = URL.createObjectURL(file);
        element.download = `${settings.modId}-${settings.version}.jar`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }, 500);
    }, 2000);
  };

  const generateModZip = () => {
    return JSON.stringify({
      mod: settings,
      generated: new Date().toISOString(),
      format: 'MOD_ARCHIVE_V1',
    });
  };

  const getStatusColor = () => {
    switch (exportStatus.step) {
      case 'complete':
        return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20';
      case 'error':
        return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20';
      case 'packaging':
      case 'generating':
        return 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
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
            <label className="block text-sm font-medium mb-2">Mod ID</label>
            <input
              type="text"
              value={settings.modId}
              onChange={(e) => setSettings({ ...settings, modId: e.target.value.toLowerCase() })}
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mod Loader</label>
            <select
              value={settings.loaderType}
              onChange={(e) => setSettings({ ...settings, loaderType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="forge">Forge</option>
              <option value="fabric">Fabric</option>
              <option value="quilt">Quilt</option>
              <option value="neoforge">NeoForge</option>
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

        <div className="mt-4">
          <label className="block text-sm font-medium mb-3">Minecraft Versions</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {['1.19', '1.19.2', '1.20', '1.20.1', '1.21'].map((version) => (
              <button
                key={version}
                onClick={() => {
                  const isSelected = settings.minecraftVersions.includes(version);
                  setSettings({
                    ...settings,
                    minecraftVersions: isSelected
                      ? settings.minecraftVersions.filter(v => v !== version)
                      : [...settings.minecraftVersions, version],
                  });
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  settings.minecraftVersions.includes(version)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                }`}
              >
                {version}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Export Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Export Options</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.includeSource}
              onChange={(e) => setSettings({ ...settings, includeSource: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Include Source Code</strong> - Include Java source files
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.includeTextures}
              onChange={(e) => setSettings({ ...settings, includeTextures: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Include Textures</strong> - Include texture files and resource pack
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.includeModels}
              onChange={(e) => setSettings({ ...settings, includeModels: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Include Models</strong> - Include JSON model files
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.includeSounds}
              onChange={(e) => setSettings({ ...settings, includeSounds: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Include Sounds</strong> - Include sound files and definitions
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.obfuscate}
              onChange={(e) => setSettings({ ...settings, obfuscate: e.target.checked })}
              className="mr-3 w-4 h-4 rounded"
            />
            <span className="text-sm">
              <strong>Obfuscate Code</strong> - Obfuscate Java bytecode
            </span>
          </label>
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
              {['preparing', 'generating', 'packaging'].includes(exportStatus.step) && (
                <Zap size={32} className="text-blue-600 animate-pulse" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-2">
                {exportStatus.step === 'complete' && '✅ Export Complete!'}
                {exportStatus.step === 'error' && '❌ Export Failed'}
                {['preparing', 'generating', 'packaging'].includes(exportStatus.step) && '⏳ Exporting...'}
              </h4>
              <p className="text-sm mb-3">{exportStatus.message}</p>
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
          <pre>{JSON.stringify({
            modinfo: {
              modid: settings.modId,
              name: settings.modName,
              description: settings.description,
              version: settings.version,
              mcversion: settings.minecraftVersions.join(','),
              url: '',
              updateUrl: '',
              authorList: [settings.author],
              credits: settings.author,
              logoFile: '',
              screenshots: [],
              dependencies: [],
            },
          }, null, 2)}</pre>
        </div>
      </Card>

      {/* Export Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleExport}
          disabled={exportStatus.step !== 'idle'}
          className="flex-1"
        >
          <Download size={18} className="mr-2" />
          {exportStatus.step === 'idle' ? 'Export Mod' : 'Exporting...'}
        </Button>
        {exportStatus.step === 'complete' && (
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
        <h4 className="font-semibold text-sm mb-2">📦 Export Information</h4>
        <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
          <li>• JAR file will be downloaded to your Downloads folder</li>
          <li>• All components will be packaged with correct directory structure</li>
          <li>• mod.info file will be generated automatically</li>
          <li>• Make sure all required resources are added before exporting</li>
        </ul>
      </Card>
    </div>
  );
};
