/**
 * Code Generation Template Types
 * Defines the structure for mod loader-specific code templates
 */

export type ModLoader = 'fabric' | 'forge' | 'neoforge';
export type MinecraftVersion = '1.20.1' | '1.20.2' | '1.20.4' | '1.21' | '1.21.1' | '1.21.4';
export type ContentType = 'block' | 'item' | 'enchantment' | 'recipe' | 'entity' | 'event' | 'biome' | 'dimension';

export interface TemplateContext {
  // Project-level
  namespace: string;
  modId: string;
  modName: string;
  modVersion: string;
  author: string;
  minecraftVersion: MinecraftVersion;
  modLoader: ModLoader;

  // Content-level (depends on what's being generated)
  className?: string;
  registryName?: string;
  displayName?: string;
  properties?: Record<string, unknown>;
}

export interface GeneratedFile {
  path: string;          // e.g. "src/main/java/com/example/mod/block/RubyBlock.java"
  content: string;       // The generated code
  language: 'java' | 'json' | 'toml' | 'gradle' | 'properties';
  description: string;   // What this file does
  category: ContentType | 'config' | 'main' | 'mixin' | 'resource';
}

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  modLoader: ModLoader;
  supportedVersions: MinecraftVersion[];
  contentType: ContentType | 'config' | 'main';
  files: TemplateFile[];
}

export interface TemplateFile {
  pathTemplate: string;  // Template for file path with {variables}
  contentTemplate: string; // Template content with {variables}
  language: 'java' | 'json' | 'toml' | 'gradle' | 'properties';
  description: string;
}

/**
 * Registration pattern for a specific loader
 */
export interface RegistrationPattern {
  modLoader: ModLoader;
  versions: MinecraftVersion[];
  contentType: ContentType;
  // How items are registered in this loader
  registryMethod: string;
  // Import statements needed
  imports: string[];
  // The registration call pattern
  registrationCode: string;
  // Where the registration is typically called from
  registrationLocation: 'static_init' | 'mod_constructor' | 'event_handler' | 'deferred_register';
}

/**
 * Version-specific API differences
 */
export interface VersionDiff {
  fromVersion: MinecraftVersion;
  toVersion: MinecraftVersion;
  modLoader: ModLoader;
  changes: {
    contentType: ContentType;
    oldApi: string;
    newApi: string;
    description: string;
  }[];
}

/**
 * Learned code pattern from user or knowledge base
 */
export interface LearnedPattern {
  id?: number;
  modLoader: ModLoader;
  minecraftVersion: MinecraftVersion;
  contentType: ContentType;
  patternName: string;
  description: string;
  codeSnippet: string;
  imports: string[];
  dependencies?: string[];
  tags: string[];
  isUserDefined: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}
