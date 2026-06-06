//! Feature system — a single source of truth for "what features can the
//! studio actually generate, and at what level of completeness?"
//!
//! Each Minecraft mod feature (block, item, tool, biome, mixin, …) is
//! described along **four orthogonal dimensions** identified in the
//! post-release analysis:
//!
//!   1. **Template**            — does a starter file template exist?
//!   2. **Validator**           — are inputs sanity-checked before generation?
//!   3. **Dependency resolver** — does the system know which Gradle libs /
//!                                 Fabric API modules / mappings are needed?
//!   4. **Version-aware**       — does the generator emit different code for
//!                                 different Minecraft versions / loaders?
//!
//! The registry below is exposed to the frontend as a typed catalog so the
//! UI can render an honest "Feature Catalog" panel: every kind has a status
//! badge plus four capability badges, making it obvious at a glance which
//! pieces are ready for production use and which are still skeleton stubs.
//!
//! Marking a feature "Complete" requires:
//!   - `has_template`, `has_validator`, `has_dependency_resolver`,
//!     `has_version_aware_generator` all true; AND
//!   - a working Tauri command that the UI can call directly.
//!
//! Today only `Block`, `Item`, and `EventHandler` reach that bar.

pub mod skeleton;
pub mod version_matrix;
pub mod dependency_resolver;
pub mod vanilla_plus;

use serde::{Deserialize, Serialize};

/// All Minecraft mod features the studio aims to support.
///
/// Adding a new variant requires updating `all_features()` so the catalog
/// stays in sync — the test in this module enforces it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FeatureKind {
    // Items & Blocks
    Block,
    Item,
    Tool,
    Armor,
    Food,
    Enchantment,

    // Entities
    Entity,
    GeckolibAnimation,

    // World
    Biome,
    Dimension,
    WorldgenFeature,

    // Data
    Recipe,
    LootTable,
    Advancement,

    // Assets
    Sound,
    Texture,
    Model,

    // UI / Interaction
    Config,
    Keybind,
    Screen,
    Command,

    // Runtime / Integration
    EventHandler,
    Mixin,
    JeiIntegration,
    DependencyIntegration,
}

impl FeatureKind {
    pub fn slug(&self) -> &'static str {
        match self {
            FeatureKind::Block => "block",
            FeatureKind::Item => "item",
            FeatureKind::Tool => "tool",
            FeatureKind::Armor => "armor",
            FeatureKind::Food => "food",
            FeatureKind::Enchantment => "enchantment",
            FeatureKind::Entity => "entity",
            FeatureKind::GeckolibAnimation => "geckolib_animation",
            FeatureKind::Biome => "biome",
            FeatureKind::Dimension => "dimension",
            FeatureKind::WorldgenFeature => "worldgen_feature",
            FeatureKind::Recipe => "recipe",
            FeatureKind::LootTable => "loot_table",
            FeatureKind::Advancement => "advancement",
            FeatureKind::Sound => "sound",
            FeatureKind::Texture => "texture",
            FeatureKind::Model => "model",
            FeatureKind::Config => "config",
            FeatureKind::Keybind => "keybind",
            FeatureKind::Screen => "screen",
            FeatureKind::Command => "command",
            FeatureKind::EventHandler => "event_handler",
            FeatureKind::Mixin => "mixin",
            FeatureKind::JeiIntegration => "jei_integration",
            FeatureKind::DependencyIntegration => "dependency_integration",
        }
    }

    pub fn from_slug(s: &str) -> Option<FeatureKind> {
        for f in [
            FeatureKind::Block,
            FeatureKind::Item,
            FeatureKind::Tool,
            FeatureKind::Armor,
            FeatureKind::Food,
            FeatureKind::Enchantment,
            FeatureKind::Entity,
            FeatureKind::GeckolibAnimation,
            FeatureKind::Biome,
            FeatureKind::Dimension,
            FeatureKind::WorldgenFeature,
            FeatureKind::Recipe,
            FeatureKind::LootTable,
            FeatureKind::Advancement,
            FeatureKind::Sound,
            FeatureKind::Texture,
            FeatureKind::Model,
            FeatureKind::Config,
            FeatureKind::Keybind,
            FeatureKind::Screen,
            FeatureKind::Command,
            FeatureKind::EventHandler,
            FeatureKind::Mixin,
            FeatureKind::JeiIntegration,
            FeatureKind::DependencyIntegration,
        ] {
            if f.slug() == s {
                return Some(f);
            }
        }
        None
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompletionStatus {
    /// No real generator yet — clicking "Generate" produces a TODO-flavoured
    /// placeholder file the user can flesh out by hand.
    Skeleton,
    /// Some flows work (e.g. UI-only, no persistence; or persistence but no
    /// codegen). Not ready for production mods.
    Partial,
    /// Full pipeline: validator + version-aware generator + dependency
    /// resolver + Tauri command + (typically) editor UI.
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Loader {
    Forge,
    Fabric,
    NeoForge,
    Quilt,
}

impl Loader {
    pub fn slug(&self) -> &'static str {
        match self {
            Loader::Forge => "forge",
            Loader::Fabric => "fabric",
            Loader::NeoForge => "neoforge",
            Loader::Quilt => "quilt",
        }
    }
}

/// Per-feature catalog entry. Sent to the frontend verbatim; field shape
/// matches the typed wrapper in `lib/tauri-api.ts`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureInfo {
    pub kind: FeatureKind,
    pub name: String,
    pub description: String,
    pub category: String,

    pub status: CompletionStatus,

    pub supported_loaders: Vec<String>,
    pub supported_mc_versions: Vec<String>,

    /// The four capability dimensions called out in the project review.
    pub has_template: bool,
    pub has_validator: bool,
    pub has_dependency_resolver: bool,
    pub has_version_aware_generator: bool,

    /// Existing Tauri command (e.g. `"generate_block_class"`). `None` for
    /// skeleton-only features — those are generated via the generic
    /// `generate_feature_skeleton` command instead.
    pub command_name: Option<String>,

    /// Workspace panel id the UI should focus when the user clicks
    /// "Open editor" on a Complete feature.
    pub editor_panel_id: Option<String>,

    /// Free-form note shown in the catalog tooltip.
    pub notes: String,
}

const ALL_LOADERS: [&str; 3] = ["forge", "fabric", "neoforge"];
const COMMON_MC_VERSIONS: [&str; 3] = ["1.20.1", "1.20.4", "1.21"];

fn loaders_all() -> Vec<String> {
    ALL_LOADERS.iter().map(|s| s.to_string()).collect()
}

fn mc_versions_common() -> Vec<String> {
    COMMON_MC_VERSIONS.iter().map(|s| s.to_string()).collect()
}

/// The entire feature catalog. Order here determines display order in the UI.
pub fn all_features() -> Vec<FeatureInfo> {
    use CompletionStatus::*;
    use FeatureKind::*;

    vec![
        // ===== Items & Blocks =====
        FeatureInfo {
            kind: Block,
            name: "Block".into(),
            description: "Custom blocks with hardness, luminance, sound, and material properties.".into(),
            category: "Items & Blocks".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: true,
            has_version_aware_generator: true,
            command_name: Some("generate_block_class".into()),
            editor_panel_id: Some("block-editor".into()),
            notes: "DB-persisted. Version-aware emitter consults version_matrix and emits Material.STONE arg for 1.19, .mapColor() for 1.20+, NeoForge package roots for 1.21, and the right Java toolchain for each.".into(),
        },
        FeatureInfo {
            kind: Item,
            name: "Item".into(),
            description: "Stack-based items with rarity, durability, and stack size.".into(),
            category: "Items & Blocks".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: true,
            has_version_aware_generator: true,
            command_name: Some("generate_item_class".into()),
            editor_panel_id: Some("item-editor".into()),
            notes: "DB-persisted. Version-aware emitter switches between ForgeRegistries and NeoForgeRegistries / FabricRegistries based on (loader, mc_version).".into(),
        },
        FeatureInfo {
            kind: Tool,
            name: "Tool".into(),
            description: "Pickaxe / axe / shovel / sword / hoe with mining levels.".into(),
            category: "Items & Blocks".into(),
            status: Partial,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: true,
            command_name: Some("generate_tool_class".into()),
            editor_panel_id: Some("item-editor".into()),
            notes: "Item-aware: pick an existing Item plus a tool kind (pickaxe/axe/shovel/hoe/sword) and tier (WOOD..NETHERITE). Generator is now version-aware (consults version_matrix for the target MC version + loader header) and reads tool_kind / tool_tier / attack_damage from the persisted Item row when those overrides are omitted. Mining-tag entry is left as TODO.".into(),
        },
        FeatureInfo {
            kind: Armor,
            name: "Armor".into(),
            description: "Helmet / chestplate / leggings / boots with set bonuses.".into(),
            category: "Items & Blocks".into(),
            status: Partial,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: true,
            command_name: Some("generate_armor_class".into()),
            editor_panel_id: Some("item-editor".into()),
            notes: "Item-aware: pick an existing Item, slot (HEAD/CHEST/LEGS/FEET), and ArmorMaterial reference. Generator is now version-aware and reads armor_slot / armor_material / armor_defense / armor_toughness / knockback_resistance from the persisted Item row when overrides are omitted. ArmorMaterial implementation and layer texture are still TODO.".into(),
        },
        FeatureInfo {
            kind: Food,
            name: "Food".into(),
            description: "Edible items with nutrition, saturation, and effects.".into(),
            category: "Items & Blocks".into(),
            status: Partial,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: true,
            command_name: Some("generate_food_class".into()),
            editor_panel_id: Some("item-editor".into()),
            notes: "Item-aware: pick an existing Item plus nutrition (0..20), saturation modifier, alwaysEat / fast flags. Generator is now version-aware and reads food_eat_seconds / food_always_eat / food_eat_fast / food_effects_json from the persisted Item row. MobEffect lines are emitted as commented-out scaffolding the user can uncomment.".into(),
        },
        FeatureInfo {
            kind: Enchantment,
            name: "Enchantment".into(),
            description: "Custom enchantments with level curves, treasure flag, anvil cost.".into(),
            category: "Items & Blocks".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: Some("generate_enchantment_class".into()),
            editor_panel_id: Some("enchantment-editor".into()),
            notes: "Persisted to the registry table; generator emits an Enchantment subclass with rarity from weight (>=10 COMMON / >=5 UNCOMMON / >=2 RARE / VERY_RARE), validated EnchantmentCategory, getMinCost/getMaxCost level curves, treasure / curse / anvil flags.".into(),
        },

        // ===== Entities =====
        FeatureInfo {
            kind: Entity,
            name: "Entity".into(),
            description: "Mobs, NPCs, projectiles — health, AI, drops, spawning.".into(),
            category: "Entities".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: true,
            has_version_aware_generator: false,
            command_name: Some("generate_entity_class".into()),
            editor_panel_id: Some("entity-editor".into()),
            notes: "Persisted to the registry table; generator emits Mob / Animal / Monster subclass with attributes (health, speed, armor, attack, follow_range). Renderer/Model wiring left as user TODO.".into(),
        },
        FeatureInfo {
            kind: GeckolibAnimation,
            name: "Geckolib Animation".into(),
            description: "Skeletal-mesh animations powered by the Geckolib library.".into(),
            category: "Entities".into(),
            status: Skeleton,
            supported_loaders: vec!["forge".into(), "fabric".into()],
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: false,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: None,
            editor_panel_id: None,
            notes: "Skeleton emits a GeoAnimatable controller stub; Geckolib Maven dep TODO.".into(),
        },

        // ===== World =====
        FeatureInfo {
            kind: Biome,
            name: "Biome".into(),
            description: "Custom biomes with weather, mobs, foliage colour.".into(),
            category: "World".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: Some("generate_biome_json".into()),
            editor_panel_id: Some("biome-editor".into()),
            notes: "Persisted to the registry table; generator emits the data/<modid>/worldgen/biome/<name>.json file with effects + spawner + feature scaffolding (TODO entries kept verbose).".into(),
        },
        FeatureInfo {
            kind: Dimension,
            name: "Dimension".into(),
            description: "Custom dimensions with chunk generators and dimension type.".into(),
            category: "World".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: Some("generate_dimension_json".into()),
            editor_panel_id: Some("dimension-editor".into()),
            notes: "Generator supports noise / flat / debug chunk generators and fixed / checkerboard / multi_noise biome sources.".into(),
        },
        FeatureInfo {
            kind: WorldgenFeature,
            name: "Worldgen Feature".into(),
            description: "ConfiguredFeatures, PlacedFeatures (ore veins, structures, decorators).".into(),
            category: "World".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: true,
            command_name: Some("generate_worldgen_feature".into()),
            editor_panel_id: Some("worldgen-editor".into()),
            notes: "Persisted in the registry table as asset_type=\"worldgen_feature\". Generator emits ALL files needed to ship the feature in one bundle: configured_feature.json + placed_feature.json + a Forge or NeoForge biome_modifier (correct codec per loader), or a Fabric BiomeModifications Java helper. Supports kinds: ore / scattered_ore / tree / lake / spring / disk. Validates target_block, vein_size 1..=64, count 1..=128, height range, trunk_height, foliage_radius, disk_radius.".into(),
        },

        // ===== Data =====
        FeatureInfo {
            kind: Recipe,
            name: "Recipe".into(),
            description: "Crafting / smelting / blasting / smithing recipes.".into(),
            category: "Data".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: true,
            has_version_aware_generator: false,
            command_name: Some("generate_recipe_json".into()),
            editor_panel_id: Some("recipe-editor".into()),
            notes: "DB-persisted via the legacy editor's JSON payload (pattern_json + ingredients_json). Codegen emits Minecraft's exact wire format for shaped / shapeless / smelting / smoking / blasting / campfire kinds, with snake_case validation.".into(),
        },
        FeatureInfo {
            kind: LootTable,
            name: "Loot Table".into(),
            description: "Loot drops for blocks, entities, chests with conditions and pools.".into(),
            category: "Data".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: Some("generate_loot_table_json".into()),
            editor_panel_id: Some("loot-table-editor".into()),
            notes: "Persisted in the registry table as asset_type=\"loot_table\". Generator emits the exact wire format Minecraft expects, with output path derived from kind: blocks/ entities/ chests/ gameplay/fishing/ gameplay/hero_of_the_village/. Pools support constant or uniform/binomial rolls + bonus_rolls + per-pool conditions; entries support item / tag / loot_table / empty / dynamic / alternatives / group / sequence with weights, quality, set_count, conditions, functions, and recursive children. Validation enforces every constraint vanilla checks at runtime.".into(),
        },
        FeatureInfo {
            kind: Advancement,
            name: "Advancement".into(),
            description: "Custom advancements with criteria, rewards, frame, parent.".into(),
            category: "Data".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: Some("generate_advancement_json".into()),
            editor_panel_id: Some("advancement-editor".into()),
            notes: "Generator emits data/<modid>/advancement/<name>.json with display + criteria + parent. Frame restricted to task/goal/challenge.".into(),
        },

        // ===== Assets =====
        FeatureInfo {
            kind: Sound,
            name: "Sound".into(),
            description: "Custom sound events plus the sounds.json registry entry.".into(),
            category: "Assets".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: true,
            command_name: Some("generate_sound_assets".into()),
            editor_panel_id: Some("sound-editor".into()),
            notes: "Persisted in the registry table as asset_type=\"sound\". Generator emits TWO files in one bundle: a Java SoundEvents class (DeferredRegister<SoundEvent> on Forge / NeoForge with the right NeoForgeRegistries.SOUND_EVENT_REGISTRY_KEY, or Registry.register against BuiltInRegistries.SOUND_EVENT on Fabric / Quilt) plus assets/<modid>/sounds.json with one entry per event including category and ogg references. Validates: name regex, vanilla SoundSource categories, non-empty ogg list, no duplicate event names.".into(),
        },
        FeatureInfo {
            kind: Texture,
            name: "Texture".into(),
            description: "PNG textures for blocks / items / entities, with metadata.".into(),
            category: "Assets".into(),
            status: Skeleton,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: false,
            has_validator: false,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: None,
            editor_panel_id: None,
            notes: "Texture content generation requires an image pipeline. The skeleton emits a README.md placeholder telling the user where to drop the PNG.".into(),
        },
        FeatureInfo {
            kind: Model,
            name: "Model".into(),
            description: "Block / item / entity model JSON (cube_all, parent, custom).".into(),
            category: "Assets".into(),
            status: Skeleton,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: false,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: None,
            editor_panel_id: None,
            notes: "Skeleton emits a `cube_all` block model + matching blockstate JSON.".into(),
        },

        // ===== UI / Interaction =====
        FeatureInfo {
            kind: Config,
            name: "Config".into(),
            description: "Forge ModConfig / Fabric config screen with typed fields.".into(),
            category: "UI / Interaction".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: true,
            command_name: Some("generate_config_class".into()),
            editor_panel_id: Some("config-editor".into()),
            notes: "Persisted in the registry table as asset_type=\"config\". Generator emits a ForgeConfigSpec class on Forge, the equivalent ModConfigSpec on NeoForge, or a portable POJO on Fabric / Quilt (pair with Cloth Config / AutoConfig). Field types: bool / int / double / string / enum. defineInRange used for int and double; defineInList used for enum. Validates: kind in common/client/server, fields non-empty, no duplicate names, min<=max, enum requires non-empty allowed_values.".into(),
        },
        FeatureInfo {
            kind: Keybind,
            name: "Keybind".into(),
            description: "Player-rebindable keys registered with the client controls screen.".into(),
            category: "UI / Interaction".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: false,
            has_version_aware_generator: true,
            command_name: Some("generate_keybind_class".into()),
            editor_panel_id: Some("keybind-editor".into()),
            notes: "Persisted in the registry table as asset_type=\"keybind\". Generator emits a KeyMapping class with the right registration hook per loader: KeyBindingHelper.registerKeyBinding on Fabric / Quilt, RegisterKeyMappingsEvent on Forge / NeoForge. Validates the GLFW key constant against a set of letters / digits / function keys / named keys, requires snake_case action_id, and emits a translation key (key.<modid>.<action_id>) in the comment for the user's en_us.json.".into(),
        },
        FeatureInfo {
            kind: Screen,
            name: "Screen".into(),
            description: "GUI screens — inventories, menus, HUD overlays.".into(),
            category: "UI / Interaction".into(),
            status: Skeleton,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: false,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: None,
            editor_panel_id: None,
            notes: "Skeleton emits an AbstractContainerScreen subclass with TODO render method.".into(),
        },
        FeatureInfo {
            kind: Command,
            name: "Command".into(),
            description: "Server / client commands using the Brigadier dispatcher.".into(),
            category: "UI / Interaction".into(),
            status: Skeleton,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: false,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: None,
            editor_panel_id: None,
            notes: "Skeleton emits a RegisterCommandsEvent / CommandRegistrationCallback handler.".into(),
        },

        // ===== Runtime / Integration =====
        FeatureInfo {
            kind: EventHandler,
            name: "Event Handler".into(),
            description: "Forge @SubscribeEvent / Fabric callback handlers — generated from the visual node graph.".into(),
            category: "Runtime".into(),
            status: Complete,
            supported_loaders: vec!["forge".into(), "fabric".into()],
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: true,
            has_version_aware_generator: false,
            command_name: Some("generate_event_handlers".into()),
            editor_panel_id: Some("node-editor".into()),
            notes: "Visual graph -> AST -> JavaEmitter -> safeguards (loop limiter, NPE shield, thread dispatcher). Version-aware emitter pending.".into(),
        },
        FeatureInfo {
            kind: Mixin,
            name: "Mixin".into(),
            description: "Runtime bytecode patching for both loaders.".into(),
            category: "Runtime".into(),
            status: Skeleton,
            supported_loaders: vec!["forge".into(), "fabric".into(), "neoforge".into(), "quilt".into()],
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: false,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: None,
            editor_panel_id: None,
            notes: "Skeleton emits a Mixin class + matching mixins.json fragment with TODO target methods.".into(),
        },
        FeatureInfo {
            kind: JeiIntegration,
            name: "JEI Integration".into(),
            description: "JEI / REI / EMI plugin classes registering recipe categories.".into(),
            category: "Runtime".into(),
            status: Skeleton,
            supported_loaders: vec!["forge".into(), "fabric".into()],
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: false,
            has_dependency_resolver: false,
            has_version_aware_generator: false,
            command_name: None,
            editor_panel_id: None,
            notes: "Skeleton emits a @JeiPlugin class with a TODO registerCategories.".into(),
        },
        FeatureInfo {
            kind: DependencyIntegration,
            name: "Dependency Integration".into(),
            description: "Adds a third-party mod (Architectury, Curios, Patchouli, GeckoLib, JEI, REI) to the build.".into(),
            category: "Runtime".into(),
            status: Complete,
            supported_loaders: loaders_all(),
            supported_mc_versions: mc_versions_common(),
            has_template: true,
            has_validator: true,
            has_dependency_resolver: true,
            has_version_aware_generator: true,
            command_name: Some("resolve_dependency".into()),
            editor_panel_id: None,
            notes: "Resolver knows GeckoLib, JEI, REI, Patchouli, Curios, Architectury across Forge / Fabric / NeoForge for the supported MC versions. Returns a ready-to-paste Gradle snippet with the right repository + dep line per loader (modImplementation vs implementation fg.deobf).".into(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Catches the "added a FeatureKind variant but forgot to update
    /// `all_features()`" mistake — Rust's match-exhaustiveness does not
    /// help us here because `all_features` constructs a Vec, not matches.
    #[test]
    fn every_feature_kind_appears_in_catalog() {
        let known_slugs = [
            FeatureKind::Block,
            FeatureKind::Item,
            FeatureKind::Tool,
            FeatureKind::Armor,
            FeatureKind::Food,
            FeatureKind::Enchantment,
            FeatureKind::Entity,
            FeatureKind::GeckolibAnimation,
            FeatureKind::Biome,
            FeatureKind::Dimension,
            FeatureKind::WorldgenFeature,
            FeatureKind::Recipe,
            FeatureKind::LootTable,
            FeatureKind::Advancement,
            FeatureKind::Sound,
            FeatureKind::Texture,
            FeatureKind::Model,
            FeatureKind::Config,
            FeatureKind::Keybind,
            FeatureKind::Screen,
            FeatureKind::Command,
            FeatureKind::EventHandler,
            FeatureKind::Mixin,
            FeatureKind::JeiIntegration,
            FeatureKind::DependencyIntegration,
        ];
        let catalog = all_features();
        for k in known_slugs {
            assert!(
                catalog.iter().any(|f| f.kind == k),
                "FeatureKind::{:?} is missing from all_features()",
                k
            );
        }
        assert_eq!(
            catalog.len(),
            known_slugs.len(),
            "Catalog has duplicates or extra entries"
        );
    }
}
