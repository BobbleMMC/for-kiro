import { useState, type FC, useMemo } from 'react';
import { Plus, Trash2, FileCode, Download, Copy, Check, AlertCircle, Settings2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface GradleDependency {
  id: string;
  group: string;
  name: string;
  version: string;
  scope: 'implementation' | 'compileOnly' | 'runtimeOnly' | 'testImplementation' | 'modImplementation';
}

export interface GradleRepository {
  id: string;
  name: string;
  url: string;
  type: 'maven' | 'ivy' | 'flatDir';
}

export interface GradleConfig {
  modId: string;
  modName: string;
  modVersion: string;
  modGroup: string;
  modAuthor: string;
  modDescription: string;
  minecraftVersion: string;
  forgeVersion: string;
  fabricLoaderVersion: string;
  fabricApiVersion: string;
  loaderType: 'forge' | 'fabric' | 'neoforge' | 'quilt';
  javaVersion: string;
  mappingsChannel: string;
  mappingsVersion: string;
  dependencies: GradleDependency[];
  repositories: GradleRepository[];
  useAccessTransformer: boolean;
  useMixins: boolean;
  useDataGen: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

interface GradleBuildConfigProps {
  onConfigChange?: (config: GradleConfig) => void;
  onExport?: (gradle: string) => void;
}

// Validation helpers
const validateModId = (modId: string): string | null => {
  if (!modId) return 'Mod ID is required';
  if (!/^[a-z0-9_]+$/.test(modId)) return 'Mod ID must contain only lowercase letters, numbers, and underscores';
  return null;
};

const validateModName = (modName: string): string | null => {
  if (!modName) return 'Mod Name is required';
  if (modName.length > 50) return 'Mod Name must be less than 50 characters';
  return null;
};

const validateVersion = (version: string): string | null => {
  if (!version) return 'Version is required';
  if (!/^\d+\.\d+\.\d+/.test(version)) return 'Version must follow semantic versioning (e.g., 1.0.0)';
  return null;
};

const validateModGroup = (group: string): string | null => {
  if (!group) return 'Group is required';
  if (!/^[a-z][a-z0-9.]*[a-z0-9]$/.test(group)) return 'Group must be a valid Java package (e.g., com.example)';
  return null;
};

const validateUrl = (url: string): string | null => {
  if (!url) return 'URL is required';
  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format';
  }
};

export const GradleBuildConfig: FC<GradleBuildConfigProps> = ({ onConfigChange, onExport }) => {
  const [config, setConfig] = useState<GradleConfig>({
    modId: 'examplemod',
    modName: 'Example Mod',
    modVersion: '1.0.0',
    modGroup: 'com.example',
    modAuthor: 'Author',
    modDescription: 'A custom Minecraft mod',
    minecraftVersion: '1.20.1',
    forgeVersion: '47.2.0',
    fabricLoaderVersion: '0.15.0',
    fabricApiVersion: '0.91.0',
    loaderType: 'forge',
    javaVersion: '17',
    mappingsChannel: 'official',
    mappingsVersion: '1.20.1',
    dependencies: [],
    repositories: [
      { id: 'repo_1', name: 'Maven Central', url: 'https://repo.maven.apache.org/maven2/', type: 'maven' },
    ],
    useAccessTransformer: false,
    useMixins: false,
    useDataGen: false,
  });

  const [copied, setCopied] = useState(false);

  // Compute validation errors
  const validationErrors = useMemo(() => {
    const errors: Record<string, string | string[]> = {};
    
    const modIdError = validateModId(config.modId);
    if (modIdError) errors.modId = modIdError;
    
    const modNameError = validateModName(config.modName);
    if (modNameError) errors.modName = modNameError;
    
    const versionError = validateVersion(config.modVersion);
    if (versionError) errors.modVersion = versionError;
    
    const groupError = validateModGroup(config.modGroup);
    if (groupError) errors.modGroup = groupError;

    // Validate dependencies
    const invalidDeps = config.dependencies.filter(dep => dep.group && dep.name && dep.version === '');
    if (invalidDeps.length > 0) {
      errors.dependencies = `${invalidDeps.length} dependency(ies) missing version`;
    }

    // Validate repositories
    const invalidRepos = config.repositories.filter(repo => repo.name && !validateUrl(repo.url));
    if (invalidRepos.length > 0) {
      errors.repositories = `${invalidRepos.length} repository(ies) with invalid URL`;
    }

    return errors;
  }, [config]);

  const isValid = Object.keys(validationErrors).length === 0;

  const updateConfig = (updates: Partial<GradleConfig>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    onConfigChange?.(updated);
  };

  const handleAddDependency = () => {
    updateConfig({
      dependencies: [
        ...config.dependencies,
        { id: `dep_${Date.now()}`, group: '', name: '', version: '', scope: 'implementation' },
      ],
    });
  };

  const handleRemoveDependency = (id: string) => {
    updateConfig({
      dependencies: config.dependencies.filter(d => d.id !== id),
    });
  };

  const handleUpdateDependency = (id: string, field: keyof GradleDependency, value: string) => {
    updateConfig({
      dependencies: config.dependencies.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      ),
    });
  };

  const handleAddRepository = () => {
    updateConfig({
      repositories: [
        ...config.repositories,
        { id: `repo_${Date.now()}`, name: '', url: '', type: 'maven' },
      ],
    });
  };

  const handleRemoveRepository = (id: string) => {
    updateConfig({
      repositories: config.repositories.filter(r => r.id !== id),
    });
  };

  const handleUpdateRepository = (id: string, field: keyof GradleRepository, value: string) => {
    updateConfig({
      repositories: config.repositories.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    });
  };

  const generateGradleFile = (): string => {
    if (config.loaderType === 'forge' || config.loaderType === 'neoforge') {
      return generateForgeGradle();
    }
    return generateFabricGradle();
  };

  const generateGradleProperties = (): string => {
    return `# Gradle Properties for ${config.modName}
org.gradle.jvmargs=-Xmx3G
org.gradle.daemon=false

# Minecraft and Mod Properties
mod_id=${config.modId}
mod_name=${config.modName}
mod_version=${config.modVersion}
mod_group=${config.modGroup}
mod_author=${config.modAuthor}

# Minecraft Properties
minecraft_version=${config.minecraftVersion}
java_version=${config.javaVersion}

${config.loaderType === 'forge' || config.loaderType === 'neoforge' ? `# Forge Configuration
forge_version=${config.forgeVersion}
mappings_channel=${config.mappingsChannel}
mappings_version=${config.mappingsVersion}` : `# Fabric Configuration
fabric_loader_version=${config.fabricLoaderVersion}
fabric_api_version=${config.fabricApiVersion}`}

# Build Configuration
org.gradle.parallel=true
org.gradle.workers.max=8`;
  };

  const generateForgeGradle = (): string => {
    let gradle = `plugins {
    id 'eclipse'
    id 'idea'
    id 'maven-publish'
    id 'net.minecraftforge.gradle' version '[6.0.16,6.2)'
}

version = '${config.modVersion}'
group = '${config.modGroup}'

base {
    archivesName = '${config.modId}'
}

java.toolchain.languageVersion = JavaLanguageVersion.of(${config.javaVersion})

minecraft {
    mappings channel: '${config.mappingsChannel}', version: '${config.mappingsVersion}'

    runs {
        client {
            workingDirectory project.file('run')
            property 'forge.logging.markers', 'REGISTRIES'
            property 'forge.logging.console.level', 'debug'
            mods {
                ${config.modId} {
                    source sourceSets.main
                }
            }
        }
        server {
            workingDirectory project.file('run')
            property 'forge.logging.console.level', 'debug'
            mods {
                ${config.modId} {
                    source sourceSets.main
                }
            }
        }
    }
}
`;

    if (config.useAccessTransformer) {
      gradle += `\n// Access Transformer\nminecraft {\n    accessTransformer = file('src/main/resources/META-INF/accesstransformer.cfg')\n}\n`;
    }

    if (config.useDataGen) {
      gradle += `\n// Data Generation\nminecraft {\n    runs {\n        data {\n            workingDirectory project.file('run')\n            property 'forge.logging.console.level', 'debug'\n            args '--mod', '${config.modId}', '--all', '--output', file('src/generated/resources/'), '--existing', file('src/main/resources/')\n        }\n    }\n}\n`;
    }

    gradle += `\nrepositories {\n`;
    config.repositories.forEach(repo => {
      gradle += `    maven {\n        name = '${repo.name}'\n        url = '${repo.url}'\n    }\n`;
    });
    gradle += `}\n\ndependencies {\n    minecraft "net.minecraftforge:forge:\${minecraft_version}-${config.forgeVersion}"\n`;

    config.dependencies.forEach(dep => {
      gradle += `    ${dep.scope} "${dep.group}:${dep.name}:${dep.version}"\n`;
    });
    gradle += `}\n`;

    if (config.useMixins) {
      gradle += `\n// Mixin Configuration\nmixin {\n    add sourceSets.main, "${config.modId}.refmap.json"\n    config "${config.modId}.mixins.json"\n}\n`;
    }

    gradle += `\njar {\n    manifest {\n        attributes([\n            "Specification-Title"     : "${config.modName}",\n            "Specification-Vendor"    : "${config.modAuthor}",\n            "Specification-Version"   : "1",\n            "Implementation-Title"    : project.name,\n            "Implementation-Version"  : project.jar.archiveVersion,\n            "Implementation-Vendor"   : "${config.modAuthor}",\n        ])\n    }\n}\n`;

    return gradle;
  };

  const generateFabricGradle = (): string => {
    let gradle = `plugins {
    id 'fabric-loom' version '1.4-SNAPSHOT'
    id 'maven-publish'
}

version = '${config.modVersion}'
group = '${config.modGroup}'

base {
    archivesName = '${config.modId}'
}

repositories {\n`;

    config.repositories.forEach(repo => {
      gradle += `    maven {\n        name = '${repo.name}'\n        url = '${repo.url}'\n    }\n`;
    });

    gradle += `}

dependencies {
    minecraft "com.mojang:minecraft:${config.minecraftVersion}"
    mappings "net.fabricmc:yarn:${config.mappingsVersion}:v2"
    modImplementation "net.fabricmc:fabric-loader:${config.fabricLoaderVersion}"
    modImplementation "net.fabricmc.fabric-api:fabric-api:${config.fabricApiVersion}+${config.minecraftVersion}"
`;

    config.dependencies.forEach(dep => {
      gradle += `    ${dep.scope} "${dep.group}:${dep.name}:${dep.version}"\n`;
    });

    gradle += `}

processResources {
    inputs.property "version", project.version
    filesMatching("fabric.mod.json") {
        expand "version": project.version
    }
}

tasks.withType(JavaCompile).configureEach {
    it.options.release = ${config.javaVersion}
}

java {
    withSourcesJar()
    sourceCompatibility = JavaVersion.VERSION_${config.javaVersion}
    targetCompatibility = JavaVersion.VERSION_${config.javaVersion}
}

jar {
    from("LICENSE") {
        rename { "\${it}_\${project.archivesBaseName}" }
    }
}
`;

    if (config.useMixins) {
      gradle += `\nloom {\n    mixin {\n        defaultRefmapName = "${config.modId}.refmap.json"\n    }\n}\n`;
    }

    return gradle;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateGradleFile());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const content = generateGradleFile();
    onExport?.(content);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'build.gradle';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Validation Warnings */}
      {!isValid && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Configuration Issues</p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>• <strong>{field}:</strong> {Array.isArray(error) ? error.join(', ') : error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
      {/* Mod Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileCode size={20} className="mr-2" />
          Mod Configuration
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mod ID</label>
            <input
              type="text"
              value={config.modId}
              onChange={(e) => updateConfig({ modId: e.target.value.toLowerCase() })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 font-mono text-sm ${
                validationErrors.modId
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="examplemod"
            />
            {validationErrors.modId && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.modId as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mod Name</label>
            <input
              type="text"
              value={config.modName}
              onChange={(e) => updateConfig({ modName: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 ${
                validationErrors.modName
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {validationErrors.modName && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.modName as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Version</label>
            <input
              type="text"
              value={config.modVersion}
              onChange={(e) => updateConfig({ modVersion: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 font-mono text-sm ${
                validationErrors.modVersion
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="1.0.0"
            />
            {validationErrors.modVersion && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.modVersion as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Group</label>
            <input
              type="text"
              value={config.modGroup}
              onChange={(e) => updateConfig({ modGroup: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md dark:bg-gray-700 font-mono text-sm ${
                validationErrors.modGroup
                  ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="com.example"
            />
            {validationErrors.modGroup && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors.modGroup as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Author</label>
            <input
              type="text"
              value={config.modAuthor}
              onChange={(e) => updateConfig({ modAuthor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Mod Loader</label>
            <select
              value={config.loaderType}
              onChange={(e) => updateConfig({ loaderType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="forge">Forge</option>
              <option value="fabric">Fabric</option>
              <option value="neoforge">NeoForge</option>
              <option value="quilt">Quilt</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Minecraft/Loader Versions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Version Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minecraft Version</label>
            <select
              value={config.minecraftVersion}
              onChange={(e) => updateConfig({ minecraftVersion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="1.21">1.21</option>
              <option value="1.20.4">1.20.4</option>
              <option value="1.20.1">1.20.1</option>
              <option value="1.19.4">1.19.4</option>
              <option value="1.19.2">1.19.2</option>
              <option value="1.18.2">1.18.2</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Java Version</label>
            <select
              value={config.javaVersion}
              onChange={(e) => updateConfig({ javaVersion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="21">Java 21</option>
              <option value="17">Java 17</option>
              <option value="16">Java 16</option>
            </select>
          </div>
          {(config.loaderType === 'forge' || config.loaderType === 'neoforge') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Forge Version</label>
                <input
                  type="text"
                  value={config.forgeVersion}
                  onChange={(e) => updateConfig({ forgeVersion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mappings</label>
                <div className="flex gap-2">
                  <select
                    value={config.mappingsChannel}
                    onChange={(e) => updateConfig({ mappingsChannel: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  >
                    <option value="official">Official</option>
                    <option value="parchment">Parchment</option>
                  </select>
                  <input
                    type="text"
                    value={config.mappingsVersion}
                    onChange={(e) => updateConfig({ mappingsVersion: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
                  />
                </div>
              </div>
            </>
          )}
          {config.loaderType === 'fabric' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Fabric Loader</label>
                <input
                  type="text"
                  value={config.fabricLoaderVersion}
                  onChange={(e) => updateConfig({ fabricLoaderVersion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fabric API</label>
                <input
                  type="text"
                  value={config.fabricApiVersion}
                  onChange={(e) => updateConfig({ fabricApiVersion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Advanced Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Advanced Options</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.useAccessTransformer}
              onChange={(e) => updateConfig({ useAccessTransformer: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm"><strong>Access Transformer</strong> - Modify access levels of Minecraft classes</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.useMixins}
              onChange={(e) => updateConfig({ useMixins: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm"><strong>Mixins</strong> - Use SpongePowered Mixin framework</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.useDataGen}
              onChange={(e) => updateConfig({ useDataGen: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm"><strong>Data Generation</strong> - Auto-generate JSON data files</span>
          </label>
        </div>
      </Card>

      {/* Dependencies */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Dependencies</h3>
          <Button onClick={handleAddDependency} size="sm">
            <Plus size={16} className="mr-2" />
            Add Dependency
          </Button>
        </div>
        <div className="space-y-3">
          {config.dependencies.map((dep) => (
            <div key={dep.id} className="p-3 border border-gray-300 dark:border-gray-600 rounded-md">
              <div className="grid grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  value={dep.group}
                  onChange={(e) => handleUpdateDependency(dep.id, 'group', e.target.value)}
                  placeholder="Group"
                  className="px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                />
                <input
                  type="text"
                  value={dep.name}
                  onChange={(e) => handleUpdateDependency(dep.id, 'name', e.target.value)}
                  placeholder="Artifact"
                  className="px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                />
                <input
                  type="text"
                  value={dep.version}
                  onChange={(e) => handleUpdateDependency(dep.id, 'version', e.target.value)}
                  placeholder="Version"
                  className="px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
                />
                <div className="flex gap-1">
                  <select
                    value={dep.scope}
                    onChange={(e) => handleUpdateDependency(dep.id, 'scope', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-xs"
                  >
                    <option value="implementation">impl</option>
                    <option value="compileOnly">compileOnly</option>
                    <option value="runtimeOnly">runtimeOnly</option>
                    <option value="modImplementation">modImpl</option>
                    <option value="testImplementation">testImpl</option>
                  </select>
                  <button
                    onClick={() => handleRemoveDependency(dep.id)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {config.dependencies.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No additional dependencies</p>
          )}
        </div>
      </Card>

      {/* Repositories */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Repositories</h3>
          <Button onClick={handleAddRepository} size="sm">
            <Plus size={16} className="mr-2" />
            Add Repository
          </Button>
        </div>
        <div className="space-y-3">
          {config.repositories.map((repo) => (
            <div key={repo.id} className="flex gap-2">
              <input
                type="text"
                value={repo.name}
                onChange={(e) => handleUpdateRepository(repo.id, 'name', e.target.value)}
                placeholder="Repository name"
                className="w-40 px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                value={repo.url}
                onChange={(e) => handleUpdateRepository(repo.id, 'url', e.target.value)}
                placeholder="https://..."
                className="flex-1 px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-sm font-mono"
              />
              <button
                onClick={() => handleRemoveRepository(repo.id)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Generated build.gradle Preview */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">build.gradle Preview</h3>
          <div className="flex gap-2">
            <Button onClick={handleCopy} size="sm" variant="outline" disabled={!isValid}>
              {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button onClick={handleExport} size="sm" disabled={!isValid}>
              <Download size={16} className="mr-1" />
              Export
            </Button>
          </div>
        </div>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre">
          {generateGradleFile()}
        </div>
      </Card>

      {/* gradle.properties Preview */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Settings2 size={18} className="mr-2" />
            gradle.properties
          </h3>
          <Button 
            onClick={() => {
              const content = generateGradleProperties();
              navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            size="sm"
            variant="outline"
          >
            <Copy size={16} className="mr-1" />
            Copy
          </Button>
        </div>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-40 overflow-y-auto whitespace-pre">
          {generateGradleProperties()}
        </div>
      </Card>
    </div>
  );
};
