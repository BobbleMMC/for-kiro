import React, { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, Plus, RefreshCw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  lineCount?: number;
}

interface FileExplorerProps {
  onFileSelect?: (file: FileNode) => void;
  onStructureChange?: (structure: FileNode) => void;
}

const DEFAULT_STRUCTURE: FileNode = {
  id: 'root',
  name: 'mod-name',
  type: 'folder',
  children: [
    {
      id: 'src',
      name: 'src',
      type: 'folder',
      children: [
        {
          id: 'main',
          name: 'main',
          type: 'folder',
          children: [
            {
              id: 'java',
              name: 'java',
              type: 'folder',
              children: [
                {
                  id: 'com',
                  name: 'com',
                  type: 'folder',
                  children: [
                    {
                      id: 'example',
                      name: 'example',
                      type: 'folder',
                      children: [
                        {
                          id: 'modmain',
                          name: 'ModMain.java',
                          type: 'file',
                          lineCount: 45,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'resources',
              name: 'resources',
              type: 'folder',
              children: [
                {
                  id: 'assets',
                  name: 'assets',
                  type: 'folder',
                  children: [
                    {
                      id: 'modid',
                      name: 'modid',
                      type: 'folder',
                      children: [
                        {
                          id: 'textures',
                          name: 'textures',
                          type: 'folder',
                        },
                        {
                          id: 'models',
                          name: 'models',
                          type: 'folder',
                        },
                      ],
                    },
                  ],
                },
                {
                  id: 'data',
                  name: 'data',
                  type: 'folder',
                  children: [
                    {
                      id: 'modid_data',
                      name: 'modid',
                      type: 'folder',
                      children: [
                        {
                          id: 'recipes',
                          name: 'recipes',
                          type: 'folder',
                        },
                        {
                          id: 'loot_tables',
                          name: 'loot_tables',
                          type: 'folder',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'build',
      name: 'build.gradle',
      type: 'file',
      lineCount: 120,
    },
    {
      id: 'readme',
      name: 'README.md',
      type: 'file',
      lineCount: 15,
    },
  ],
};

interface TreeNodeProps {
  node: FileNode;
  level: number;
  onSelect: (file: FileNode) => void;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  searchTerm: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, onSelect, expandedNodes, onToggle, searchTerm }) => {
  const isExpanded = expandedNodes.has(node.id);
  const isFolder = node.type === 'folder';
  const matchesSearch = !searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch && isFolder) {
    return null;
  }

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-sm"
        style={{ marginLeft: `${level * 16}px` }}
      >
        {isFolder && hasChildren && (
          <button onClick={() => onToggle(node.id)} className="mr-1 p-0.5">
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        )}
        {isFolder && !hasChildren && <div className="w-4" />}
        {!isFolder && <div className="w-4" />}

        {isFolder ? (
          <Folder size={16} className="mr-2 text-yellow-500" />
        ) : (
          <File size={16} className="mr-2 text-blue-500" />
        )}
        <span onClick={() => !isFolder && onSelect(node)} className="flex-1">
          {node.name}
        </span>
        {!isFolder && node.lineCount && (
          <span className="text-xs text-gray-500">({node.lineCount}L)</span>
        )}
      </div>

      {isExpanded && isFolder && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, onStructureChange }) => {
  const [structure, setStructure] = useState<FileNode>(DEFAULT_STRUCTURE);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'src', 'main']));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const handleToggle = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const handleRefresh = () => {
    setStructure(DEFAULT_STRUCTURE);
    setExpandedNodes(new Set(['root', 'src', 'main']));
    onStructureChange?.(DEFAULT_STRUCTURE);
  };

  const handleAddFile = () => {
    const newName = prompt('Enter file name:');
    if (newName) {
      const newFile: FileNode = {
        id: `file_${Date.now()}`,
        name: newName,
        type: 'file',
        lineCount: 0,
      };
      // Add to root for simplicity
      const updated = { ...structure };
      if (updated.children) {
        updated.children.push(newFile);
      }
      setStructure(updated);
      onStructureChange?.(updated);
    }
  };

  const countFiles = (node: FileNode): number => {
    if (node.type === 'file') return 1;
    return (node.children || []).reduce((sum, child) => sum + countFiles(child), 0);
  };

  const fileCount = countFiles(structure);

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Project:</strong> {structure.name} | <strong>Files:</strong> {fileCount}
          </p>
        </div>
      </Card>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
        />
        <Button onClick={handleRefresh} size="sm" variant="outline">
          <RefreshCw size={16} />
        </Button>
        <Button onClick={handleAddFile} size="sm">
          <Plus size={16} />
        </Button>
      </div>

      {/* File Tree */}
      <Card className="p-4 max-h-96 overflow-y-auto">
        <TreeNode
          node={structure}
          level={0}
          onSelect={handleFileSelect}
          expandedNodes={expandedNodes}
          onToggle={handleToggle}
          searchTerm={searchTerm}
        />
      </Card>

      {/* Selected File Info */}
      {selectedFile && (
        <Card className="p-4 bg-gray-50 dark:bg-gray-800">
          <h4 className="font-semibold text-sm mb-2">Selected File</h4>
          <div className="text-sm space-y-1">
            <p><strong>Name:</strong> {selectedFile.name}</p>
            <p><strong>Type:</strong> {selectedFile.type}</p>
            {selectedFile.lineCount && (
              <p><strong>Lines:</strong> {selectedFile.lineCount}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
