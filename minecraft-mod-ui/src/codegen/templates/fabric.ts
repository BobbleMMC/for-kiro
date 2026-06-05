/**
 * Fabric Mod Loader Templates
 * Complete code generation templates for Fabric (1.20.1 - 1.21.4)
 */

import type { TemplateContext, GeneratedFile } from './types';

// ============================================================
// FABRIC - MAIN MOD CLASS
// ============================================================

export function generateFabricModMain(ctx: TemplateContext): GeneratedFile {
  const packagePath = `net.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const mainClass = toPascalCase(ctx.namespace) + 'Mod';

  return {
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/${mainClass}.java`,
    language: 'java',
    description: 'Main mod initializer class for Fabric',
    category: 'main',
    content: `package ${packagePath};

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ${mainClass} implements ModInitializer {
    public static final String MOD_ID = "${ctx.namespace}";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        LOGGER.info("Initializing ${ctx.modName}");

        // Register all content
        ${toPascalCase(ctx.namespace)}Blocks.register();
        ${toPascalCase(ctx.namespace)}Items.register();
        ${toPascalCase(ctx.namespace)}Entities.register();

        LOGGER.info("${ctx.modName} initialized successfully!");
    }
}
`,
  };
}

// ============================================================
// FABRIC - BLOCK REGISTRATION
// ============================================================

export function generateFabricBlock(ctx: TemplateContext & {
  properties: {
    blockName: string;
    displayName: string;
    hardness: number;
    resistance: number;
    luminance: number;
    materialType: string;
    requiresTool: boolean;
    hasGravity: boolean;
    isFlammable: boolean;
    slipperiness: number;
    speedFactor: number;
  };
}): GeneratedFile[] {
  const packagePath = `net.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const className = toPascalCase(ctx.properties.blockName);
  const files: GeneratedFile[] = [];

  // Block class
  const needsCustomClass = ctx.properties.hasGravity || ctx.properties.luminance > 0;

  if (needsCustomClass) {
    files.push({
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/block/${className}.java`,
      language: 'java',
      description: `Custom block class for ${ctx.properties.displayName}`,
      category: 'block',
      content: `package ${packagePath}.block;

import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
${ctx.properties.hasGravity ? 'import net.minecraft.block.FallingBlock;' : ''}
import net.minecraft.block.AbstractBlock;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

public class ${className} extends ${ctx.properties.hasGravity ? 'FallingBlock' : 'Block'} {

    public ${className}(AbstractBlock.Settings settings) {
        super(settings);
    }
${ctx.properties.luminance > 0 ? `
    // Luminance is set via block settings in registration
` : ''}
}
`,
    });
  }

  // Block registration file
  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/block/${toPascalCase(ctx.namespace)}Blocks.java`,
    language: 'java',
    description: 'Block registration class',
    category: 'block',
    content: generateFabricBlockRegistry(ctx, packagePath),
  });

  // Block model JSON
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/block/${ctx.properties.blockName}.json`,
    language: 'json',
    description: `Block model for ${ctx.properties.displayName}`,
    category: 'block',
    content: JSON.stringify({
      parent: 'minecraft:block/cube_all',
      textures: {
        all: `${ctx.namespace}:block/${ctx.properties.blockName}`,
      },
    }, null, 2),
  });

  // Block item model
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/item/${ctx.properties.blockName}.json`,
    language: 'json',
    description: `Block item model for ${ctx.properties.displayName}`,
    category: 'block',
    content: JSON.stringify({
      parent: `${ctx.namespace}:block/${ctx.properties.blockName}`,
    }, null, 2),
  });

  // Blockstate
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/blockstates/${ctx.properties.blockName}.json`,
    language: 'json',
    description: `Blockstate definition for ${ctx.properties.displayName}`,
    category: 'block',
    content: JSON.stringify({
      variants: {
        '': {
          model: `${ctx.namespace}:block/${ctx.properties.blockName}`,
        },
      },
    }, null, 2),
  });

  // Loot table
  files.push({
    path: `src/main/resources/data/${ctx.namespace}/loot_tables/blocks/${ctx.properties.blockName}.json`,
    language: 'json',
    description: `Loot table for ${ctx.properties.displayName}`,
    category: 'block',
    content: JSON.stringify({
      type: 'minecraft:block',
      pools: [
        {
          rolls: 1,
          entries: [
            {
              type: 'minecraft:item',
              name: `${ctx.namespace}:${ctx.properties.blockName}`,
            },
          ],
          conditions: [
            {
              condition: 'minecraft:survives_explosion',
            },
          ],
        },
      ],
    }, null, 2),
  });

  // Language entry
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/lang/en_us.json`,
    language: 'json',
    description: 'Language file entry',
    category: 'resource',
    content: JSON.stringify({
      [`block.${ctx.namespace}.${ctx.properties.blockName}`]: ctx.properties.displayName,
    }, null, 2),
  });

  return files;
}

function generateFabricBlockRegistry(ctx: TemplateContext & { properties: Record<string, unknown> }, packagePath: string): string {
  const modClass = toPascalCase(ctx.namespace);
  const p = ctx.properties as {
    blockName: string;
    hardness: number;
    resistance: number;
    luminance: number;
    requiresTool: boolean;
    hasGravity: boolean;
    slipperiness: number;
    speedFactor: number;
  };

  const blockVarName = p.blockName.toUpperCase();
  const className = toPascalCase(p.blockName);
  const needsCustomClass = p.hasGravity || p.luminance > 0;

  let settings = `AbstractBlock.Settings.create()
            .strength(${p.hardness}f, ${p.resistance}f)`;
  if (p.luminance > 0) settings += `\n            .luminance(state -> ${p.luminance})`;
  if (p.requiresTool) settings += `\n            .requiresTool()`;
  if (p.slipperiness !== 0.6) settings += `\n            .slipperiness(${p.slipperiness}f)`;
  if (p.speedFactor !== 1.0) settings += `\n            .velocityMultiplier(${p.speedFactor}f)`;

  return `package ${packagePath}.block;

import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.block.AbstractBlock;
import net.minecraft.block.Block;
import net.minecraft.item.BlockItem;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroups;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Blocks {

    public static final Block ${blockVarName} = registerBlock("${p.blockName}",
        new ${needsCustomClass ? className : 'Block'}(${settings}));

    private static Block registerBlock(String name, Block block) {
        registerBlockItem(name, block);
        return Registry.register(Registries.BLOCK, Identifier.of(${modClass}Mod.MOD_ID, name), block);
    }

    private static void registerBlockItem(String name, Block block) {
        Registry.register(Registries.ITEM, Identifier.of(${modClass}Mod.MOD_ID, name),
            new BlockItem(block, new Item.Settings()));
    }

    public static void register() {
        ${modClass}Mod.LOGGER.info("Registering blocks for " + ${modClass}Mod.MOD_ID);

        ItemGroupEvents.modifyEntriesEvent(ItemGroups.BUILDING_BLOCKS).register(entries -> {
            entries.add(${blockVarName});
        });
    }
}
`;
}

// ============================================================
// FABRIC - ITEM REGISTRATION
// ============================================================

export function generateFabricItem(ctx: TemplateContext & {
  properties: {
    itemName: string;
    displayName: string;
    maxStackSize: number;
    rarity: string;
    isWeapon: boolean;
    isArmor: boolean;
    isTool: boolean;
    isConsumable: boolean;
    durability?: number;
    attackDamage?: number;
    attackSpeed?: number;
    foodNutrition?: number;
    foodSaturation?: number;
  };
}): GeneratedFile[] {
  const packagePath = `net.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const modClass = toPascalCase(ctx.namespace);
  const p = ctx.properties;
  const files: GeneratedFile[] = [];

  // Determine item type
  let itemType: 'sword' | 'pickaxe' | 'armor' | 'food' | 'basic' = 'basic';
  if (p.isWeapon) itemType = 'sword';
  else if (p.isTool) itemType = 'pickaxe';
  else if (p.isArmor) itemType = 'armor';
  else if (p.isConsumable) itemType = 'food';

  // Custom item class for weapons/tools
  if (itemType === 'sword' || itemType === 'pickaxe') {
    const className = toPascalCase(p.itemName);
    files.push({
      path: `src/main/java/${packagePath.replace(/\./g, '/')}/item/${className}.java`,
      language: 'java',
      description: `Custom item class for ${p.displayName}`,
      category: 'item',
      content: generateFabricWeaponToolClass(ctx, packagePath, itemType),
    });
  }

  // Item registration class
  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/item/${modClass}Items.java`,
    language: 'java',
    description: 'Item registration class',
    category: 'item',
    content: generateFabricItemRegistry(ctx, packagePath, itemType),
  });

  // Item model
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/item/${p.itemName}.json`,
    language: 'json',
    description: `Item model for ${p.displayName}`,
    category: 'item',
    content: JSON.stringify({
      parent: itemType === 'sword' ? 'minecraft:item/handheld' :
              itemType === 'pickaxe' ? 'minecraft:item/handheld' :
              'minecraft:item/generated',
      textures: {
        layer0: `${ctx.namespace}:item/${p.itemName}`,
      },
    }, null, 2),
  });

  // Language entry
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/lang/en_us.json`,
    language: 'json',
    description: 'Language file entry',
    category: 'resource',
    content: JSON.stringify({
      [`item.${ctx.namespace}.${p.itemName}`]: p.displayName,
    }, null, 2),
  });

  return files;
}

function generateFabricWeaponToolClass(ctx: TemplateContext & { properties: Record<string, unknown> }, packagePath: string, itemType: 'sword' | 'pickaxe'): string {
  const p = ctx.properties as { itemName: string; attackDamage?: number; attackSpeed?: number; durability?: number };
  const className = toPascalCase(p.itemName);

  if (itemType === 'sword') {
    return `package ${packagePath}.item;

import net.minecraft.item.SwordItem;
import net.minecraft.item.ToolMaterial;

public class ${className} extends SwordItem {

    public ${className}(ToolMaterial material, Settings settings) {
        super(material, settings);
    }
}
`;
  }

  return `package ${packagePath}.item;

import net.minecraft.item.PickaxeItem;
import net.minecraft.item.ToolMaterial;

public class ${className} extends PickaxeItem {

    public ${className}(ToolMaterial material, Settings settings) {
        super(material, settings);
    }
}
`;
}

function generateFabricItemRegistry(ctx: TemplateContext & { properties: Record<string, unknown> }, packagePath: string, itemType: string): string {
  const modClass = toPascalCase(ctx.namespace);
  const p = ctx.properties as {
    itemName: string;
    maxStackSize: number;
    rarity: string;
    durability?: number;
    attackDamage?: number;
    attackSpeed?: number;
    foodNutrition?: number;
    foodSaturation?: number;
  };
  const varName = p.itemName.toUpperCase();

  let settingsStr = 'new Item.Settings()';
  if (p.maxStackSize !== 64) settingsStr += `\n            .maxCount(${p.maxStackSize})`;
  if (p.rarity !== 'common') settingsStr += `\n            .rarity(Rarity.${p.rarity.toUpperCase()})`;
  if (p.durability) settingsStr += `\n            .maxDamage(${p.durability})`;
  if (p.foodNutrition) {
    settingsStr += `\n            .food(new FoodComponent.Builder()
                .nutrition(${p.foodNutrition})
                .saturationModifier(${p.foodSaturation || 0}f)
                .build())`;
  }

  const itemConstructor = itemType === 'sword'
    ? `new ${toPascalCase(p.itemName)}(${modClass}ToolMaterials.RUBY, ${settingsStr}
            .attributeModifiers(SwordItem.createAttributeModifiers(
                ${modClass}ToolMaterials.RUBY, ${p.attackDamage || 3}, ${p.attackSpeed || -2.4}f)))`
    : itemType === 'pickaxe'
    ? `new ${toPascalCase(p.itemName)}(${modClass}ToolMaterials.RUBY, ${settingsStr}
            .attributeModifiers(PickaxeItem.createAttributeModifiers(
                ${modClass}ToolMaterials.RUBY, ${p.attackDamage || 1}, ${p.attackSpeed || -2.8}f)))`
    : `new Item(${settingsStr})`;

  const extraImports = itemType === 'sword' ? `
import net.minecraft.item.SwordItem;
import ${packagePath}.item.${toPascalCase(p.itemName)};` :
    itemType === 'pickaxe' ? `
import net.minecraft.item.PickaxeItem;
import ${packagePath}.item.${toPascalCase(p.itemName)};` : '';

  const foodImport = p.foodNutrition ? '\nimport net.minecraft.component.type.FoodComponent;' : '';

  return `package ${packagePath}.item;

import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemGroups;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;
import net.minecraft.util.Rarity;${extraImports}${foodImport}
import ${packagePath}.${modClass}Mod;

public class ${modClass}Items {

    public static final Item ${varName} = registerItem("${p.itemName}",
        ${itemConstructor});

    private static Item registerItem(String name, Item item) {
        return Registry.register(Registries.ITEM, Identifier.of(${modClass}Mod.MOD_ID, name), item);
    }

    public static void register() {
        ${modClass}Mod.LOGGER.info("Registering items for " + ${modClass}Mod.MOD_ID);

        ItemGroupEvents.modifyEntriesEvent(ItemGroups.INGREDIENTS).register(entries -> {
            entries.add(${varName});
        });
    }
}
`;
}

// ============================================================
// FABRIC - ENTITY REGISTRATION
// ============================================================

export function generateFabricEntity(ctx: TemplateContext & {
  properties: {
    entityName: string;
    displayName: string;
    entityType: 'hostile' | 'passive' | 'neutral' | 'boss';
    maxHealth: number;
    attackDamage?: number;
    attackSpeed: number;
    movementSpeed: number;
    armorValue: number;
    followRange: number;
    spawnType: string;
  };
}): GeneratedFile[] {
  const packagePath = `net.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const modClass = toPascalCase(ctx.namespace);
  const p = ctx.properties;
  const className = toPascalCase(p.entityName);
  const files: GeneratedFile[] = [];

  // Entity class
  const parentClass = p.entityType === 'hostile' ? 'HostileEntity' :
                      p.entityType === 'passive' ? 'PassiveEntity' :
                      p.entityType === 'boss' ? 'HostileEntity' : 'AnimalEntity';

  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${className}Entity.java`,
    language: 'java',
    description: `Entity class for ${p.displayName}`,
    category: 'entity',
    content: `package ${packagePath}.entity;

import net.minecraft.entity.EntityType;
import net.minecraft.entity.attribute.DefaultAttributeContainer;
import net.minecraft.entity.attribute.EntityAttributes;
import net.minecraft.entity.mob.${parentClass};
${p.entityType === 'passive' ? 'import net.minecraft.entity.passive.PassiveEntity;\nimport net.minecraft.server.world.ServerWorld;\nimport org.jetbrains.annotations.Nullable;' : ''}
import net.minecraft.world.World;

public class ${className}Entity extends ${parentClass} {

    public ${className}Entity(EntityType<? extends ${parentClass}> entityType, World world) {
        super(entityType, world);
    }

    public static DefaultAttributeContainer.Builder createAttributes() {
        return ${parentClass}.createMobAttributes()
            .add(EntityAttributes.GENERIC_MAX_HEALTH, ${p.maxHealth})
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED, ${p.movementSpeed})
            .add(EntityAttributes.GENERIC_ARMOR, ${p.armorValue})
            .add(EntityAttributes.GENERIC_FOLLOW_RANGE, ${p.followRange})${p.attackDamage ? `
            .add(EntityAttributes.GENERIC_ATTACK_DAMAGE, ${p.attackDamage})
            .add(EntityAttributes.GENERIC_ATTACK_SPEED, ${p.attackSpeed})` : ''};
    }
${p.entityType === 'passive' ? `
    @Nullable
    @Override
    public PassiveEntity createChild(ServerWorld world, PassiveEntity entity) {
        return null; // TODO: Implement breeding
    }
` : ''}
}
`,
  });

  // Entity registration
  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${modClass}Entities.java`,
    language: 'java',
    description: 'Entity registration class',
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

    public static final EntityType<${className}Entity> ${p.entityName.toUpperCase()} =
        Registry.register(
            Registries.ENTITY_TYPE,
            Identifier.of(${modClass}Mod.MOD_ID, "${p.entityName}"),
            EntityType.Builder.create(${className}Entity::new, SpawnGroup.${p.entityType === 'hostile' || p.entityType === 'boss' ? 'MONSTER' : 'CREATURE'})
                .dimensions(0.6f, 1.8f)
                .build()
        );

    public static void register() {
        ${modClass}Mod.LOGGER.info("Registering entities for " + ${modClass}Mod.MOD_ID);
        FabricDefaultAttributeRegistry.register(${p.entityName.toUpperCase()}, ${className}Entity.createAttributes());
    }
}
`,
  });

  // Entity renderer (client-side)
  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/client/entity/${className}Renderer.java`,
    language: 'java',
    description: `Entity renderer for ${p.displayName}`,
    category: 'entity',
    content: `package ${packagePath}.client.entity;

import net.minecraft.client.render.entity.EntityRendererFactory;
import net.minecraft.client.render.entity.MobEntityRenderer;
import net.minecraft.util.Identifier;
import ${packagePath}.entity.${className}Entity;
import ${packagePath}.${modClass}Mod;

public class ${className}Renderer extends MobEntityRenderer<${className}Entity, ${className}Model> {

    private static final Identifier TEXTURE = Identifier.of(${modClass}Mod.MOD_ID, "textures/entity/${p.entityName}.png");

    public ${className}Renderer(EntityRendererFactory.Context context) {
        super(context, new ${className}Model(context.getPart(${className}Model.LAYER)), 0.5f);
    }

    @Override
    public Identifier getTexture(${className}Entity entity) {
        return TEXTURE;
    }
}
`,
  });

  return files;
}

// ============================================================
// FABRIC - RECIPE JSON GENERATION
// ============================================================

export function generateFabricRecipe(ctx: TemplateContext & {
  properties: {
    recipeName: string;
    recipeType: 'shaped' | 'shapeless' | 'smelting' | 'blasting' | 'smoking' | 'campfire' | 'stonecutting';
    outputItem: string;
    outputCount: number;
    ingredients: { slot: number; item: string }[];
    cookTime?: number;
    experience?: number;
  };
}): GeneratedFile[] {
  const p = ctx.properties;
  const files: GeneratedFile[] = [];

  let recipeJson: Record<string, unknown>;

  if (p.recipeType === 'shaped') {
    // Build pattern from ingredients
    const pattern = buildShapedPattern(p.ingredients);
    const key: Record<string, { item: string }> = {};
    const usedChars = new Set<string>();
    let charIndex = 0;
    const chars = 'ABCDEFGHI';

    for (const ing of p.ingredients) {
      if (!usedChars.has(ing.item)) {
        key[chars[charIndex]] = { item: ing.item };
        usedChars.add(ing.item);
        charIndex++;
      }
    }

    recipeJson = {
      type: 'minecraft:crafting_shaped',
      pattern: pattern.pattern,
      key: pattern.key,
      result: {
        item: p.outputItem,
        count: p.outputCount,
      },
    };
  } else if (p.recipeType === 'shapeless') {
    recipeJson = {
      type: 'minecraft:crafting_shapeless',
      ingredients: p.ingredients.map(i => ({ item: i.item })),
      result: {
        item: p.outputItem,
        count: p.outputCount,
      },
    };
  } else {
    // Smelting/blasting/smoking/campfire
    const typeMap: Record<string, string> = {
      smelting: 'minecraft:smelting',
      blasting: 'minecraft:blasting',
      smoking: 'minecraft:smoking',
      campfire: 'minecraft:campfire_cooking',
    };
    recipeJson = {
      type: typeMap[p.recipeType] || 'minecraft:smelting',
      ingredient: { item: p.ingredients[0]?.item || 'minecraft:stone' },
      result: p.outputItem,
      experience: p.experience || 0.1,
      cookingtime: p.cookTime || 200,
    };
  }

  files.push({
    path: `src/main/resources/data/${ctx.namespace}/recipes/${p.recipeName}.json`,
    language: 'json',
    description: `Recipe: ${p.recipeName}`,
    category: 'recipe',
    content: JSON.stringify(recipeJson, null, 2),
  });

  return files;
}

// ============================================================
// FABRIC - CONFIG FILES
// ============================================================

export function generateFabricConfig(ctx: TemplateContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // fabric.mod.json
  files.push({
    path: 'src/main/resources/fabric.mod.json',
    language: 'json',
    description: 'Fabric mod metadata file',
    category: 'config',
    content: JSON.stringify({
      schemaVersion: 1,
      id: ctx.namespace,
      version: ctx.modVersion,
      name: ctx.modName,
      description: `A Minecraft mod by ${ctx.author}`,
      authors: [ctx.author],
      contact: {},
      license: 'MIT',
      icon: `assets/${ctx.namespace}/icon.png`,
      environment: '*',
      entrypoints: {
        main: [`net.${ctx.author.toLowerCase()}.${ctx.namespace}.${toPascalCase(ctx.namespace)}Mod`],
        client: [`net.${ctx.author.toLowerCase()}.${ctx.namespace}.client.${toPascalCase(ctx.namespace)}Client`],
      },
      mixins: [`${ctx.namespace}.mixins.json`],
      depends: {
        fabricloader: '>=0.15.0',
        'fabric-api': '*',
        minecraft: `~${ctx.minecraftVersion}`,
        java: '>=17',
      },
    }, null, 2),
  });

  // build.gradle
  files.push({
    path: 'build.gradle',
    language: 'gradle',
    description: 'Gradle build configuration',
    category: 'config',
    content: `plugins {
    id 'fabric-loom' version '1.6-SNAPSHOT'
    id 'maven-publish'
}

version = project.mod_version
group = project.maven_group

base {
    archivesName = project.archives_base_name
}

repositories {
    mavenCentral()
}

dependencies {
    minecraft "com.mojang:minecraft:\${project.minecraft_version}"
    mappings "net.fabricmc:yarn:\${project.yarn_mappings}:v2"
    modImplementation "net.fabricmc:fabric-loader:\${project.loader_version}"
    modImplementation "net.fabricmc.fabric-api:fabric-api:\${project.fabric_version}"
}

processResources {
    inputs.property "version", project.version
    filesMatching("fabric.mod.json") {
        expand "version": project.version
    }
}

tasks.withType(JavaCompile).configureEach {
    it.options.release = 17
}

java {
    withSourcesJar()
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}
`,
  });

  // gradle.properties
  files.push({
    path: 'gradle.properties',
    language: 'properties',
    description: 'Gradle properties with version configuration',
    category: 'config',
    content: `# Project
mod_version=${ctx.modVersion}
maven_group=net.${ctx.author.toLowerCase()}.${ctx.namespace}
archives_base_name=${ctx.namespace}

# Fabric
minecraft_version=${ctx.minecraftVersion}
yarn_mappings=${ctx.minecraftVersion}+build.1
loader_version=0.15.11
fabric_version=0.97.0+${ctx.minecraftVersion}

# Dependencies
`,
  });

  return files;
}

// ============================================================
// HELPERS
// ============================================================

function toPascalCase(str: string): string {
  return str.replace(/(^|_)([a-z])/g, (_, _pre, char) => char.toUpperCase());
}

function buildShapedPattern(ingredients: { slot: number; item: string }[]): { pattern: string[]; key: Record<string, { item: string }> } {
  const grid: (string | null)[] = Array(9).fill(null);
  const itemToChar: Map<string, string> = new Map();
  const chars = 'ABCDEFGHI';
  let charIdx = 0;

  for (const ing of ingredients) {
    if (ing.slot >= 0 && ing.slot < 9) {
      if (!itemToChar.has(ing.item)) {
        itemToChar.set(ing.item, chars[charIdx++]);
      }
      grid[ing.slot] = itemToChar.get(ing.item)!;
    }
  }

  const pattern = [
    (grid[0] || ' ') + (grid[1] || ' ') + (grid[2] || ' '),
    (grid[3] || ' ') + (grid[4] || ' ') + (grid[5] || ' '),
    (grid[6] || ' ') + (grid[7] || ' ') + (grid[8] || ' '),
  ];

  const key: Record<string, { item: string }> = {};
  for (const [item, char] of itemToChar.entries()) {
    key[char] = { item };
  }

  return { pattern, key };
}

export { toPascalCase };
