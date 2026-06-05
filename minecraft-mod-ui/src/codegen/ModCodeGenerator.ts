/**
 * ModCodeGenerator - The main orchestrator for generating complete mod code
 * 
 * Takes a project's configuration (loader, version, namespace) and its content
 * (blocks, items, entities, recipes) and generates ALL needed files for a
 * working Minecraft mod.
 * 
 * Flow:
 * 1. Reads project settings (loader, version, namespace, author)
 * 2. Queries KnowledgeBase for relevant patterns
 * 3. Routes to correct template generator (Fabric/Forge/NeoForge)
 * 4. Produces a complete file tree with Java source + JSON resources
 */

import type { Project, Block, Item, Enchantment, Recipe, EntityType } from '../types';
import type { GeneratedFile, TemplateContext, ModLoader, MinecraftVersion, ContentType } from './templates/types';
import KnowledgeBase from './knowledgeBase';

// Template imports
import {
  generateFabricModMain, generateFabricBlock, generateFabricItem,
  generateFabricEntity, generateFabricRecipe, generateFabricConfig,
} from './templates/fabric';
import {
  generateForgeModMain, generateForgeBlock, generateForgeItem,
  generateForgeEntity, generateForgeConfig,
} from './templates/forge';
import {
  generateNeoForgeModMain, generateNeoForgeBlock, generateNeoForgeItem,
  generateNeoForgeEntity, generateNeoForgeConfig,
} from './templates/neoforge';

// ============================================================
// TYPES
// ============================================================

export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  errors: string[];
  warnings: string[];
  stats: {
    totalFiles: number;
    javaFiles: number;
    jsonFiles: number;
    configFiles: number;
  };
}

export interface GenerationOptions {
  /** Generate only specific content types */
  contentTypes?: ContentType[];
  /** Include config/build files */
  includeConfig?: boolean;
  /** Include the main mod class */
  includeMainClass?: boolean;
  /** Merge language files into one */
  mergeLangFiles?: boolean;
  /** Record pattern usage for learning */
  trackUsage?: boolean;
}

const DEFAULT_OPTIONS: GenerationOptions = {
  includeConfig: true,
  includeMainClass: true,
  mergeLangFiles: true,
  trackUsage: true,
};

// ============================================================
// MAIN GENERATOR CLASS
// ============================================================

export class ModCodeGenerator {
  private project: Project;
  private ctx: TemplateContext;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(project: Project) {
    this.project = project;
    this.ctx = this.buildContext();
  }

  /**
   * Build template context from project settings
   */
  private buildContext(): TemplateContext {
    const project = this.project;
    return {
      namespace: project.namespace,
      modId: project.namespace,
      modName: project.name,
      modVersion: project.mod_version,
      author: project.author,
      minecraftVersion: project.minecraft_version as MinecraftVersion,
      modLoader: project.mod_loader as ModLoader,
    };
  }

  /**
   * Generate complete mod code for all project content
   */
  async generateFullMod(
    blocks: Block[],
    items: Item[],
    _enchantments: Enchantment[],
    recipes: Recipe[],
    entities: EntityType[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const allFiles: GeneratedFile[] = [];

    try {
      // Initialize knowledge base
      await KnowledgeBase.init();

      // 1. Generate config/build files
      if (opts.includeConfig) {
        const configFiles = this.generateConfigFiles();
        allFiles.push(...configFiles);
      }

      // 2. Generate main mod class
      if (opts.includeMainClass) {
        const mainFile = this.generateMainClass();
        if (mainFile) allFiles.push(mainFile);
      }

      // 3. Generate blocks
      if (!opts.contentTypes || opts.contentTypes.includes('block')) {
        for (const block of blocks) {
          try {
            const blockFiles = this.generateBlockFiles(block);
            allFiles.push(...blockFiles);
          } catch (err) {
            this.errors.push(`Failed to generate block "${block.block_name}": ${err}`);
          }
        }
      }

      // 4. Generate items
      if (!opts.contentTypes || opts.contentTypes.includes('item')) {
        for (const item of items) {
          try {
            const itemFiles = this.generateItemFiles(item);
            allFiles.push(...itemFiles);
          } catch (err) {
            this.errors.push(`Failed to generate item "${item.item_name}": ${err}`);
          }
        }
      }

      // 5. Generate recipes
      if (!opts.contentTypes || opts.contentTypes.includes('recipe')) {
        for (const recipe of recipes) {
          try {
            const recipeFiles = this.generateRecipeFiles(recipe, items, blocks);
            allFiles.push(...recipeFiles);
          } catch (err) {
            this.errors.push(`Failed to generate recipe "${recipe.recipe_name}": ${err}`);
          }
        }
      }

      // 6. Generate entities
      if (!opts.contentTypes || opts.contentTypes.includes('entity')) {
        for (const entity of entities) {
          try {
            const entityFiles = this.generateEntityFiles(entity);
            allFiles.push(...entityFiles);
          } catch (err) {
            this.errors.push(`Failed to generate entity "${entity.entity_name}": ${err}`);
          }
        }
      }

      // 7. Merge language files
      if (opts.mergeLangFiles) {
        this.mergeLangEntries(allFiles);
      }

      // 8. Generate combined registration classes
      const registryFiles = this.generateCombinedRegistries(blocks, items, entities);
      // Replace individual registry files with combined ones
      this.replaceRegistryFiles(allFiles, registryFiles);

      // 9. Track pattern usage
      if (opts.trackUsage) {
        await this.trackPatternUsage();
      }

    } catch (err) {
      this.errors.push(`Fatal generation error: ${err}`);
    }

    const stats = {
      totalFiles: allFiles.length,
      javaFiles: allFiles.filter(f => f.language === 'java').length,
      jsonFiles: allFiles.filter(f => f.language === 'json').length,
      configFiles: allFiles.filter(f => f.category === 'config').length,
    };

    return {
      success: this.errors.length === 0,
      files: allFiles,
      errors: [...this.errors],
      warnings: [...this.warnings],
      stats,
    };
  }

  /**
   * Generate code for a single block
   */
  generateBlockFiles(block: Block): GeneratedFile[] {
    const blockCtx = {
      ...this.ctx,
      properties: {
        blockName: block.block_name,
        displayName: block.display_name,
        hardness: block.hardness,
        resistance: block.resistance,
        luminance: block.luminance,
        materialType: block.material_type,
        requiresTool: block.material_type === 'ore' || block.material_type === 'metal',
        hasGravity: block.has_gravity,
        isFlammable: block.is_flammable,
        slipperiness: block.slipperiness,
        speedFactor: block.speed_factor,
      },
    };

    switch (this.ctx.modLoader) {
      case 'fabric':
        return generateFabricBlock(blockCtx);
      case 'forge':
        return generateForgeBlock(blockCtx);
      case 'neoforge':
        return generateNeoForgeBlock(blockCtx);
      default:
        this.warnings.push(`Unknown mod loader: ${this.ctx.modLoader}, falling back to Fabric`);
        return generateFabricBlock(blockCtx);
    }
  }

  /**
   * Generate code for a single item
   */
  generateItemFiles(item: Item): GeneratedFile[] {
    const itemCtx = {
      ...this.ctx,
      properties: {
        itemName: item.item_name,
        displayName: item.display_name,
        maxStackSize: item.max_stack_size,
        rarity: item.rarity,
        isWeapon: item.is_weapon,
        isArmor: item.is_armor,
        isTool: item.is_tool,
        isConsumable: item.is_consumable,
        durability: item.durability,
        attackDamage: item.attack_damage,
        attackSpeed: item.attack_speed,
        foodNutrition: item.food_nutrition,
        foodSaturation: item.food_saturation,
      },
    };

    switch (this.ctx.modLoader) {
      case 'fabric':
        return generateFabricItem(itemCtx);
      case 'forge':
        return generateForgeItem(itemCtx);
      case 'neoforge':
        return generateNeoForgeItem(itemCtx);
      default:
        return generateFabricItem(itemCtx);
    }
  }

  /**
   * Generate code for a recipe
   */
  generateRecipeFiles(recipe: Recipe, items: Item[], blocks: Block[]): GeneratedFile[] {
    // Resolve output item/block name
    let outputItem = `${this.ctx.namespace}:unknown`;
    if (recipe.output_item_id) {
      const item = items.find(i => i.id === recipe.output_item_id);
      if (item) outputItem = `${this.ctx.namespace}:${item.item_name}`;
    } else if (recipe.output_block_id) {
      const block = blocks.find(b => b.id === recipe.output_block_id);
      if (block) outputItem = `${this.ctx.namespace}:${block.block_name}`;
    }

    // Resolve ingredient names
    const ingredients = (recipe.ingredients || []).map(ing => {
      let itemName = 'minecraft:stone';
      if (ing.tag_name) {
        itemName = ing.tag_name.includes(':') ? ing.tag_name : `minecraft:${ing.tag_name}`;
      } else if (ing.item_id) {
        const item = items.find(i => i.id === ing.item_id);
        if (item) itemName = `${this.ctx.namespace}:${item.item_name}`;
      } else if (ing.block_id) {
        const block = blocks.find(b => b.id === ing.block_id);
        if (block) itemName = `${this.ctx.namespace}:${block.block_name}`;
      }
      return { slot: ing.position, item: itemName };
    });

    const recipeCtx = {
      ...this.ctx,
      properties: {
        recipeName: recipe.recipe_name,
        recipeType: recipe.recipe_type as 'shaped' | 'shapeless' | 'smelting' | 'blasting' | 'smoking' | 'campfire' | 'stonecutting',
        outputItem,
        outputCount: recipe.output_count,
        ingredients,
        cookTime: recipe.cook_time,
        experience: recipe.experience,
      },
    };

    // Recipes are JSON-based, same format for all loaders
    switch (this.ctx.modLoader) {
      case 'fabric':
        return generateFabricRecipe(recipeCtx);
      case 'forge':
      case 'neoforge':
        // Forge/NeoForge use same JSON format for data packs
        return generateFabricRecipe(recipeCtx);
      default:
        return generateFabricRecipe(recipeCtx);
    }
  }

  /**
   * Generate code for an entity
   */
  generateEntityFiles(entity: EntityType): GeneratedFile[] {
    const entityCtx = {
      ...this.ctx,
      properties: {
        entityName: entity.entity_name,
        displayName: entity.display_name,
        entityType: entity.entity_type as 'hostile' | 'passive' | 'neutral' | 'boss',
        maxHealth: entity.max_health,
        attackDamage: entity.attack_damage,
        attackSpeed: entity.attack_speed,
        movementSpeed: entity.movement_speed,
        armorValue: entity.armor_value,
        followRange: entity.follow_range,
        spawnType: entity.spawn_type,
      },
    };

    switch (this.ctx.modLoader) {
      case 'fabric':
        return generateFabricEntity(entityCtx);
      case 'forge':
        return generateForgeEntity(entityCtx);
      case 'neoforge':
        return generateNeoForgeEntity(entityCtx);
      default:
        return generateFabricEntity(entityCtx);
    }
  }

  /**
   * Generate main mod class
   */
  private generateMainClass(): GeneratedFile | null {
    switch (this.ctx.modLoader) {
      case 'fabric':
        return generateFabricModMain(this.ctx);
      case 'forge':
        return generateForgeModMain(this.ctx);
      case 'neoforge':
        return generateNeoForgeModMain(this.ctx);
      default:
        return null;
    }
  }

  /**
   * Generate config/build files
   */
  private generateConfigFiles(): GeneratedFile[] {
    switch (this.ctx.modLoader) {
      case 'fabric':
        return generateFabricConfig(this.ctx);
      case 'forge':
        return generateForgeConfig(this.ctx);
      case 'neoforge':
        return generateNeoForgeConfig(this.ctx);
      default:
        return [];
    }
  }

  /**
   * Merge all lang/en_us.json entries into one unified file
   */
  private mergeLangEntries(files: GeneratedFile[]): void {
    const langFiles = files.filter(f =>
      f.path.endsWith('lang/en_us.json')
    );

    if (langFiles.length <= 1) return;

    // Merge all lang entries
    const mergedLang: Record<string, string> = {};
    for (const langFile of langFiles) {
      try {
        const entries = JSON.parse(langFile.content);
        Object.assign(mergedLang, entries);
      } catch {
        // Skip invalid JSON
      }
    }

    // Remove individual lang files
    const langIndices = langFiles.map(lf => files.indexOf(lf)).sort((a, b) => b - a);
    for (const idx of langIndices) {
      if (idx >= 0) files.splice(idx, 1);
    }

    // Add merged lang file
    files.push({
      path: `src/main/resources/assets/${this.ctx.namespace}/lang/en_us.json`,
      language: 'json',
      description: 'Combined language file with all translations',
      category: 'resource',
      content: JSON.stringify(mergedLang, null, 2),
    });
  }

  /**
   * Generate combined registration classes (instead of per-content individual ones)
   */
  private generateCombinedRegistries(blocks: Block[], items: Item[], entities: EntityType[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const modClass = toPascalCase(this.ctx.namespace);

    if (this.ctx.modLoader === 'fabric') {
      // Combined block registry
      if (blocks.length > 0) {
        files.push(this.generateFabricCombinedBlockRegistry(blocks, modClass));
      }
      // Combined item registry
      if (items.length > 0) {
        files.push(this.generateFabricCombinedItemRegistry(items, modClass));
      }
      // Combined entity registry
      if (entities.length > 0) {
        files.push(this.generateFabricCombinedEntityRegistry(entities, modClass));
      }
    } else if (this.ctx.modLoader === 'forge') {
      if (blocks.length > 0) {
        files.push(this.generateForgeCombinedBlockRegistry(blocks, modClass));
      }
      if (items.length > 0) {
        files.push(this.generateForgeCombinedItemRegistry(items, modClass));
      }
      if (entities.length > 0) {
        files.push(this.generateForgeCombinedEntityRegistry(entities, modClass));
      }
    } else if (this.ctx.modLoader === 'neoforge') {
      if (blocks.length > 0) {
        files.push(this.generateNeoforgeCombinedBlockRegistry(blocks, modClass));
      }
      if (items.length > 0) {
        files.push(this.generateNeoforgeCombinedItemRegistry(items, modClass));
      }
      if (entities.length > 0) {
        files.push(this.generateNeoforgeCombinedEntityRegistry(entities, modClass));
      }
    }

    return files;
  }

  // ---- FABRIC COMBINED REGISTRIES ----

  private generateFabricCombinedBlockRegistry(blocks: Block[], modClass: string): GeneratedFile {
    const packagePath = `net.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const blockDeclarations = blocks.map(b => {
      const varName = b.block_name.toUpperCase();
      let settings = `AbstractBlock.Settings.create()\n            .strength(${b.hardness}f, ${b.resistance}f)`;
      if (b.luminance > 0) settings += `\n            .luminance(state -> ${b.luminance})`;
      if (b.material_type === 'ore' || b.material_type === 'metal') settings += `\n            .requiresTool()`;
      if (b.slipperiness !== 0.6) settings += `\n            .slipperiness(${b.slipperiness}f)`;
      if (b.speed_factor !== 1.0) settings += `\n            .velocityMultiplier(${b.speed_factor}f)`;

      const blockClass = b.has_gravity ? 'FallingBlock' : 'Block';
      return `    public static final Block ${varName} = registerBlock("${b.block_name}",\n        new ${blockClass}(${settings}));`;
    }).join('\n\n');

    const creativeEntries = blocks.map(b =>
      `            entries.add(${b.block_name.toUpperCase()});`
    ).join('\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/block/${modClass}Blocks.java`,
      language: 'java',
      description: 'Combined block registration class',
      category: 'block',
      content: `package ${packagePath}.block;

import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.block.AbstractBlock;
import net.minecraft.block.Block;
import net.minecraft.block.FallingBlock;
import net.minecraft.item.BlockItem;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroups;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Blocks {

${blockDeclarations}

    private static Block registerBlock(String name, Block block) {
        registerBlockItem(name, block);
        return Registry.register(Registries.BLOCK, Identifier.of(${modClass}Mod.MOD_ID, name), block);
    }

    private static void registerBlockItem(String name, Block block) {
        Registry.register(Registries.ITEM, Identifier.of(${modClass}Mod.MOD_ID, name),
            new BlockItem(block, new Item.Settings()));
    }

    public static void register() {
        ${modClass}Mod.LOGGER.info("Registering ${blocks.length} blocks for " + ${modClass}Mod.MOD_ID);

        ItemGroupEvents.modifyEntriesEvent(ItemGroups.BUILDING_BLOCKS).register(entries -> {
${creativeEntries}
        });
    }
}
`,
    };
  }

  private generateFabricCombinedItemRegistry(items: Item[], modClass: string): GeneratedFile {
    const packagePath = `net.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const itemDeclarations = items.map(i => {
      const varName = i.item_name.toUpperCase();
      let settings = 'new Item.Settings()';
      if (i.max_stack_size !== 64) settings += `.maxCount(${i.max_stack_size})`;
      if (i.rarity !== 'common') settings += `.rarity(Rarity.${i.rarity.toUpperCase()})`;
      if (i.durability) settings += `.maxDamage(${i.durability})`;
      if (i.food_nutrition) {
        settings += `.food(new FoodComponent.Builder().nutrition(${i.food_nutrition}).saturationModifier(${i.food_saturation || 0}f).build())`;
      }
      return `    public static final Item ${varName} = registerItem("${i.item_name}",\n        new Item(${settings}));`;
    }).join('\n\n');

    const creativeEntries = items.map(i =>
      `            entries.add(${i.item_name.toUpperCase()});`
    ).join('\n');

    const needsFood = items.some(i => i.food_nutrition);
    const foodImport = needsFood ? '\nimport net.minecraft.component.type.FoodComponent;' : '';

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/item/${modClass}Items.java`,
      language: 'java',
      description: 'Combined item registration class',
      category: 'item',
      content: `package ${packagePath}.item;

import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroups;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;
import net.minecraft.util.Rarity;${foodImport}
import ${packagePath}.${modClass}Mod;

public class ${modClass}Items {

${itemDeclarations}

    private static Item registerItem(String name, Item item) {
        return Registry.register(Registries.ITEM, Identifier.of(${modClass}Mod.MOD_ID, name), item);
    }

    public static void register() {
        ${modClass}Mod.LOGGER.info("Registering ${items.length} items for " + ${modClass}Mod.MOD_ID);

        ItemGroupEvents.modifyEntriesEvent(ItemGroups.INGREDIENTS).register(entries -> {
${creativeEntries}
        });
    }
}
`,
    };
  }

  private generateFabricCombinedEntityRegistry(entities: EntityType[], modClass: string): GeneratedFile {
    const packagePath = `net.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const entityDeclarations = entities.map(e => {
      const varName = e.entity_name.toUpperCase();
      const className = toPascalCase(e.entity_name);
      const spawnGroup = e.entity_type === 'hostile' || e.entity_type === 'boss' ? 'MONSTER' : 'CREATURE';
      return `    public static final EntityType<${className}Entity> ${varName} =
        Registry.register(Registries.ENTITY_TYPE, Identifier.of(${modClass}Mod.MOD_ID, "${e.entity_name}"),
            EntityType.Builder.create(${className}Entity::new, SpawnGroup.${spawnGroup})
                .dimensions(0.6f, 1.8f).build());`;
    }).join('\n\n');

    const attributeRegistrations = entities.map(e => {
      const varName = e.entity_name.toUpperCase();
      const className = toPascalCase(e.entity_name);
      return `        FabricDefaultAttributeRegistry.register(${varName}, ${className}Entity.createAttributes());`;
    }).join('\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${modClass}Entities.java`,
      language: 'java',
      description: 'Combined entity registration class',
      category: 'entity',
      content: `package ${packagePath}.entity;

import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Entities {

${entityDeclarations}

    public static void register() {
        ${modClass}Mod.LOGGER.info("Registering ${entities.length} entities for " + ${modClass}Mod.MOD_ID);
${attributeRegistrations}
    }
}
`,
    };
  }

  // ---- FORGE COMBINED REGISTRIES ----

  private generateForgeCombinedBlockRegistry(blocks: Block[], modClass: string): GeneratedFile {
    const packagePath = `com.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const blockDeclarations = blocks.map(b => {
      const varName = b.block_name.toUpperCase();
      let settings = `BlockBehaviour.Properties.of().strength(${b.hardness}f, ${b.resistance}f)`;
      if (b.luminance > 0) settings += `.lightLevel(state -> ${b.luminance})`;
      if (b.material_type === 'ore' || b.material_type === 'metal') settings += `.requiresCorrectToolForDrops()`;
      const blockClass = b.has_gravity ? 'FallingBlock' : 'Block';
      return `    public static final RegistryObject<Block> ${varName} = BLOCKS.register("${b.block_name}",\n        () -> new ${blockClass}(${settings}));`;
    }).join('\n\n');

    const blockItemDeclarations = blocks.map(b => {
      const varName = b.block_name.toUpperCase();
      return `    public static final RegistryObject<Item> ${varName}_ITEM = ${modClass}Items.ITEMS.register("${b.block_name}",\n        () -> new BlockItem(${varName}.get(), new Item.Properties()));`;
    }).join('\n\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/block/${modClass}Blocks.java`,
      language: 'java',
      description: 'Combined Forge block registration class',
      category: 'block',
      content: `package ${packagePath}.block;

import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.FallingBlock;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import ${packagePath}.${modClass}Mod;
import ${packagePath}.item.${modClass}Items;

public class ${modClass}Blocks {
    public static final DeferredRegister<Block> BLOCKS =
        DeferredRegister.create(ForgeRegistries.BLOCKS, ${modClass}Mod.MOD_ID);

${blockDeclarations}

    // Block Items
${blockItemDeclarations}

    public static void addToCreativeTab(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.BUILDING_BLOCKS) {
${blocks.map(b => `            event.accept(${b.block_name.toUpperCase()});`).join('\n')}
        }
    }
}
`,
    };
  }

  private generateForgeCombinedItemRegistry(items: Item[], modClass: string): GeneratedFile {
    const packagePath = `com.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const itemDeclarations = items.map(i => {
      const varName = i.item_name.toUpperCase();
      let props = 'new Item.Properties()';
      if (i.max_stack_size !== 64) props += `.stacksTo(${i.max_stack_size})`;
      if (i.rarity !== 'common') props += `.rarity(net.minecraft.world.item.Rarity.${i.rarity.toUpperCase()})`;
      if (i.durability) props += `.durability(${i.durability})`;
      return `    public static final RegistryObject<Item> ${varName} = ITEMS.register("${i.item_name}",\n        () -> new Item(${props}));`;
    }).join('\n\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/item/${modClass}Items.java`,
      language: 'java',
      description: 'Combined Forge item registration class',
      category: 'item',
      content: `package ${packagePath}.item;

import net.minecraft.world.item.Item;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Items {
    public static final DeferredRegister<Item> ITEMS =
        DeferredRegister.create(ForgeRegistries.ITEMS, ${modClass}Mod.MOD_ID);

${itemDeclarations}

    public static void addToCreativeTab(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.INGREDIENTS) {
${items.map(i => `            event.accept(${i.item_name.toUpperCase()});`).join('\n')}
        }
    }
}
`,
    };
  }

  private generateForgeCombinedEntityRegistry(entities: EntityType[], modClass: string): GeneratedFile {
    const packagePath = `com.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const entityDeclarations = entities.map(e => {
      const varName = e.entity_name.toUpperCase();
      const className = toPascalCase(e.entity_name);
      const category = e.entity_type === 'hostile' || e.entity_type === 'boss' ? 'MONSTER' : 'CREATURE';
      return `    public static final RegistryObject<EntityType<${className}Entity>> ${varName} =\n        ENTITY_TYPES.register("${e.entity_name}",\n            () -> EntityType.Builder.of(${className}Entity::new, MobCategory.${category})\n                .sized(0.6f, 1.8f).build("${e.entity_name}"));`;
    }).join('\n\n');

    const attrRegistrations = entities.map(e => {
      const varName = e.entity_name.toUpperCase();
      const className = toPascalCase(e.entity_name);
      return `            event.put(${varName}.get(), ${className}Entity.createAttributes().build());`;
    }).join('\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${modClass}Entities.java`,
      language: 'java',
      description: 'Combined Forge entity registration class',
      category: 'entity',
      content: `package ${packagePath}.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraftforge.event.entity.EntityAttributeCreationEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Entities {
    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
        DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, ${modClass}Mod.MOD_ID);

${entityDeclarations}

    @Mod.EventBusSubscriber(modid = ${modClass}Mod.MOD_ID, bus = Mod.EventBusSubscriber.Bus.MOD)
    public static class ModEvents {
        @SubscribeEvent
        public static void registerAttributes(EntityAttributeCreationEvent event) {
${attrRegistrations}
        }
    }
}
`,
    };
  }

  // ---- NEOFORGE COMBINED REGISTRIES ----

  private generateNeoforgeCombinedBlockRegistry(blocks: Block[], modClass: string): GeneratedFile {
    const packagePath = `com.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const blockDeclarations = blocks.map(b => {
      const varName = b.block_name.toUpperCase();
      let settings = `BlockBehaviour.Properties.of().strength(${b.hardness}f, ${b.resistance}f)`;
      if (b.luminance > 0) settings += `.lightLevel(state -> ${b.luminance})`;
      if (b.material_type === 'ore' || b.material_type === 'metal') settings += `.requiresCorrectToolForDrops()`;
      const blockClass = b.has_gravity ? 'FallingBlock' : 'Block';
      return `    public static final DeferredBlock<Block> ${varName} = BLOCKS.register("${b.block_name}",\n        () -> new ${blockClass}(${settings}));`;
    }).join('\n\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/block/${modClass}Blocks.java`,
      language: 'java',
      description: 'Combined NeoForge block registration class',
      category: 'block',
      content: `package ${packagePath}.block;

import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.FallingBlock;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Blocks {
    public static final DeferredRegister.Blocks BLOCKS =
        DeferredRegister.createBlocks(${modClass}Mod.MOD_ID);

${blockDeclarations}

    public static void addToCreativeTab(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.BUILDING_BLOCKS) {
${blocks.map(b => `            event.accept(${b.block_name.toUpperCase()});`).join('\n')}
        }
    }
}
`,
    };
  }

  private generateNeoforgeCombinedItemRegistry(items: Item[], modClass: string): GeneratedFile {
    const packagePath = `com.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const itemDeclarations = items.map(i => {
      const varName = i.item_name.toUpperCase();
      let props = 'new Item.Properties()';
      if (i.max_stack_size !== 64) props += `.stacksTo(${i.max_stack_size})`;
      if (i.rarity !== 'common') props += `.rarity(net.minecraft.world.item.Rarity.${i.rarity.toUpperCase()})`;
      if (i.durability) props += `.durability(${i.durability})`;
      return `    public static final DeferredItem<Item> ${varName} = ITEMS.register("${i.item_name}",\n        () -> new Item(${props}));`;
    }).join('\n\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/item/${modClass}Items.java`,
      language: 'java',
      description: 'Combined NeoForge item registration class',
      category: 'item',
      content: `package ${packagePath}.item;

import net.minecraft.world.item.Item;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Items {
    public static final DeferredRegister.Items ITEMS =
        DeferredRegister.createItems(${modClass}Mod.MOD_ID);

${itemDeclarations}

    public static void addToCreativeTab(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.INGREDIENTS) {
${items.map(i => `            event.accept(${i.item_name.toUpperCase()});`).join('\n')}
        }
    }
}
`,
    };
  }

  private generateNeoforgeCombinedEntityRegistry(entities: EntityType[], modClass: string): GeneratedFile {
    const packagePath = `com.${this.ctx.author.toLowerCase()}.${this.ctx.namespace}`;

    const entityDeclarations = entities.map(e => {
      const varName = e.entity_name.toUpperCase();
      const className = toPascalCase(e.entity_name);
      const category = e.entity_type === 'hostile' || e.entity_type === 'boss' ? 'MONSTER' : 'CREATURE';
      return `    public static final Supplier<EntityType<${className}Entity>> ${varName} =\n        ENTITY_TYPES.register("${e.entity_name}",\n            () -> EntityType.Builder.of(${className}Entity::new, MobCategory.${category})\n                .sized(0.6f, 1.8f).build("${e.entity_name}"));`;
    }).join('\n\n');

    const attrRegistrations = entities.map(e => {
      const varName = e.entity_name.toUpperCase();
      const className = toPascalCase(e.entity_name);
      return `            event.put(${varName}.get(), ${className}Entity.createAttributes().build());`;
    }).join('\n');

    return {
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${modClass}Entities.java`,
      language: 'java',
      description: 'Combined NeoForge entity registration class',
      category: 'entity',
      content: `package ${packagePath}.entity;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
import net.neoforged.neoforge.registries.DeferredRegister;
import java.util.function.Supplier;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Entities {
    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
        DeferredRegister.create(Registries.ENTITY_TYPE, ${modClass}Mod.MOD_ID);

${entityDeclarations}

    @EventBusSubscriber(modid = ${modClass}Mod.MOD_ID, bus = EventBusSubscriber.Bus.MOD)
    public static class ModEvents {
        @SubscribeEvent
        public static void registerAttributes(EntityAttributeCreationEvent event) {
${attrRegistrations}
        }
    }
}
`,
    };
  }

  /**
   * Replace individual registry files with combined ones
   */
  private replaceRegistryFiles(allFiles: GeneratedFile[], registryFiles: GeneratedFile[]): void {
    for (const regFile of registryFiles) {
      // Find and replace existing files with same path
      const existingIdx = allFiles.findIndex(f => f.path === regFile.path);
      if (existingIdx >= 0) {
        allFiles[existingIdx] = regFile;
      } else {
        allFiles.push(regFile);
      }
    }
  }

  /**
   * Track which patterns were used for learning
   */
  private async trackPatternUsage(): Promise<void> {
    try {
      const pattern = await KnowledgeBase.getBestPattern(
        this.ctx.modLoader,
        this.ctx.minecraftVersion,
        'block'
      );
      if (pattern?.id) {
        await KnowledgeBase.patterns.recordUsage(pattern.id);
      }
    } catch {
      // Non-critical, don't fail generation for tracking
    }
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Quick generation - single block
 */
export function generateSingleBlock(project: Project, block: Block): GeneratedFile[] {
  const gen = new ModCodeGenerator(project);
  return gen.generateBlockFiles(block);
}

/**
 * Quick generation - single item
 */
export function generateSingleItem(project: Project, item: Item): GeneratedFile[] {
  const gen = new ModCodeGenerator(project);
  return gen.generateItemFiles(item);
}

/**
 * Quick generation - single entity
 */
export function generateSingleEntity(project: Project, entity: EntityType): GeneratedFile[] {
  const gen = new ModCodeGenerator(project);
  return gen.generateEntityFiles(entity);
}

/**
 * Quick generation - single recipe
 */
export function generateSingleRecipe(project: Project, recipe: Recipe, items: Item[], blocks: Block[]): GeneratedFile[] {
  const gen = new ModCodeGenerator(project);
  return gen.generateRecipeFiles(recipe, items, blocks);
}

// ============================================================
// HELPERS
// ============================================================

function toPascalCase(str: string): string {
  return str.replace(/(^|_)([a-z])/g, (_, _pre, char) => char.toUpperCase());
}

export default ModCodeGenerator;
