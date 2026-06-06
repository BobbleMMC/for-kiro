//! Loot table commands — promotes the LootTable row in the Feature
//! Catalog from Skeleton to Complete.
//!
//! A loot table in Minecraft is a JSON file under
//! `data/<modid>/loot_table/<sub>/<name>.json` that describes what
//! drops from a block / entity / chest / fishing rod. The format is
//! verbose (pools → entries → conditions → functions) and easy to get
//! wrong: a single mis-cased field name silently produces empty drops
//! at runtime, with no error.
//!
//! This module gives the studio a real generator. The user creates an
//! asset (`asset_type = "loot_table"`) via the existing registry CRUD,
//! the editor saves a structured `LootTableMeta` payload, and this
//! module turns it into the exact wire format Minecraft expects.
//!
//! The output path depends on the table's `kind`:
//!
//!   block    → data/<modid>/loot_table/blocks/<name>.json
//!   entity   → data/<modid>/loot_table/entities/<name>.json
//!   chest    → data/<modid>/loot_table/chests/<name>.json
//!   fishing  → data/<modid>/loot_table/gameplay/fishing/<name>.json
//!   gift     → data/<modid>/loot_table/gameplay/hero_of_the_village/<name>.json
//!   generic  → data/<modid>/loot_table/<name>.json
//!
//! Validation enforces every constraint the vanilla loader checks at
//! runtime, so users see human-readable error messages at codegen time
//! instead of silent in-game empty drops.

use serde::Deserialize;
use tauri::State;

use crate::commands::codegen_commands::GeneratedFile;
use super::project_commands::DbState;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LootKind {
    Block,
    Entity,
    Chest,
    Fishing,
    Gift,
    Generic,
}

impl LootKind {
    fn from_str(s: &str) -> Option<LootKind> {
        match s.trim().to_ascii_lowercase().as_str() {
            "block" => Some(LootKind::Block),
            "entity" => Some(LootKind::Entity),
            "chest" => Some(LootKind::Chest),
            "fishing" => Some(LootKind::Fishing),
            "gift" | "hero_of_the_village" => Some(LootKind::Gift),
            "generic" | "" => Some(LootKind::Generic),
            _ => None,
        }
    }
    fn type_str(&self) -> &'static str {
        match self {
            LootKind::Block => "minecraft:block",
            LootKind::Entity => "minecraft:entity",
            LootKind::Chest => "minecraft:chest",
            LootKind::Fishing => "minecraft:fishing",
            LootKind::Gift => "minecraft:gift",
            LootKind::Generic => "minecraft:generic",
        }
    }
    fn sub_path(&self) -> &'static str {
        match self {
            LootKind::Block => "blocks",
            LootKind::Entity => "entities",
            LootKind::Chest => "chests",
            LootKind::Fishing => "gameplay/fishing",
            LootKind::Gift => "gameplay/hero_of_the_village",
            LootKind::Generic => "",
        }
    }
}

/// Top-level loot table metadata, mirroring what the React editor
/// persists in the registry-table `metadata` blob.
#[derive(Debug, Default, Deserialize)]
pub struct LootTableMeta {
    /// Loot table kind. See `LootKind`.
    #[serde(default)]
    pub kind: String,

    /// Pools to emit. Must be non-empty.
    #[serde(default)]
    pub pools: Vec<PoolMeta>,
}

#[derive(Debug, Default, Deserialize)]
pub struct PoolMeta {
    /// Either a constant integer or a uniform/binomial range.
    #[serde(default)]
    pub rolls: RollsMeta,

    /// Optional bonus rolls (rolls awarded per luck level).
    #[serde(default)]
    pub bonus_rolls: Option<RollsMeta>,

    /// Entries the pool can produce. Must be non-empty.
    #[serde(default)]
    pub entries: Vec<EntryMeta>,

    /// Optional conditions on the pool itself.
    #[serde(default)]
    pub conditions: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum RollsMeta {
    Constant(f64),
    Range {
        min: f64,
        max: f64,
        #[serde(default = "default_range_type")]
        range_type: String, // uniform / binomial / constant
    },
}

fn default_range_type() -> String {
    "uniform".into()
}

impl Default for RollsMeta {
    fn default() -> Self {
        RollsMeta::Constant(1.0)
    }
}

impl RollsMeta {
    fn to_json(&self) -> serde_json::Value {
        match self {
            RollsMeta::Constant(n) => serde_json::json!(*n),
            RollsMeta::Range {
                min,
                max,
                range_type,
            } => {
                let prefix = if range_type == "binomial" {
                    "minecraft:binomial"
                } else if range_type == "constant" {
                    "minecraft:constant"
                } else {
                    "minecraft:uniform"
                };
                serde_json::json!({
                    "type": prefix,
                    "min": min,
                    "max": max
                })
            }
        }
    }
    fn validate(&self, label: &str) -> Result<(), String> {
        match self {
            RollsMeta::Constant(n) if *n < 0.0 => {
                Err(format!("{} rolls must be >= 0, got {}", label, n))
            }
            RollsMeta::Range { min, max, .. } if min > max => Err(format!(
                "{} rolls min ({}) must be <= max ({})",
                label, min, max
            )),
            RollsMeta::Range { min, .. } if *min < 0.0 => {
                Err(format!("{} rolls min must be >= 0, got {}", label, min))
            }
            _ => Ok(()),
        }
    }
}

/// Entry within a pool. Discriminated by `entry_type`.
#[derive(Debug, Default, Deserialize)]
pub struct EntryMeta {
    /// `item` / `tag` / `loot_table` / `empty` / `dynamic` / `alternatives` / `group` / `sequence`.
    #[serde(default = "default_entry_type")]
    pub entry_type: String,

    /// Identifier for `item` / `tag` / `loot_table` / `dynamic`.
    /// Not used for `empty`.
    #[serde(default)]
    pub name: String,

    /// Relative weight; defaults to 1 if omitted.
    #[serde(default = "default_weight")]
    pub weight: i32,

    /// Per-level luck bonus; defaults to 0.
    #[serde(default)]
    pub quality: i32,

    /// Optional count function (constant or uniform). When set,
    /// translates to `minecraft:set_count` in the function list.
    #[serde(default)]
    pub count: Option<RollsMeta>,

    /// Optional entry-level conditions.
    #[serde(default)]
    pub conditions: Vec<serde_json::Value>,

    /// Optional entry-level functions (e.g. enchant_with_levels).
    /// Pass-through — the studio does not validate these.
    #[serde(default)]
    pub functions: Vec<serde_json::Value>,

    /// Children for composite entries (alternatives / group / sequence).
    #[serde(default)]
    pub children: Vec<EntryMeta>,
}

fn default_entry_type() -> String {
    "item".into()
}
fn default_weight() -> i32 {
    1
}

const VALID_ENTRY_TYPES: [&str; 8] = [
    "item",
    "tag",
    "loot_table",
    "empty",
    "dynamic",
    "alternatives",
    "group",
    "sequence",
];

fn validate_meta(meta: &LootTableMeta, kind: LootKind) -> Result<(), String> {
    if meta.pools.is_empty() {
        return Err("Loot table must define at least one pool".into());
    }
    for (i, pool) in meta.pools.iter().enumerate() {
        let label = format!("pool[{}]", i);
        pool.rolls.validate(&label)?;
        if let Some(b) = &pool.bonus_rolls {
            b.validate(&format!("{} bonus_rolls", label))?;
        }
        if pool.entries.is_empty() {
            return Err(format!("{} must have at least one entry", label));
        }
        for (j, entry) in pool.entries.iter().enumerate() {
            validate_entry(entry, kind, &format!("{}.entries[{}]", label, j))?;
        }
    }
    Ok(())
}

fn validate_entry(entry: &EntryMeta, _kind: LootKind, label: &str) -> Result<(), String> {
    if !VALID_ENTRY_TYPES.contains(&entry.entry_type.as_str()) {
        return Err(format!(
            "{} entry_type '{}' must be one of {}",
            label,
            entry.entry_type,
            VALID_ENTRY_TYPES.join("/")
        ));
    }
    let needs_name = matches!(
        entry.entry_type.as_str(),
        "item" | "tag" | "loot_table" | "dynamic"
    );
    if needs_name && entry.name.trim().is_empty() {
        return Err(format!(
            "{} entry_type='{}' requires `name` (e.g. \"minecraft:diamond\")",
            label, entry.entry_type
        ));
    }
    if entry.weight < 1 {
        return Err(format!(
            "{} weight must be >= 1, got {}",
            label, entry.weight
        ));
    }
    if let Some(count) = &entry.count {
        count.validate(&format!("{}.count", label))?;
    }
    let composite = matches!(
        entry.entry_type.as_str(),
        "alternatives" | "group" | "sequence"
    );
    if composite && entry.children.is_empty() {
        return Err(format!(
            "{} composite entry '{}' must have at least one child",
            label, entry.entry_type
        ));
    }
    for (k, child) in entry.children.iter().enumerate() {
        validate_entry(child, _kind, &format!("{}.children[{}]", label, k))?;
    }
    Ok(())
}

// ============================================================================
// JSON emission
// ============================================================================

fn entry_json(entry: &EntryMeta) -> serde_json::Value {
    use serde_json::json;
    let mut out = serde_json::Map::new();
    out.insert(
        "type".into(),
        json!(format!("minecraft:{}", entry.entry_type)),
    );
    if !entry.name.is_empty() {
        out.insert("name".into(), json!(entry.name));
    }
    if entry.weight != 1 {
        out.insert("weight".into(), json!(entry.weight));
    }
    if entry.quality != 0 {
        out.insert("quality".into(), json!(entry.quality));
    }
    let mut functions: Vec<serde_json::Value> = entry.functions.clone();
    if let Some(count) = &entry.count {
        functions.push(json!({
            "function": "minecraft:set_count",
            "count": count.to_json(),
            "add": false
        }));
    }
    if !functions.is_empty() {
        out.insert("functions".into(), json!(functions));
    }
    if !entry.conditions.is_empty() {
        out.insert("conditions".into(), json!(entry.conditions));
    }
    if !entry.children.is_empty() {
        let kids: Vec<serde_json::Value> = entry.children.iter().map(entry_json).collect();
        out.insert("children".into(), json!(kids));
    }
    serde_json::Value::Object(out)
}

fn pool_json(pool: &PoolMeta) -> serde_json::Value {
    use serde_json::json;
    let mut out = serde_json::Map::new();
    out.insert("rolls".into(), pool.rolls.to_json());
    if let Some(bonus) = &pool.bonus_rolls {
        out.insert("bonus_rolls".into(), bonus.to_json());
    }
    let entries: Vec<serde_json::Value> = pool.entries.iter().map(entry_json).collect();
    out.insert("entries".into(), json!(entries));
    if !pool.conditions.is_empty() {
        out.insert("conditions".into(), json!(pool.conditions));
    }
    serde_json::Value::Object(out)
}

fn loot_table_json(asset_name: &str, kind: LootKind, meta: &LootTableMeta) -> serde_json::Value {
    use serde_json::json;
    let pools: Vec<serde_json::Value> = meta.pools.iter().map(pool_json).collect();
    json!({
        "_comment": format!(
            "Generated by Minecraft Mod Studio. Loot table '{}' (kind={:?}).",
            asset_name, kind
        ),
        "type": kind.type_str(),
        "pools": pools
    })
}

// ============================================================================
// Tauri command
// ============================================================================

#[tauri::command]
pub async fn generate_loot_table_json(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<GeneratedFile, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;

    if asset.asset_type != "loot_table" {
        return Err(format!(
            "Asset {} is not a loot_table (got '{}')",
            asset_id, asset.asset_type
        ));
    }
    if !asset
        .asset_name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '/')
    {
        return Err(format!(
            "Loot table asset_name '{}' must match ^[a-z0-9_/]+\\$",
            asset.asset_name
        ));
    }

    let meta: LootTableMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse loot_table metadata: {}", e))?
        .unwrap_or_default();

    let kind = LootKind::from_str(&meta.kind).ok_or_else(|| {
        format!(
            "Loot table kind '{}' must be one of block/entity/chest/fishing/gift/generic",
            meta.kind
        )
    })?;
    validate_meta(&meta, kind)?;

    let modid = asset.namespace.to_lowercase();
    let json = loot_table_json(&asset.asset_name, kind, &meta);
    let sub = kind.sub_path();
    let pkg = if sub.is_empty() {
        format!("../resources/data/{}/loot_table", modid)
    } else {
        format!("../resources/data/{}/loot_table/{}", modid, sub)
    };

    Ok(GeneratedFile {
        file_name: format!("{}.json", asset.asset_name),
        package_path: pkg,
        source: serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn diamond_pool() -> PoolMeta {
        PoolMeta {
            rolls: RollsMeta::Constant(1.0),
            bonus_rolls: None,
            entries: vec![EntryMeta {
                entry_type: "item".into(),
                name: "minecraft:diamond".into(),
                weight: 1,
                quality: 0,
                count: Some(RollsMeta::Range {
                    min: 1.0,
                    max: 3.0,
                    range_type: "uniform".into(),
                }),
                conditions: vec![],
                functions: vec![],
                children: vec![],
            }],
            conditions: vec![],
        }
    }

    #[test]
    fn loot_kind_round_trip() {
        for k in [
            LootKind::Block,
            LootKind::Entity,
            LootKind::Chest,
            LootKind::Fishing,
            LootKind::Gift,
            LootKind::Generic,
        ] {
            let s = match k {
                LootKind::Block => "block",
                LootKind::Entity => "entity",
                LootKind::Chest => "chest",
                LootKind::Fishing => "fishing",
                LootKind::Gift => "gift",
                LootKind::Generic => "generic",
            };
            assert_eq!(LootKind::from_str(s), Some(k));
        }
        assert_eq!(LootKind::from_str("hero_of_the_village"), Some(LootKind::Gift));
        assert!(LootKind::from_str("piglin_bartering").is_none());
    }

    #[test]
    fn validate_rejects_empty_pools() {
        let meta = LootTableMeta {
            kind: "block".into(),
            pools: vec![],
        };
        assert!(validate_meta(&meta, LootKind::Block).is_err());
    }

    #[test]
    fn validate_rejects_pool_without_entries() {
        let meta = LootTableMeta {
            kind: "block".into(),
            pools: vec![PoolMeta {
                rolls: RollsMeta::Constant(1.0),
                bonus_rolls: None,
                entries: vec![],
                conditions: vec![],
            }],
        };
        assert!(validate_meta(&meta, LootKind::Block).is_err());
    }

    #[test]
    fn validate_rejects_unknown_entry_type() {
        let meta = LootTableMeta {
            kind: "block".into(),
            pools: vec![PoolMeta {
                rolls: RollsMeta::Constant(1.0),
                bonus_rolls: None,
                entries: vec![EntryMeta {
                    entry_type: "obsidian".into(), // not a valid kind
                    name: "minecraft:dirt".into(),
                    ..EntryMeta::default()
                }],
                conditions: vec![],
            }],
        };
        assert!(validate_meta(&meta, LootKind::Block).is_err());
    }

    #[test]
    fn validate_requires_name_for_item_entry() {
        let mut entry = EntryMeta::default();
        entry.entry_type = "item".into();
        entry.name = "".into();
        let meta = LootTableMeta {
            kind: "block".into(),
            pools: vec![PoolMeta {
                rolls: RollsMeta::Constant(1.0),
                bonus_rolls: None,
                entries: vec![entry],
                conditions: vec![],
            }],
        };
        assert!(validate_meta(&meta, LootKind::Block).is_err());
    }

    #[test]
    fn validate_rejects_inverted_roll_range() {
        let meta = LootTableMeta {
            kind: "chest".into(),
            pools: vec![PoolMeta {
                rolls: RollsMeta::Range {
                    min: 5.0,
                    max: 1.0,
                    range_type: "uniform".into(),
                },
                bonus_rolls: None,
                entries: vec![EntryMeta {
                    entry_type: "item".into(),
                    name: "minecraft:diamond".into(),
                    ..EntryMeta::default()
                }],
                conditions: vec![],
            }],
        };
        assert!(validate_meta(&meta, LootKind::Chest).is_err());
    }

    #[test]
    fn block_loot_table_emits_correct_type_and_pool_shape() {
        let meta = LootTableMeta {
            kind: "block".into(),
            pools: vec![diamond_pool()],
        };
        let json = loot_table_json("diamond_ore", LootKind::Block, &meta);
        let s = serde_json::to_string(&json).unwrap();
        assert!(s.contains("\"type\":\"minecraft:block\""), "got: {s}");
        assert!(s.contains("minecraft:diamond"), "got: {s}");
        assert!(s.contains("set_count"), "got: {s}");
        assert!(s.contains("minecraft:uniform"), "got: {s}");
    }

    #[test]
    fn rolls_constant_serialises_as_number() {
        let r = RollsMeta::Constant(3.0);
        let s = serde_json::to_string(&r.to_json()).unwrap();
        assert_eq!(s, "3.0");
    }

    #[test]
    fn rolls_range_serialises_with_type_field() {
        let r = RollsMeta::Range {
            min: 1.0,
            max: 4.0,
            range_type: "uniform".into(),
        };
        let s = serde_json::to_string(&r.to_json()).unwrap();
        assert!(s.contains("minecraft:uniform"));
        assert!(s.contains("\"min\":1.0"));
        assert!(s.contains("\"max\":4.0"));
    }

    #[test]
    fn composite_entry_requires_children() {
        let meta = LootTableMeta {
            kind: "chest".into(),
            pools: vec![PoolMeta {
                rolls: RollsMeta::Constant(1.0),
                bonus_rolls: None,
                entries: vec![EntryMeta {
                    entry_type: "alternatives".into(),
                    children: vec![],
                    ..EntryMeta::default()
                }],
                conditions: vec![],
            }],
        };
        assert!(validate_meta(&meta, LootKind::Chest).is_err());
    }

    #[test]
    fn loot_kind_sub_path() {
        assert_eq!(LootKind::Block.sub_path(), "blocks");
        assert_eq!(LootKind::Entity.sub_path(), "entities");
        assert_eq!(LootKind::Chest.sub_path(), "chests");
        assert_eq!(LootKind::Fishing.sub_path(), "gameplay/fishing");
        assert_eq!(LootKind::Gift.sub_path(), "gameplay/hero_of_the_village");
        assert_eq!(LootKind::Generic.sub_path(), "");
    }
}
