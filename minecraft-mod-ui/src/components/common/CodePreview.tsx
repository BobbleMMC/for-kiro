import React, { useRef, useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import Card from './Card';
import Button from './Button';

interface CodePreviewProps {
  code: string;
  language?: 'java' | 'json' | 'xml' | 'gradle';
  title?: string;
  fileName?: string;
  onCopy?: () => void;
}

const highlightCode = (code: string, language: string): React.ReactNode[] => {
  const lines = code.split('\n');
  return lines.map((line, idx) => {
    let highlighted = line;

    // Basic Java highlighting
    if (language === 'java') {
      highlighted = highlighted
        .replace(/(public|private|protected|class|interface|static|final|void|int|String|boolean|new|return|import|package)/g, (match) => `<span class="text-purple-700 dark:text-purple-300 font-semibold">${match}</span>`)
        .replace(/(".*?")/g, (match) => `<span class="text-red-600 dark:text-red-400">${match}</span>`)
        .replace(/(\/\/.*)/g, (match) => `<span class="text-green-600 dark:text-green-400 italic">${match}</span>`)
        .replace(/(\d+)/g, (match) => `<span class="text-blue-600 dark:text-blue-400">${match}</span>`);
    }

    // Basic JSON highlighting
    if (language === 'json') {
      highlighted = highlighted
        .replace(/(".*?")\s*:/g, (match) => `<span class="text-purple-700 dark:text-purple-300 font-semibold">${match}</span>`)
        .replace(/:\s*(".*?")/g, (match) => `<span class="text-red-600 dark:text-red-400">${match}</span>`)
        .replace(/:\s*(true|false|null)/g, (match) => `<span class="text-orange-600 dark:text-orange-400">${match}</span>`)
        .replace(/:\s*(\d+)/g, (match) => `<span class="text-blue-600 dark:text-blue-400">${match}</span>`);
    }

    return (
      <div key={idx} className="flex">
        <span className="inline-block w-8 text-right pr-4 text-gray-500 dark:text-gray-600 select-none">
          {idx + 1}
        </span>
        <code
          className="flex-1 font-mono text-sm"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    );
  });
};

export const CodePreview: React.FC<CodePreviewProps> = ({
  code,
  language = 'java',
  title,
  fileName,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName || `code.${language}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const lineCount = code.split('\n').length;

  return (
    <Card className="p-4 bg-gray-900 dark:bg-gray-950 border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && <h4 className="text-sm font-semibold text-white">{title}</h4>}
          {fileName && (
            <p className="text-xs text-gray-500">
              {fileName} • {lineCount} lines
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            size="sm"
            variant="outline"
            className="text-gray-300 hover:text-white"
          >
            {copied ? (
              <>
                <Check size={16} className="mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy size={16} className="mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            size="sm"
            variant="outline"
            className="text-gray-300 hover:text-white"
          >
            <Download size={16} className="mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* Code Display */}
      <div
        ref={codeRef}
        className="bg-gray-950 rounded border border-gray-800 p-4 overflow-x-auto max-h-96 overflow-y-auto text-gray-100"
        style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
      >
        {highlightCode(code, language)}
      </div>
    </Card>
  );
};

// Code Generation Helpers
export const generateBlockCode = (blockName: string): string => {
  return `package com.example.blocks;

import net.minecraft.block.Block;
import net.minecraft.block.material.Material;
import net.minecraft.item.BlockItem;
import net.minecraft.item.Item;

public class ${blockName}Block extends Block {
  public ${blockName}Block() {
    super(Block.Properties.of(Material.STONE)
      .strength(2.0F, 6.0F)
      .sound(SoundType.STONE));
  }

  // Custom block properties here
}`;
};

export const generateItemCode = (itemName: string): string => {
  return `package com.example.items;

import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

public class ${itemName}Item extends Item {
  public ${itemName}Item(Item.Properties properties) {
    super(properties);
  }

  @Override
  public boolean isEnchantable(ItemStack stack) {
    return true;
  }

  // Custom item logic here
}`;
};

export const generateRecipeJson = (_recipeName: string, resultItem: string): string => {
  return `{
  "type": "crafting_shaped",
  "pattern": [
    "###",
    "###",
    "###"
  ],
  "key": {
    "#": {
      "item": "minecraft:material_item"
    }
  },
  "result": {
    "item": "${resultItem}",
    "count": 1
  }
}`;
};

export const generateEntityJson = (entityName: string): string => {
  return `{
  "type": "custom:${entityName.toLowerCase()}",
  "entity": "custom:${entityName.toLowerCase()}",
  "attributes": {
    "max_health": 20.0,
    "movement_speed": 0.1,
    "attack_damage": 4.0
  },
  "loot": [
    {
      "item": "minecraft:experience_bottle",
      "count": [1, 5]
    }
  ]
}`;
};

export const generateBiomeJson = (_biomeName: string): string => {
  return `{
  "precipitation": "rain",
  "temperature": 0.8,
  "downfall": 0.4,
  "effects": {
    "sky_color": 7907327,
    "water_color": 4159204,
    "water_fog_color": 329011
  },
  "creature_spawn_probability": 0.1,
  "spawners": {
    "creature": [
      {
        "type": "minecraft:sheep",
        "weight": 12,
        "minCount": 4,
        "maxCount": 4
      }
    ]
  }
}`;
};
