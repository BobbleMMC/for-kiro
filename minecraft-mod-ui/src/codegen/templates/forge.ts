/**
 * Forge Mod Loader Templates
 * Code generation templates for Minecraft Forge (1.20.1 - 1.21.4)
 */

import type { TemplateContext, GeneratedFile } from './types';

// ============================================================
// FORGE - MAIN MOD CLASS
// ============================================================

export function generateForgeModMain(ctx: TemplateContext): GeneratedFile {
  const packagePath = `com.${ctx.author.toLowerCase()}.${ctx.namespace}`;
  const mainClass = toPascalCase(ctx.namespace) + 'Mod';

  return {
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/${mainClass}.java`,
    language: 'java',
    description: 'Main mod class for Forge',
    category: 'main',
    content: `package ${packagePath};

import com.mojang.logging.LogUtils;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.slf4j.Logger;

@Mod(${mainClass}.MOD_ID)
public class ${mainClass} {
    public static final String MOD_ID = "${ctx.namespace}";
    public static final Logger LOGGER = LogUtils.getLogger();

    public ${mainClass}() {
        IEventBus modEventBus = FMLJavaModLoadingContext.get().getModEventBus();

        // Register deferred registries
        ${toPascalCase(ctx.namespace)}Blocks.BLOCKS.register(modEventBus);
        ${toPascalCase(ctx.namespace)}Items.ITEMS.register(modEventBus);
        ${toPascalCase(ctx.namespace)}Entities.ENTITY_TYPES.register(modEventBus);

        modEventBus.addListener(this::commonSetup);
        modEventBus.addListener(this::addCreative);

        MinecraftForge.EVENT_BUS.register(this);
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
// FORGE - BLOCK REGISTRATION (DeferredRegister)
// ============================================================

export function generateForgeBlock(ctx: TemplateContext & {
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
  if (p.hasGravity) blockProperties += `\n            // Note: Use FallingBlock class for gravity`;

  // Block registration class
  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/block/${modClass}Blocks.java`,
    language: 'java',
    description: 'Block registration using DeferredRegister',
    category: 'block',
    content: `package ${packagePath}.block;

import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
${p.hasGravity ? 'import net.minecraft.world.level.block.FallingBlock;\n' : ''}import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import ${packagePath}.${modClass}Mod;
import ${packagePath}.item.${modClass}Items;

public class ${modClass}Blocks {
    public static final DeferredRegister<Block> BLOCKS =
        DeferredRegister.create(ForgeRegistries.BLOCKS, ${modClass}Mod.MOD_ID);

    public static final RegistryObject<Block> ${varName} = BLOCKS.register("${p.blockName}",
        () -> new ${p.hasGravity ? 'FallingBlock' : 'Block'}(${blockProperties}));

    // Block items
    public static final RegistryObject<Item> ${varName}_ITEM =
        ${modClass}Items.ITEMS.register("${p.blockName}",
            () -> new BlockItem(${varName}.get(), new Item.Properties()));

    public static void addToCreativeTab(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == net.minecraft.world.item.CreativeModeTabs.BUILDING_BLOCKS) {
            event.accept(${varName});
        }
    }
}
`,
  });

  // Block model JSON
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/block/${p.blockName}.json`,
    language: 'json',
    description: `Block model for ${p.displayName}`,
    category: 'block',
    content: JSON.stringify({
      parent: 'minecraft:block/cube_all',
      textures: {
        all: `${ctx.namespace}:block/${p.blockName}`,
      },
    }, null, 2),
  });

  // Blockstate
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/blockstates/${p.blockName}.json`,
    language: 'json',
    description: `Blockstate for ${p.displayName}`,
    category: 'block',
    content: JSON.stringify({
      variants: {
        '': { model: `${ctx.namespace}:block/${p.blockName}` },
      },
    }, null, 2),
  });

  // Item model
  files.push({
    path: `src/main/resources/assets/${ctx.namespace}/models/item/${p.blockName}.json`,
    language: 'json',
    description: `Block item model for ${p.displayName}`,
    category: 'block',
    content: JSON.stringify({
      parent: `${ctx.namespace}:block/${p.blockName}`,
    }, null, 2),
  });

  // Loot table
  files.push({
    path: `src/main/resources/data/${ctx.namespace}/loot_tables/blocks/${p.blockName}.json`,
    language: 'json',
    description: `Loot table for ${p.displayName}`,
    category: 'block',
    content: JSON.stringify({
      type: 'minecraft:block',
      pools: [{
        rolls: 1,
        entries: [{ type: 'minecraft:item', name: `${ctx.namespace}:${p.blockName}` }],
        conditions: [{ condition: 'minecraft:survives_explosion' }],
      }],
    }, null, 2),
  });

  return files;
}

// ============================================================
// FORGE - ITEM REGISTRATION (DeferredRegister)
// ============================================================

export function generateForgeItem(ctx: TemplateContext & {
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
  if (p.foodNutrition) {
    itemProperties += `.food(new net.minecraft.world.food.FoodProperties.Builder()
                .nutrition(${p.foodNutrition})
                .saturationMod(${p.foodSaturation || 0}f)
                .build())`;
  }

  const itemConstructor = p.isWeapon
    ? `new SwordItem(${modClass}Tiers.RUBY, ${p.attackDamage || 3}, ${p.attackSpeed || -2.4}f, ${itemProperties})`
    : p.isTool
    ? `new PickaxeItem(${modClass}Tiers.RUBY, ${p.attackDamage || 1}, ${p.attackSpeed || -2.8}f, ${itemProperties})`
    : `new Item(${itemProperties})`;

  const extraImports = p.isWeapon ? '\nimport net.minecraft.world.item.SwordItem;' :
                       p.isTool ? '\nimport net.minecraft.world.item.PickaxeItem;' : '';

  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/item/${modClass}Items.java`,
    language: 'java',
    description: 'Item registration using DeferredRegister',
    category: 'item',
    content: `package ${packagePath}.item;

import net.minecraft.world.item.Item;${extraImports}
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;
import ${packagePath}.${modClass}Mod;

public class ${modClass}Items {
    public static final DeferredRegister<Item> ITEMS =
        DeferredRegister.create(ForgeRegistries.ITEMS, ${modClass}Mod.MOD_ID);

    public static final RegistryObject<Item> ${varName} = ITEMS.register("${p.itemName}",
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
// FORGE - ENTITY REGISTRATION
// ============================================================

export function generateForgeEntity(ctx: TemplateContext & {
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

  // Entity registration
  files.push({
    path: `src/main/java/${packagePath.replace(/\./g, '/')}/entity/${modClass}Entities.java`,
    language: 'java',
    description: 'Entity registration using DeferredRegister',
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

    public static final RegistryObject<EntityType<${className}Entity>> ${p.entityName.toUpperCase()} =
        ENTITY_TYPES.register("${p.entityName}",
            () -> EntityType.Builder.of(${className}Entity::new, MobCategory.${p.entityType === 'hostile' || p.entityType === 'boss' ? 'MONSTER' : 'CREATURE'})
                .sized(0.6f, 1.8f)
                .build("${p.entityName}"));

    @Mod.EventBusSubscriber(modid = ${modClass}Mod.MOD_ID, bus = Mod.EventBusSubscriber.Bus.MOD)
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
// FORGE - CONFIG FILES
// ============================================================

export function generateForgeConfig(ctx: TemplateContext): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // mods.toml
  files.push({
    path: 'src/main/resources/META-INF/mods.toml',
    language: 'toml',
    description: 'Forge mod descriptor',
    category: 'config',
    content: `modLoader="javafml"
loaderVersion="[47,)"
license="MIT"

[[mods]]
modId="${ctx.namespace}"
version="${ctx.modVersion}"
displayName="${ctx.modName}"
authors="${ctx.author}"
description='''
A custom Minecraft mod.
'''

[[dependencies.${ctx.namespace}]]
modId="forge"
mandatory=true
versionRange="[47,)"
ordering="NONE"
side="BOTH"

[[dependencies.${ctx.namespace}]]
modId="minecraft"
mandatory=true
versionRange="[${ctx.minecraftVersion}]"
ordering="NONE"
side="BOTH"
`,
  });

  // build.gradle
  files.push({
    path: 'build.gradle',
    language: 'gradle',
    description: 'Forge Gradle build configuration',
    category: 'config',
    content: `plugins {
    id 'eclipse'
    id 'idea'
    id 'maven-publish'
    id 'net.minecraftforge.gradle' version '[6.0.16,6.2)'
}

version = '${ctx.modVersion}'
group = 'com.${ctx.author.toLowerCase()}.${ctx.namespace}'

java.toolchain.languageVersion = JavaLanguageVersion.of(17)

minecraft {
    mappings channel: 'official', version: '${ctx.minecraftVersion}'

    runs {
        client {
            workingDirectory project.file('run')
            property 'forge.logging.markers', 'REGISTRIES'
            property 'forge.logging.console.level', 'debug'
            mods {
                "${ctx.namespace}" {
                    source sourceSets.main
                }
            }
        }
        server {
            workingDirectory project.file('run')
            property 'forge.logging.console.level', 'debug'
            mods {
                "${ctx.namespace}" {
                    source sourceSets.main
                }
            }
        }
    }
}

dependencies {
    minecraft "net.minecraftforge:forge:${ctx.minecraftVersion}-47.2.0"
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

export { toPascalCase as forgeToPascalCase };
