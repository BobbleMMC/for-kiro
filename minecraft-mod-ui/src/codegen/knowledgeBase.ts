/**
 * Code Knowledge Base
 * Stores and retrieves learned code patterns, registration methods, and API differences
 * for each mod loader + Minecraft version combination.
 * 
 * This is the "brain" that allows the generator to learn and adapt -
 * it stores patterns from templates, user customizations, and version-specific quirks.
 */

import Dexie, { type Table } from 'dexie';
import type { ModLoader, MinecraftVersion, ContentType, LearnedPattern, VersionDiff, RegistrationPattern } from './templates/types';

// ============================================================
// DATABASE SCHEMA
// ============================================================

class CodeKnowledgeDB extends Dexie {
  patterns!: Table<LearnedPattern, number>;
  versionDiffs!: Table<VersionDiff & { id?: number }, number>;
  registrationPatterns!: Table<RegistrationPattern & { id?: number }, number>;
  metadata!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('MinecraftCodeKnowledgeDB');

    this.version(1).stores({
      patterns: '++id, modLoader, minecraftVersion, contentType, patternName, [modLoader+minecraftVersion], [modLoader+contentType], [modLoader+minecraftVersion+contentType], *tags',
      versionDiffs: '++id, modLoader, fromVersion, toVersion, [modLoader+fromVersion+toVersion]',
      registrationPatterns: '++id, modLoader, contentType, [modLoader+contentType], [modLoader+contentType+versions]',
      metadata: 'key',
    });
  }
}

// Singleton instance
const knowledgeDB = new CodeKnowledgeDB();

// ============================================================
// PATTERN MANAGEMENT
// ============================================================

export const PatternStore = {
  /**
   * Add a new learned pattern
   */
  async add(pattern: Omit<LearnedPattern, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date().toISOString();
    return knowledgeDB.patterns.add({
      ...pattern,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    } as LearnedPattern);
  },

  /**
   * Get patterns for a specific loader + version + content type
   */
  async get(modLoader: ModLoader, minecraftVersion: MinecraftVersion, contentType: ContentType): Promise<LearnedPattern[]> {
    return knowledgeDB.patterns
      .where({ modLoader, minecraftVersion, contentType })
      .toArray();
  },

  /**
   * Get all patterns for a loader
   */
  async getByLoader(modLoader: ModLoader): Promise<LearnedPattern[]> {
    return knowledgeDB.patterns
      .where('modLoader').equals(modLoader)
      .toArray();
  },

  /**
   * Get patterns by tag
   */
  async getByTag(tag: string): Promise<LearnedPattern[]> {
    return knowledgeDB.patterns
      .where('tags').equals(tag)
      .toArray();
  },

  /**
   * Search patterns by name or description
   */
  async search(query: string, modLoader?: ModLoader): Promise<LearnedPattern[]> {
    const lowerQuery = query.toLowerCase();
    let collection = knowledgeDB.patterns.toCollection();

    if (modLoader) {
      collection = knowledgeDB.patterns.where('modLoader').equals(modLoader);
    }

    return collection
      .filter(p =>
        p.patternName.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.tags.some(t => t.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  },

  /**
   * Increment usage counter (tracks which patterns are most used)
   */
  async recordUsage(patternId: number): Promise<void> {
    await knowledgeDB.patterns.update(patternId, {
      usageCount: (await knowledgeDB.patterns.get(patternId))!.usageCount + 1,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Get most frequently used patterns
   */
  async getMostUsed(limit = 10): Promise<LearnedPattern[]> {
    return knowledgeDB.patterns
      .orderBy('usageCount')
      .reverse()
      .limit(limit)
      .toArray();
  },

  /**
   * Update an existing pattern
   */
  async update(id: number, changes: Partial<LearnedPattern>): Promise<void> {
    await knowledgeDB.patterns.update(id, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a pattern
   */
  async delete(id: number): Promise<void> {
    await knowledgeDB.patterns.delete(id);
  },

  /**
   * Get user-defined patterns only
   */
  async getUserPatterns(): Promise<LearnedPattern[]> {
    return knowledgeDB.patterns
      .filter(p => p.isUserDefined)
      .toArray();
  },

  /**
   * Get total pattern count
   */
  async count(): Promise<number> {
    return knowledgeDB.patterns.count();
  },
};

// ============================================================
// VERSION DIFF MANAGEMENT
// ============================================================

export const VersionDiffStore = {
  /**
   * Add a version migration diff
   */
  async add(diff: Omit<VersionDiff, 'id'>): Promise<number> {
    return knowledgeDB.versionDiffs.add(diff as VersionDiff & { id?: number });
  },

  /**
   * Get diffs between two versions for a loader
   */
  async getDiffs(modLoader: ModLoader, fromVersion: MinecraftVersion, toVersion: MinecraftVersion): Promise<VersionDiff[]> {
    return knowledgeDB.versionDiffs
      .where({ modLoader, fromVersion, toVersion })
      .toArray();
  },

  /**
   * Get all diffs for a loader
   */
  async getAllForLoader(modLoader: ModLoader): Promise<VersionDiff[]> {
    return knowledgeDB.versionDiffs
      .where('modLoader').equals(modLoader)
      .toArray();
  },

  /**
   * Get migration path between versions (chains of diffs)
   */
  async getMigrationPath(modLoader: ModLoader, fromVersion: MinecraftVersion, toVersion: MinecraftVersion): Promise<VersionDiff[]> {
    const allDiffs = await this.getAllForLoader(modLoader);
    // Simple path - direct diffs
    const directDiffs = allDiffs.filter(d =>
      d.fromVersion === fromVersion && d.toVersion === toVersion
    );
    if (directDiffs.length > 0) return directDiffs;

    // Try to find a chain (fromVersion -> intermediate -> toVersion)
    const chainDiffs: VersionDiff[] = [];
    const intermediates = allDiffs.filter(d => d.fromVersion === fromVersion);
    for (const mid of intermediates) {
      const seconds = allDiffs.filter(d => d.fromVersion === mid.toVersion && d.toVersion === toVersion);
      if (seconds.length > 0) {
        chainDiffs.push(mid, ...seconds);
        break;
      }
    }
    return chainDiffs;
  },
};

// ============================================================
// REGISTRATION PATTERN STORE
// ============================================================

export const RegistrationStore = {
  /**
   * Add a registration pattern
   */
  async add(pattern: RegistrationPattern): Promise<number> {
    return knowledgeDB.registrationPatterns.add(pattern as RegistrationPattern & { id?: number });
  },

  /**
   * Get registration pattern for a specific content type and loader
   */
  async get(modLoader: ModLoader, contentType: ContentType): Promise<(RegistrationPattern & { id?: number })[]> {
    return knowledgeDB.registrationPatterns
      .where({ modLoader, contentType })
      .toArray();
  },

  /**
   * Get all registration patterns for a loader
   */
  async getByLoader(modLoader: ModLoader): Promise<(RegistrationPattern & { id?: number })[]> {
    return knowledgeDB.registrationPatterns
      .where('modLoader').equals(modLoader)
      .toArray();
  },
};

// ============================================================
// KNOWLEDGE BASE SEEDING (Built-in patterns)
// ============================================================

async function isKnowledgeSeeded(): Promise<boolean> {
  try {
    const record = await knowledgeDB.metadata.get('seeded');
    return record?.value === 'true';
  } catch {
    return false;
  }
}

/**
 * Seeds the knowledge base with built-in patterns for all loaders.
 * This represents the "out of the box" knowledge of the system.
 */
export async function seedKnowledgeBase(): Promise<void> {
  const alreadySeeded = await isKnowledgeSeeded();
  if (alreadySeeded) {
    console.log('[Knowledge] Already seeded, skipping...');
    return;
  }

  console.log('[Knowledge] Seeding code knowledge base...');

  await knowledgeDB.transaction('rw', [
    knowledgeDB.patterns,
    knowledgeDB.versionDiffs,
    knowledgeDB.registrationPatterns,
    knowledgeDB.metadata,
  ], async () => {

    // ---- FABRIC PATTERNS ----
    await knowledgeDB.patterns.bulkAdd([
      {
        modLoader: 'fabric',
        minecraftVersion: '1.20.4',
        contentType: 'block',
        patternName: 'fabric_block_registration',
        description: 'Standard Fabric block registration using Registry.register with Identifier.of',
        codeSnippet: `Registry.register(Registries.BLOCK, Identifier.of(MOD_ID, "block_name"), new Block(AbstractBlock.Settings.create().strength(3.0f, 3.0f)));`,
        imports: [
          'net.minecraft.registry.Registries',
          'net.minecraft.registry.Registry',
          'net.minecraft.util.Identifier',
          'net.minecraft.block.Block',
          'net.minecraft.block.AbstractBlock',
        ],
        tags: ['block', 'registration', 'fabric', '1.20'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'fabric',
        minecraftVersion: '1.20.4',
        contentType: 'item',
        patternName: 'fabric_item_registration',
        description: 'Standard Fabric item registration with Item.Settings',
        codeSnippet: `Registry.register(Registries.ITEM, Identifier.of(MOD_ID, "item_name"), new Item(new Item.Settings().maxCount(64)));`,
        imports: [
          'net.minecraft.registry.Registries',
          'net.minecraft.registry.Registry',
          'net.minecraft.util.Identifier',
          'net.minecraft.item.Item',
        ],
        tags: ['item', 'registration', 'fabric', '1.20'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'fabric',
        minecraftVersion: '1.20.4',
        contentType: 'entity',
        patternName: 'fabric_entity_registration',
        description: 'Fabric entity type registration with FabricDefaultAttributeRegistry',
        codeSnippet: `EntityType<MyEntity> ENTITY = Registry.register(Registries.ENTITY_TYPE, Identifier.of(MOD_ID, "entity_name"), EntityType.Builder.create(MyEntity::new, SpawnGroup.MONSTER).dimensions(0.6f, 1.8f).build());
FabricDefaultAttributeRegistry.register(ENTITY, MyEntity.createAttributes());`,
        imports: [
          'net.minecraft.entity.EntityType',
          'net.minecraft.entity.SpawnGroup',
          'net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry',
        ],
        tags: ['entity', 'registration', 'fabric', 'attributes'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'fabric',
        minecraftVersion: '1.20.4',
        contentType: 'recipe',
        patternName: 'fabric_shaped_recipe_json',
        description: 'Shaped crafting recipe JSON structure for Fabric data packs',
        codeSnippet: `{
  "type": "minecraft:crafting_shaped",
  "pattern": ["ABA", " A ", "ABA"],
  "key": { "A": { "item": "mod:item_a" }, "B": { "item": "mod:item_b" } },
  "result": { "item": "mod:output_item", "count": 1 }
}`,
        imports: [],
        tags: ['recipe', 'shaped', 'json', 'datapack'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'fabric',
        minecraftVersion: '1.20.4',
        contentType: 'block',
        patternName: 'fabric_ore_block_with_drops',
        description: 'Custom ore block that drops items with fortune support',
        codeSnippet: `public class CustomOreBlock extends ExperienceDroppingBlock {
    public CustomOreBlock(AbstractBlock.Settings settings) {
        super(settings, UniformIntProvider.create(2, 5));
    }
}`,
        imports: [
          'net.minecraft.block.ExperienceDroppingBlock',
          'net.minecraft.block.AbstractBlock',
          'net.minecraft.util.math.intprovider.UniformIntProvider',
        ],
        tags: ['block', 'ore', 'experience', 'fabric'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'fabric',
        minecraftVersion: '1.20.4',
        contentType: 'item',
        patternName: 'fabric_food_item',
        description: 'Consumable food item with nutrition and saturation',
        codeSnippet: `new Item(new Item.Settings()
    .food(new FoodComponent.Builder()
        .nutrition(6)
        .saturationModifier(0.8f)
        .statusEffect(new StatusEffectInstance(StatusEffects.REGENERATION, 100, 1), 1.0f)
        .build()))`,
        imports: [
          'net.minecraft.item.Item',
          'net.minecraft.component.type.FoodComponent',
          'net.minecraft.entity.effect.StatusEffectInstance',
          'net.minecraft.entity.effect.StatusEffects',
        ],
        tags: ['item', 'food', 'consumable', 'effect', 'fabric'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'fabric',
        minecraftVersion: '1.20.4',
        contentType: 'item',
        patternName: 'fabric_tool_material',
        description: 'Custom tool material definition for Fabric',
        codeSnippet: `public class ModToolMaterials implements ToolMaterial {
    public static final ModToolMaterials RUBY = new ModToolMaterials();

    @Override public int getDurability() { return 2031; }
    @Override public float getMiningSpeedMultiplier() { return 9.0f; }
    @Override public float getAttackDamage() { return 4.0f; }
    @Override public int getMiningLevel() { return 4; }
    @Override public int getEnchantability() { return 15; }
    @Override public Ingredient getRepairIngredient() { return Ingredient.ofItems(ModItems.RUBY); }
}`,
        imports: [
          'net.minecraft.item.ToolMaterial',
          'net.minecraft.recipe.Ingredient',
        ],
        tags: ['item', 'tool', 'material', 'fabric', 'sword', 'pickaxe'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] as LearnedPattern[]);

    // ---- FORGE PATTERNS ----
    await knowledgeDB.patterns.bulkAdd([
      {
        modLoader: 'forge',
        minecraftVersion: '1.20.4',
        contentType: 'block',
        patternName: 'forge_deferred_block',
        description: 'Forge block registration using DeferredRegister',
        codeSnippet: `public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, MOD_ID);
public static final RegistryObject<Block> MY_BLOCK = BLOCKS.register("block_name", () -> new Block(BlockBehaviour.Properties.of().strength(3.0f)));`,
        imports: [
          'net.minecraftforge.registries.DeferredRegister',
          'net.minecraftforge.registries.ForgeRegistries',
          'net.minecraftforge.registries.RegistryObject',
          'net.minecraft.world.level.block.Block',
          'net.minecraft.world.level.block.state.BlockBehaviour',
        ],
        tags: ['block', 'registration', 'forge', 'deferred'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'forge',
        minecraftVersion: '1.20.4',
        contentType: 'item',
        patternName: 'forge_deferred_item',
        description: 'Forge item registration using DeferredRegister',
        codeSnippet: `public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, MOD_ID);
public static final RegistryObject<Item> MY_ITEM = ITEMS.register("item_name", () -> new Item(new Item.Properties()));`,
        imports: [
          'net.minecraftforge.registries.DeferredRegister',
          'net.minecraftforge.registries.ForgeRegistries',
          'net.minecraftforge.registries.RegistryObject',
          'net.minecraft.world.item.Item',
        ],
        tags: ['item', 'registration', 'forge', 'deferred'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'forge',
        minecraftVersion: '1.20.4',
        contentType: 'entity',
        patternName: 'forge_entity_registration',
        description: 'Forge entity registration with EntityAttributeCreationEvent',
        codeSnippet: `public static final DeferredRegister<EntityType<?>> ENTITY_TYPES = DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, MOD_ID);
public static final RegistryObject<EntityType<MyEntity>> MY_ENTITY = ENTITY_TYPES.register("entity_name",
    () -> EntityType.Builder.of(MyEntity::new, MobCategory.MONSTER).sized(0.6f, 1.8f).build("entity_name"));

// In event handler:
@SubscribeEvent
public static void registerAttributes(EntityAttributeCreationEvent event) {
    event.put(MY_ENTITY.get(), MyEntity.createAttributes().build());
}`,
        imports: [
          'net.minecraftforge.registries.DeferredRegister',
          'net.minecraftforge.registries.ForgeRegistries',
          'net.minecraft.world.entity.EntityType',
          'net.minecraft.world.entity.MobCategory',
          'net.minecraftforge.event.entity.EntityAttributeCreationEvent',
        ],
        tags: ['entity', 'registration', 'forge', 'attributes', 'event'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] as LearnedPattern[]);

    // ---- NEOFORGE PATTERNS ----
    await knowledgeDB.patterns.bulkAdd([
      {
        modLoader: 'neoforge',
        minecraftVersion: '1.21',
        contentType: 'block',
        patternName: 'neoforge_deferred_block',
        description: 'NeoForge block registration using DeferredRegister.Blocks',
        codeSnippet: `public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(MOD_ID);
public static final DeferredBlock<Block> MY_BLOCK = BLOCKS.register("block_name", () -> new Block(BlockBehaviour.Properties.of().strength(3.0f)));`,
        imports: [
          'net.neoforged.neoforge.registries.DeferredBlock',
          'net.neoforged.neoforge.registries.DeferredRegister',
          'net.minecraft.world.level.block.Block',
          'net.minecraft.world.level.block.state.BlockBehaviour',
        ],
        tags: ['block', 'registration', 'neoforge', 'deferred'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'neoforge',
        minecraftVersion: '1.21',
        contentType: 'item',
        patternName: 'neoforge_deferred_item',
        description: 'NeoForge item registration using DeferredRegister.Items',
        codeSnippet: `public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(MOD_ID);
public static final DeferredItem<Item> MY_ITEM = ITEMS.register("item_name", () -> new Item(new Item.Properties()));`,
        imports: [
          'net.neoforged.neoforge.registries.DeferredItem',
          'net.neoforged.neoforge.registries.DeferredRegister',
          'net.minecraft.world.item.Item',
        ],
        tags: ['item', 'registration', 'neoforge', 'deferred'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        modLoader: 'neoforge',
        minecraftVersion: '1.21',
        contentType: 'entity',
        patternName: 'neoforge_entity_registration',
        description: 'NeoForge entity registration with EventBusSubscriber',
        codeSnippet: `public static final DeferredRegister<EntityType<?>> ENTITY_TYPES = DeferredRegister.create(Registries.ENTITY_TYPE, MOD_ID);
public static final Supplier<EntityType<MyEntity>> MY_ENTITY = ENTITY_TYPES.register("entity_name",
    () -> EntityType.Builder.of(MyEntity::new, MobCategory.MONSTER).sized(0.6f, 1.8f).build("entity_name"));

@EventBusSubscriber(modid = MOD_ID, bus = EventBusSubscriber.Bus.MOD)
public static class ModEvents {
    @SubscribeEvent
    public static void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(MY_ENTITY.get(), MyEntity.createAttributes().build());
    }
}`,
        imports: [
          'net.neoforged.neoforge.registries.DeferredRegister',
          'net.minecraft.core.registries.Registries',
          'net.minecraft.world.entity.EntityType',
          'net.minecraft.world.entity.MobCategory',
          'net.neoforged.bus.api.SubscribeEvent',
          'net.neoforged.fml.common.EventBusSubscriber',
          'net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent',
        ],
        tags: ['entity', 'registration', 'neoforge', 'attributes', 'event'],
        isUserDefined: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ] as LearnedPattern[]);

    // ---- REGISTRATION PATTERNS ----
    await knowledgeDB.registrationPatterns.bulkAdd([
      {
        modLoader: 'fabric',
        versions: ['1.20.1', '1.20.2', '1.20.4', '1.21', '1.21.1', '1.21.4'] as MinecraftVersion[],
        contentType: 'block',
        registryMethod: 'Registry.register',
        imports: ['net.minecraft.registry.Registries', 'net.minecraft.registry.Registry', 'net.minecraft.util.Identifier'],
        registrationCode: 'Registry.register(Registries.BLOCK, Identifier.of(MOD_ID, name), block)',
        registrationLocation: 'static_init',
      },
      {
        modLoader: 'forge',
        versions: ['1.20.1', '1.20.2', '1.20.4'] as MinecraftVersion[],
        contentType: 'block',
        registryMethod: 'DeferredRegister',
        imports: ['net.minecraftforge.registries.DeferredRegister', 'net.minecraftforge.registries.ForgeRegistries'],
        registrationCode: 'BLOCKS.register(name, () -> block)',
        registrationLocation: 'deferred_register',
      },
      {
        modLoader: 'neoforge',
        versions: ['1.20.4', '1.21', '1.21.1', '1.21.4'] as MinecraftVersion[],
        contentType: 'block',
        registryMethod: 'DeferredRegister.Blocks',
        imports: ['net.neoforged.neoforge.registries.DeferredRegister', 'net.neoforged.neoforge.registries.DeferredBlock'],
        registrationCode: 'BLOCKS.register(name, () -> block)',
        registrationLocation: 'deferred_register',
      },
      {
        modLoader: 'fabric',
        versions: ['1.20.1', '1.20.2', '1.20.4', '1.21', '1.21.1', '1.21.4'] as MinecraftVersion[],
        contentType: 'item',
        registryMethod: 'Registry.register',
        imports: ['net.minecraft.registry.Registries', 'net.minecraft.registry.Registry', 'net.minecraft.util.Identifier'],
        registrationCode: 'Registry.register(Registries.ITEM, Identifier.of(MOD_ID, name), item)',
        registrationLocation: 'static_init',
      },
      {
        modLoader: 'forge',
        versions: ['1.20.1', '1.20.2', '1.20.4'] as MinecraftVersion[],
        contentType: 'item',
        registryMethod: 'DeferredRegister',
        imports: ['net.minecraftforge.registries.DeferredRegister', 'net.minecraftforge.registries.ForgeRegistries'],
        registrationCode: 'ITEMS.register(name, () -> item)',
        registrationLocation: 'deferred_register',
      },
      {
        modLoader: 'neoforge',
        versions: ['1.20.4', '1.21', '1.21.1', '1.21.4'] as MinecraftVersion[],
        contentType: 'item',
        registryMethod: 'DeferredRegister.Items',
        imports: ['net.neoforged.neoforge.registries.DeferredRegister', 'net.neoforged.neoforge.registries.DeferredItem'],
        registrationCode: 'ITEMS.register(name, () -> item)',
        registrationLocation: 'deferred_register',
      },
    ] as (RegistrationPattern & { id?: number })[]);

    // ---- VERSION DIFFS ----
    await knowledgeDB.versionDiffs.bulkAdd([
      {
        modLoader: 'fabric',
        fromVersion: '1.20.1' as MinecraftVersion,
        toVersion: '1.20.4' as MinecraftVersion,
        changes: [
          {
            contentType: 'block' as ContentType,
            oldApi: 'new Identifier(MOD_ID, name)',
            newApi: 'Identifier.of(MOD_ID, name)',
            description: 'Identifier constructor replaced with Identifier.of() factory method',
          },
          {
            contentType: 'item' as ContentType,
            oldApi: 'FoodComponent.Builder().hunger(4)',
            newApi: 'FoodComponent.Builder().nutrition(4)',
            description: 'FoodComponent.hunger() renamed to nutrition()',
          },
        ],
      },
      {
        modLoader: 'fabric',
        fromVersion: '1.20.4' as MinecraftVersion,
        toVersion: '1.21' as MinecraftVersion,
        changes: [
          {
            contentType: 'item' as ContentType,
            oldApi: 'item.getMaxDamage()',
            newApi: 'item.components().get(DataComponentTypes.MAX_DAMAGE)',
            description: 'Items now use DataComponents instead of direct methods (1.21+)',
          },
          {
            contentType: 'block' as ContentType,
            oldApi: 'AbstractBlock.Settings.of(Material.STONE)',
            newApi: 'AbstractBlock.Settings.create()',
            description: 'Material system removed in 1.21, use create() instead',
          },
        ],
      },
      {
        modLoader: 'forge',
        fromVersion: '1.20.1' as MinecraftVersion,
        toVersion: '1.20.4' as MinecraftVersion,
        changes: [
          {
            contentType: 'block' as ContentType,
            oldApi: 'BlockBehaviour.Properties.of(Material.STONE)',
            newApi: 'BlockBehaviour.Properties.of()',
            description: 'Material parameter removed from BlockBehaviour.Properties',
          },
        ],
      },
    ] as (VersionDiff & { id?: number })[]);

    // Mark as seeded
    await knowledgeDB.metadata.put({ key: 'seeded', value: 'true' });
    await knowledgeDB.metadata.put({ key: 'version', value: '1' });
  });

  console.log('[Knowledge] ✓ Code knowledge base seeded successfully');
}

// ============================================================
// KNOWLEDGE QUERY API
// ============================================================

export const KnowledgeBase = {
  /**
   * Initialize the knowledge base (seed if needed)
   */
  async init(): Promise<void> {
    await knowledgeDB.open();
    await seedKnowledgeBase();
  },

  /**
   * Get the best pattern for generating code
   * Considers: mod loader, version, content type, usage frequency
   */
  async getBestPattern(
    modLoader: ModLoader,
    minecraftVersion: MinecraftVersion,
    contentType: ContentType
  ): Promise<LearnedPattern | null> {
    // First try exact match
    const exactPatterns = await PatternStore.get(modLoader, minecraftVersion, contentType);
    if (exactPatterns.length > 0) {
      // Return most used or most recently updated
      return exactPatterns.sort((a, b) => b.usageCount - a.usageCount)[0];
    }

    // Try same loader, any version
    const loaderPatterns = await knowledgeDB.patterns
      .where({ modLoader, contentType })
      .toArray();
    if (loaderPatterns.length > 0) {
      return loaderPatterns.sort((a, b) => b.usageCount - a.usageCount)[0];
    }

    return null;
  },

  /**
   * Get all patterns relevant to a project
   */
  async getProjectPatterns(modLoader: ModLoader, minecraftVersion: MinecraftVersion): Promise<LearnedPattern[]> {
    return knowledgeDB.patterns
      .where({ modLoader, minecraftVersion })
      .toArray();
  },

  /**
   * Get the correct registration method for a content type
   */
  async getRegistrationMethod(modLoader: ModLoader, contentType: ContentType): Promise<RegistrationPattern | null> {
    const patterns = await RegistrationStore.get(modLoader, contentType);
    return patterns.length > 0 ? patterns[0] : null;
  },

  /**
   * Learn a new pattern from user code
   */
  async learnFromCode(
    modLoader: ModLoader,
    minecraftVersion: MinecraftVersion,
    contentType: ContentType,
    patternName: string,
    description: string,
    codeSnippet: string,
    imports: string[] = [],
    tags: string[] = []
  ): Promise<number> {
    return PatternStore.add({
      modLoader,
      minecraftVersion,
      contentType,
      patternName,
      description,
      codeSnippet,
      imports,
      tags: [...tags, modLoader, contentType],
      isUserDefined: true,
    });
  },

  /**
   * Get API changes between versions
   */
  async getVersionChanges(
    modLoader: ModLoader,
    fromVersion: MinecraftVersion,
    toVersion: MinecraftVersion
  ): Promise<VersionDiff[]> {
    return VersionDiffStore.getMigrationPath(modLoader, fromVersion, toVersion);
  },

  /**
   * Check what imports are needed for a specific operation
   */
  async getRequiredImports(modLoader: ModLoader, contentType: ContentType): Promise<string[]> {
    const pattern = await this.getRegistrationMethod(modLoader, contentType);
    if (pattern) return pattern.imports;

    // Fallback: check learned patterns
    const learned = await this.getBestPattern(modLoader, '1.20.4', contentType);
    return learned?.imports || [];
  },

  /**
   * Reset and reseed the knowledge base
   */
  async reset(): Promise<void> {
    await knowledgeDB.delete();
    await knowledgeDB.open();
    await seedKnowledgeBase();
  },

  /** Pattern store direct access */
  patterns: PatternStore,
  /** Version diff store */
  versionDiffs: VersionDiffStore,
  /** Registration store */
  registrations: RegistrationStore,
};

export { knowledgeDB };
export default KnowledgeBase;
