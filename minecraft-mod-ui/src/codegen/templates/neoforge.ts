/**
 * NeoForge Mod Loader Templates
 * Code generation templates for NeoForge (1.20.4+)
 * NeoForge is the successor to Forge with modernized APIs
 */

import type { TemplateContext, GeneratedFile } from './types';

// ============================================================
// NEOFORGE - MAIN MOD CLASS
// ============================================================

export function generateNeoForgeModMain(ctx: TemplateContext): GeneratedFile {
  const packagePath = `com.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const mainClass = toPascalCase(ctx.namespace) + 'Mod';

  return {
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/${mainClass}.java`,
    language: 'java',
    description: 'Main mod class for NeoForge',
    category: 'main',
    content: `package ${packagePath};

import com.mojang.logging.LogUtils;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.event.lifecycle.FMLCommonSetupEvent;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import org.slf4j.Logger;

@Mod(${mainClass}.MOD_ID)
public class ${mainClass} {
    public static final String MOD_ID = "${ctx.namespace}";
    public static final Logger LOGGER = LogUtils.getLogger();

    public ${mainClass}(IEventBus modEventBus) {
        // Register deferred registries
        ${toPascalCase(ctx.namespace)}Blocks.BLOCKS.register(modEventBus);
        ${toPascalCase(ctx.namespace)}Items.ITEMS.register(modEventBus);
        ${toPascalCase(ctx.namespace)}Entities.ENTITY_TYPES.register(modEventBus);

        modEventBus.addListener(this::commonSetup);
        modEventBus.addListener(this::addCreative);

        NeoForge.EVENT_BUS.register(this);
    }

    private void commonSetup(final FMLCommonSetupEvent event) {
        LOGGER.info("${ctx.modName} common setup");
    }

    private void addCreative(BuildCreativeModeTabContentsEvent event) {
        ${toPascalCase(ctx.namespace)}Blocks.addToCreativeTab(event);
        ${toPascalCase(ctx.namespace)}Items.addToCreativeTab(event);
    }
}
`,
  };
}

// ============================================================
// NEOFORGE - BLOCK REGISTRATION (DeferredRegister)
// ============================================================

export function generateNeoForgeBlock(ctx: TemplateContext & {
  properties: {
    blockName: string;
    displayName: string;
    hardness: number;
    resistance: number;
    luminance: number;
    materialType: string;
    requiresTool: boolean;
    hasGravity: boolean;
    slipperiness: number;
    speedFactor: number;
  };
}): GeneratedFile[] {
  const packagePath = `com.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const modClass = toPascalCase(ctx.namespace);
  const p = ctx.properties;
  const varName = p.blockName.toUpperCase();
  const files: GeneratedFile[] = [];

  let blockProperties = `BlockBehaviour.Properties.of()
            .strength(${p.hardness}f, ${p.resistance}f)`;
  if (p.luminance > 0) blockProperties += `\n            .lightLevel(state -> ${p.luminance})`;
  if (p.requiresTool) blockProperties += `\n            .requiresCorrectToolForDrops()`;

  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/block/${modClass}Blocks.java`,
    language: 'java',
    description: 'Block registration using NeoForge DeferredRegister',
    category: 'block',
    content: `package ${packagePath}.block;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
${p.hasGravity ? 'import net.minecraft.world.level.block.FallingBlock;\n' : ''}import net.minecraft.world.level.block.state.BlockBehaviour;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Blocks {
    public static final DeferredRegister.Blocks BLOCKS =
        DeferredRegister.createBlocks(${modClass}Mod.MOD_ID);
    public static final DeferredRegister.Items BLOCK_ITEMS =
        DeferredRegister.createItems(${modClass}Mod.MOD_ID);

    public static final DeferredBlock<Block> ${varName} = BLOCKS.register("${p.blockName}",
        () -> new ${p.hasGravity ? 'FallingBlock' : 'Block'}(${blockProperties}));

    public static final DeferredItem<BlockItem> ${varName}_ITEM = BLOCK_ITEMS.register("${p.blockName}",
        () -> new BlockItem(${varName}.get(), new Item.Properties()));

    public static void addToCreativeTab(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.BUILDING_BLOCKS) {
            event.accept(${varName});
        }
    }
}
`,
  });

  // Block model JSON (same as Forge)
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/block/${p.blockName}.json`,
    language: 'json',
    description: `Block model for ${p.displayName}`,
    category: 'block',
    content: JSON.stringify({
      parent: 'minecraft:block/cube_all',
      textures: { all: `${ctx.namespace}:block/${p.blockName}` },
    }, null, 2),
  });

  // Blockstate
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/blockstates/${p.blockName}.json`,
    language: 'json',
    description: `Blockstate for ${p.displayName}`,
    category: 'block',
    content: JSON.stringify({
      variants: { '': { model: `${ctx.namespace}:block/${p.blockName}` } },
    }, null, 2),
  });

  // Item model
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/item/${p.blockName}.json`,
    language: 'json',
    description: `Block item model for ${p.displayName}`,
    category: 'block',
    content: JSON.stringify({ parent: `${ctx.namespace}:block/${p.blockName}` }, null, 2),
  });

  return files;
}

// ============================================================
// NEOFORGE - ITEM REGISTRATION
// ============================================================

export function generateNeoForgeItem(ctx: TemplateContext & {
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
  const packagePath = `com.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const modClass = toPascalCase(ctx.namespace);
  const p = ctx.properties;
  const varName = p.itemName.toUpperCase();
  const files: GeneratedFile[] = [];

  let itemProperties = 'new Item.Properties()';
  if (p.maxStackSize !== 64) itemProperties += `.stacksTo(${p.maxStackSize})`;
  if (p.rarity !== 'common') itemProperties += `.rarity(net.minecraft.world.item.Rarity.${p.rarity.toUpperCase()})`;
  if (p.durability) itemProperties += `.durability(${p.durability})`;

  const itemConstructor = p.isWeapon
    ? `new SwordItem(${modClass}Tiers.RUBY, ${itemProperties}
            .attributes(SwordItem.createAttributes(${modClass}Tiers.RUBY, ${p.attackDamage || 3}, ${p.attackSpeed || -2.4}f)))`
    : p.isTool
    ? `new PickaxeItem(${modClass}Tiers.RUBY, ${itemProperties}
            .attributes(PickaxeItem.createAttributes(${modClass}Tiers.RUBY, ${p.attackDamage || 1}, ${p.attackSpeed || -2.8}f)))`
    : `new Item(${itemProperties})`;

  const extraImports = p.isWeapon ? '\nimport net.minecraft.world.item.SwordItem;' :
                       p.isTool ? '\nimport net.minecraft.world.item.PickaxeItem;' : '';

  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/item/${modClass}Items.java`,
    language: 'java',
    description: 'Item registration using NeoForge DeferredRegister',
    category: 'item',
    content: `package ${packagePath}.item;

import net.minecraft.world.item.Item;${extraImports}
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Items {
    public static final DeferredRegister.Items ITEMS =
        DeferredRegister.createItems(${modClass}Mod.MOD_ID);

    public static final DeferredItem<Item> ${varName} = ITEMS.register("${p.itemName}",
        () -> ${itemConstructor});

    public static void addToCreativeTab(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.INGREDIENTS) {
            event.accept(${varName});
        }
    }
}
`,
  });

  // Item model
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/item/${p.itemName}.json`,
    language: 'json',
    description: `Item model for ${p.displayName}`,
    category: 'item',
    content: JSON.stringify({
      parent: p.isWeapon || p.isTool ? 'minecraft:item/handheld' : 'minecraft:item/generated',
      textures: { layer0: `${ctx.namespace}:item/${p.itemName}` },
    }, null, 2),
  });

  return files;
}

// ============================================================
// NEOFORGE - ENTITY REGISTRATION
// ============================================================

export function generateNeoForgeEntity(ctx: TemplateContext & {
  properties: {
    entityName: string;
    displayName: string;
    entityType: 'hostile' | 'passive' | 'neutral' | 'boss';
    maxHealth: number;
    attackDamage?: number;
    movementSpeed: number;
    armorValue: number;
    followRange: number;
  };
}): GeneratedFile[] {
  const packagePath = `com.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const modClass = toPascalCase(ctx.namespace);
  const p = ctx.properties;
  const className = toPascalCase(p.entityName);
  const files: GeneratedFile[] = [];

  const parentClass = p.entityType === 'hostile' || p.entityType === 'boss' ? 'Monster' : 'Animal';

  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${className}Entity.java`,
    language: 'java',
    description: `Entity class for ${p.displayName}`,
    category: 'entity',
    content: `package ${packagePath}.entity;

import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.monster.${parentClass};
import net.minecraft.world.level.Level;

public class ${className}Entity extends ${parentClass} {

    public ${className}Entity(EntityType<? extends ${parentClass}> type, Level level) {
        super(type, level);
    }

    public static AttributeSupplier.Builder createAttributes() {
        return ${parentClass}.createMobAttributes()
            .add(Attributes.MAX_HEALTH, ${p.maxHealth})
            .add(Attributes.MOVEMENT_SPEED, ${p.movementSpeed})
            .add(Attributes.ARMOR, ${p.armorValue})
            .add(Attributes.FOLLOW_RANGE, ${p.followRange})${p.attackDamage ? `
            .add(Attributes.ATTACK_DAMAGE, ${p.attackDamage})` : ''};
    }
}
`,
  });

  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${modClass}Entities.java`,
    language: 'java',
    description: 'Entity registration using NeoForge DeferredRegister',
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

    public static final Supplier<EntityType<${className}Entity>> ${p.entityName.toUpperCase()} =
        ENTITY_TYPES.register("${p.entityName}",
            () -> EntityType.Builder.of(${className}Entity::new, MobCategory.${p.entityType === 'hostile' || p.entityType === 'boss' ? 'MONSTER' : 'CREATURE'})
                .sized(0.6f, 1.8f)
                .build("${p.entityName}"));

    @EventBusSubscriber(modid = ${modClass}Mod.MOD_ID, bus = EventBusSubscriber.Bus.MOD)
    public static class ModEvents {
        @SubscribeEvent
        public static void registerAttributes(EntityAttributeCreationEvent event) {
            event.put(${p.entityName.toUpperCase()}.get(), ${className}Entity.createAttributes().build());
        }
    }
}
`,
  });

  return files;
}

// ============================================================
// NEOFORGE - CONFIG FILES
// ============================================================

export function generateNeoForgeConfig(ctx: TemplateContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // neoforge.mods.toml
  files.push({
    path: 'src/main/resources/META-INF/neoforge.mods.toml',
    language: 'toml',
    description: 'NeoForge mod descriptor',
    category: 'config',
    content: `modLoader="javafml"
loaderVersion="[4,)"
license="MIT"
issueTrackerURL=""

[[mods]]
modId="${ctx.namespace}"
version="${ctx.modVersion}"
displayName="${ctx.modName}"
authors="${ctx.author}"
description='''
A custom Minecraft mod built with NeoForge.
'''

[[dependencies.${ctx.namespace}]]
modId="neoforge"
type="required"
versionRange="[21.0,)"
ordering="NONE"
side="BOTH"

[[dependencies.${ctx.namespace}]]
modId="minecraft"
type="required"
versionRange="[${ctx.minecraftVersion},)"
ordering="NONE"
side="BOTH"
`,
  });

  // build.gradle
  files.push({
    path: 'build.gradle',
    language: 'gradle',
    description: 'NeoForge Gradle build configuration',
    category: 'config',
    content: `plugins {
    id 'java-library'
    id 'eclipse'
    id 'idea'
    id 'maven-publish'
    id 'net.neoforged.moddev' version '1.0.14'
}

version = '${ctx.modVersion}'
group = 'com.${ctx.author.toLowerCase()}.${ctx.namespace}'

java.toolchain.languageVersion = JavaLanguageVersion.of(21)

neoForge {
    version = "21.0.0-beta"

    runs {
        client {
            client()
        }
        server {
            server()
        }
    }

    mods {
        "${ctx.namespace}" {
            sourceSet sourceSets.main
        }
    }
}

dependencies {
    // Add mod dependencies here
}
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

export { toPascalCase as neoforgeToPascalCase };
