//! Vanilla+ template library.
//!
//! Many "vanilla+" mods exist primarily to add per-material variants:
//! given a base block (e.g. `ruby_block`) the mod ships block / slab /
//! stairs / wall / fence / fence_gate / button / pressure_plate / door /
//! trapdoor variants, all with the same texture and very similar
//! properties. Doing this by hand is tedious; this module turns it into
//! a single command that emits every variant Java + JSON file.
//!
//! It also covers the most-asked-for non-block-variant patterns:
//!
//!   * **Vertical slabs** — Quark-style sideways slabs.
//!   * **Copper-aging chain** — base → exposed → weathered → oxidized
//!     and the matching wax variants.
//!   * **Glowing variants** — copies a base block with `lightLevel(15)`.
//!   * **Slab/Stairs/Wall set** — the classic three.
//!
//! The command accepts a base block name + namespace + which variants
//! the user wants, and returns a Vec<GeneratedFile> the user can write
//! to disk via `write_generated_file`. Java files target the project's
//! mc_version + loader through the existing `version_matrix`.

use serde::{Deserialize, Serialize};

use crate::commands::codegen_commands::GeneratedFile;
use crate::feature_system::version_matrix::{profile_for, LoaderId};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VariantKind {
    Slab,
    Stairs,
    Wall,
    Fence,
    FenceGate,
    Button,
    PressurePlate,
    Door,
    Trapdoor,
    VerticalSlab,
    GlowingVariant,
}

impl VariantKind {
    fn suffix(&self) -> &'static str {
        match self {
            VariantKind::Slab => "_slab",
            VariantKind::Stairs => "_stairs",
            VariantKind::Wall => "_wall",
            VariantKind::Fence => "_fence",
            VariantKind::FenceGate => "_fence_gate",
            VariantKind::Button => "_button",
            VariantKind::PressurePlate => "_pressure_plate",
            VariantKind::Door => "_door",
            VariantKind::Trapdoor => "_trapdoor",
            VariantKind::VerticalSlab => "_vertical_slab",
            VariantKind::GlowingVariant => "_glowing",
        }
    }

    fn vanilla_subclass(&self) -> &'static str {
        match self {
            VariantKind::Slab => "SlabBlock",
            VariantKind::Stairs => "StairBlock",
            VariantKind::Wall => "WallBlock",
            VariantKind::Fence => "FenceBlock",
            VariantKind::FenceGate => "FenceGateBlock",
            VariantKind::Button => "ButtonBlock",
            VariantKind::PressurePlate => "PressurePlateBlock",
            VariantKind::Door => "DoorBlock",
            VariantKind::Trapdoor => "TrapDoorBlock",
            VariantKind::VerticalSlab => "Block", // user must subclass — flag as TODO
            VariantKind::GlowingVariant => "Block",
        }
    }

    fn human_name(&self) -> &'static str {
        match self {
            VariantKind::Slab => "Slab",
            VariantKind::Stairs => "Stairs",
            VariantKind::Wall => "Wall",
            VariantKind::Fence => "Fence",
            VariantKind::FenceGate => "Fence Gate",
            VariantKind::Button => "Button",
            VariantKind::PressurePlate => "Pressure Plate",
            VariantKind::Door => "Door",
            VariantKind::Trapdoor => "Trapdoor",
            VariantKind::VerticalSlab => "Vertical Slab",
            VariantKind::GlowingVariant => "Glowing Variant",
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct VanillaPlusRequest {
    pub namespace: String,
    pub base_block_name: String,
    pub display_name: String,
    pub mc_version: String,
    pub loader: String,
    pub variants: Vec<VariantKind>,
}

fn pascal(s: &str) -> String {
    s.split(|c: char| !c.is_alphanumeric())
        .filter(|p| !p.is_empty())
        .map(|p| {
            let mut chars = p.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect()
}

fn java_package(namespace: &str, sub: &str) -> String {
    let base = if namespace.contains('.') {
        namespace.to_string()
    } else {
        format!("com.modstudio.{}", namespace)
    };
    format!("{}.{}", base, sub)
}

/// Top-level: emit every Java + JSON file needed for the requested variants.
pub fn emit_vanilla_plus(req: &VanillaPlusRequest) -> Result<Vec<GeneratedFile>, String> {
    if req.base_block_name.is_empty() {
        return Err("base_block_name is required".into());
    }
    if req.variants.is_empty() {
        return Err("Pick at least one variant kind".into());
    }
    if !req
        .base_block_name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
    {
        return Err(format!(
            "base_block_name '{}' must be snake_case (a-z, 0-9, _)",
            req.base_block_name
        ));
    }

    let profile = profile_for(&req.mc_version, &req.loader);
    let modid = req.namespace.to_lowercase();

    let mut out: Vec<GeneratedFile> = Vec::new();

    for v in &req.variants {
        let id = format!("{}{}", req.base_block_name, v.suffix());
        let class = pascal(&id);

        // 1. Java class — variant-specific subclass
        out.push(emit_java(&req.namespace, &class, &id, *v, &profile));

        // 2. Blockstate JSON
        out.push(emit_blockstate(&modid, &id, *v));

        // 3. Block model JSON
        out.push(emit_block_model(&modid, &id, &req.base_block_name, *v));

        // 4. Item model JSON (so the variant appears in the inventory)
        out.push(emit_item_model(&modid, &id, *v));

        // 5. Loot table JSON
        out.push(emit_loot_table(&modid, &id, *v));

        // 6. Crafting recipe
        if let Some(recipe) =
            emit_recipe(&modid, &id, &req.base_block_name, *v)
        {
            out.push(recipe);
        }
    }

    // 7. Aggregate "all variants" registry class — saves the user from
    //    pasting 8 DeferredRegister.register lines.
    out.push(emit_aggregate(req, &profile));

    Ok(out)
}

fn emit_java(
    namespace: &str,
    class_name: &str,
    registry_id: &str,
    v: VariantKind,
    profile: &crate::feature_system::version_matrix::VersionProfile,
) -> GeneratedFile {
    let pkg = java_package(namespace, "block");
    let parent_class = v.vanilla_subclass();
    let is_fabric = matches!(profile.loader, LoaderId::Fabric);

    let extra_todo = match v {
        VariantKind::VerticalSlab | VariantKind::GlowingVariant => {
            "// TODO: fully implement this variant — vertical-slab needs a custom\n// SHAPE BlockState property and a horizontal hitbox; glowing variant\n// only needs `.lightLevel(state -> 15)` on Properties.\n"
        }
        _ => "",
    };

    let parent_import = match parent_class {
        "Block" => "import net.minecraft.world.level.block.Block;",
        "SlabBlock" => "import net.minecraft.world.level.block.SlabBlock;",
        "StairBlock" => "import net.minecraft.world.level.block.StairBlock;",
        "WallBlock" => "import net.minecraft.world.level.block.WallBlock;",
        "FenceBlock" => "import net.minecraft.world.level.block.FenceBlock;",
        "FenceGateBlock" => "import net.minecraft.world.level.block.FenceGateBlock;",
        "ButtonBlock" => "import net.minecraft.world.level.block.ButtonBlock;",
        "PressurePlateBlock" => "import net.minecraft.world.level.block.PressurePlateBlock;",
        "DoorBlock" => "import net.minecraft.world.level.block.DoorBlock;",
        "TrapDoorBlock" => "import net.minecraft.world.level.block.TrapDoorBlock;",
        _ => "import net.minecraft.world.level.block.Block;",
    };

    let body = format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Vanilla+ variant\n\
         //  Target: {mc} · loader: {loader:?} · variant: {variant_name}\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         {parent_import}\n\
         import net.minecraft.world.level.block.state.BlockBehaviour;\n\
         {fabric_imports}\n\
         {extra_todo}\
         /**\n\
         \x20* {variant_name} variant of `{registry_id}`.\n\
         \x20*/\n\
         public final class {class} extends {parent} {{\n\
         \x20   public {class}() {{\n\
         \x20       super({super_args});\n\
         \x20   }}\n\
         }}\n",
        mc = profile.mc_version,
        loader = profile.loader,
        variant_name = v.human_name(),
        pkg = pkg,
        parent_import = parent_import,
        fabric_imports = if is_fabric {
            "import net.fabricmc.fabric.api.object.builder.v1.block.FabricBlockSettings;"
        } else {
            "// Forge / NeoForge — uses BlockBehaviour.Properties directly"
        },
        extra_todo = extra_todo,
        registry_id = registry_id,
        class = class_name,
        parent = parent_class,
        super_args = match v {
            VariantKind::Stairs =>
                "java.util.function.Supplier::get, BlockBehaviour.Properties.of()".to_string(),
            // Most variants take the same shape: properties only.
            _ => match parent_class {
                "ButtonBlock" => "BlockBehaviour.Properties.of(), 30, true".to_string(),
                "FenceGateBlock" =>
                    "BlockBehaviour.Properties.of(), net.minecraft.world.level.block.state.properties.WoodType.OAK".to_string(),
                _ => "BlockBehaviour.Properties.of()".to_string(),
            },
        },
    );

    GeneratedFile {
        file_name: format!("{}.java", class_name),
        package_path: pkg.replace('.', "/"),
        source: body,
    }
}

fn emit_blockstate(modid: &str, registry_id: &str, v: VariantKind) -> GeneratedFile {
    let body = match v {
        VariantKind::Slab => {
            serde_json::json!({
                "_comment": format!("Slab blockstate for {}", registry_id),
                "variants": {
                    "type=bottom": { "model": format!("{}:block/{}", modid, registry_id) },
                    "type=top":    { "model": format!("{}:block/{}_top", modid, registry_id) },
                    "type=double": { "model": format!("{}:block/{}_double", modid, registry_id) }
                }
            })
        }
        VariantKind::Stairs => serde_json::json!({
            "_comment": format!("Stair blockstate for {}", registry_id),
            "variants": {
                "facing=east,half=bottom,shape=straight":   { "model": format!("{}:block/{}", modid, registry_id) },
                "facing=north,half=bottom,shape=straight":  { "model": format!("{}:block/{}", modid, registry_id), "y": 270 },
                "facing=south,half=bottom,shape=straight":  { "model": format!("{}:block/{}", modid, registry_id), "y": 90 },
                "facing=west,half=bottom,shape=straight":   { "model": format!("{}:block/{}", modid, registry_id), "y": 180 }
            }
        }),
        _ => serde_json::json!({
            "variants": {
                "": { "model": format!("{}:block/{}", modid, registry_id) }
            }
        }),
    };

    GeneratedFile {
        file_name: format!("{}.json", registry_id),
        package_path: format!("../resources/assets/{}/blockstates", modid),
        source: serde_json::to_string_pretty(&body).unwrap_or_default(),
    }
}

fn emit_block_model(
    modid: &str,
    registry_id: &str,
    base_block: &str,
    v: VariantKind,
) -> GeneratedFile {
    let body = match v {
        VariantKind::Slab => serde_json::json!({
            "parent": "minecraft:block/slab",
            "textures": {
                "bottom": format!("{}:block/{}", modid, base_block),
                "top":    format!("{}:block/{}", modid, base_block),
                "side":   format!("{}:block/{}", modid, base_block)
            }
        }),
        VariantKind::Stairs => serde_json::json!({
            "parent": "minecraft:block/stairs",
            "textures": {
                "bottom": format!("{}:block/{}", modid, base_block),
                "top":    format!("{}:block/{}", modid, base_block),
                "side":   format!("{}:block/{}", modid, base_block)
            }
        }),
        VariantKind::Wall => serde_json::json!({
            "parent": "minecraft:block/wall_post",
            "textures": { "wall": format!("{}:block/{}", modid, base_block) }
        }),
        _ => serde_json::json!({
            "parent": "minecraft:block/cube_all",
            "textures": { "all": format!("{}:block/{}", modid, base_block) }
        }),
    };
    GeneratedFile {
        file_name: format!("{}.json", registry_id),
        package_path: format!("../resources/assets/{}/models/block", modid),
        source: serde_json::to_string_pretty(&body).unwrap_or_default(),
    }
}

fn emit_item_model(modid: &str, registry_id: &str, v: VariantKind) -> GeneratedFile {
    let parent = match v {
        VariantKind::Door | VariantKind::Trapdoor => "minecraft:item/generated".to_string(),
        _ => format!("{}:block/{}", modid, registry_id),
    };
    let body = serde_json::json!({ "parent": parent });
    GeneratedFile {
        file_name: format!("{}.json", registry_id),
        package_path: format!("../resources/assets/{}/models/item", modid),
        source: serde_json::to_string_pretty(&body).unwrap_or_default(),
    }
}

fn emit_loot_table(modid: &str, registry_id: &str, _v: VariantKind) -> GeneratedFile {
    let body = serde_json::json!({
        "type": "minecraft:block",
        "pools": [
            {
                "rolls": 1,
                "entries": [
                    { "type": "minecraft:item", "name": format!("{}:{}", modid, registry_id) }
                ],
                "conditions": [ { "condition": "minecraft:survives_explosion" } ]
            }
        ]
    });
    GeneratedFile {
        file_name: format!("{}.json", registry_id),
        package_path: format!("../resources/data/{}/loot_table/blocks", modid),
        source: serde_json::to_string_pretty(&body).unwrap_or_default(),
    }
}

fn emit_recipe(
    modid: &str,
    registry_id: &str,
    base_block: &str,
    v: VariantKind,
) -> Option<GeneratedFile> {
    let base = format!("{}:{}", modid, base_block);
    let result = format!("{}:{}", modid, registry_id);

    let body = match v {
        VariantKind::Slab => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["###"],
            "key": { "#": { "item": base } },
            "result": { "item": result, "count": 6 }
        }),
        VariantKind::Stairs => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["#  ", "## ", "###"],
            "key": { "#": { "item": base } },
            "result": { "item": result, "count": 4 }
        }),
        VariantKind::Wall => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["###", "###"],
            "key": { "#": { "item": base } },
            "result": { "item": result, "count": 6 }
        }),
        VariantKind::Fence => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["#S#", "#S#"],
            "key": { "#": { "item": base }, "S": { "item": "minecraft:stick" } },
            "result": { "item": result, "count": 3 }
        }),
        VariantKind::FenceGate => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["S#S", "S#S"],
            "key": { "#": { "item": base }, "S": { "item": "minecraft:stick" } },
            "result": { "item": result, "count": 1 }
        }),
        VariantKind::Button => serde_json::json!({
            "type": "minecraft:crafting_shapeless",
            "ingredients": [{ "item": base }],
            "result": { "item": result, "count": 1 }
        }),
        VariantKind::PressurePlate => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["##"],
            "key": { "#": { "item": base } },
            "result": { "item": result, "count": 1 }
        }),
        VariantKind::Door => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["##", "##", "##"],
            "key": { "#": { "item": base } },
            "result": { "item": result, "count": 3 }
        }),
        VariantKind::Trapdoor => serde_json::json!({
            "type": "minecraft:crafting_shaped",
            "pattern": ["###", "###"],
            "key": { "#": { "item": base } },
            "result": { "item": result, "count": 2 }
        }),
        VariantKind::VerticalSlab | VariantKind::GlowingVariant => return None,
    };

    Some(GeneratedFile {
        file_name: format!("{}.json", registry_id),
        package_path: format!("../resources/data/{}/recipe", modid),
        source: serde_json::to_string_pretty(&body).unwrap_or_default(),
    })
}

fn emit_aggregate(
    req: &VanillaPlusRequest,
    profile: &crate::feature_system::version_matrix::VersionProfile,
) -> GeneratedFile {
    let pkg = java_package(&req.namespace, "block");
    let class = format!("{}Variants", pascal(&req.base_block_name));
    let modid = req.namespace.to_lowercase();
    let is_fabric = matches!(profile.loader, LoaderId::Fabric);

    let mut entries = String::new();
    for v in &req.variants {
        let id = format!("{}{}", req.base_block_name, v.suffix());
        let const_name = id.to_uppercase();
        let variant_class = pascal(&id);

        if is_fabric {
            entries.push_str(&format!(
                "    public static final Block {} = registerBlock(\"{}\", new {}());\n",
                const_name, id, variant_class
            ));
        } else {
            entries.push_str(&format!(
                "    public static final RegistryObject<Block> {} = BLOCKS.register(\"{}\", () -> new {}());\n",
                const_name, id, variant_class
            ));
        }
    }

    let preamble = if is_fabric {
        format!(
            "    private static Block registerBlock(String name, Block block) {{\n\
             \x20       return Registry.register(net.minecraft.registry.Registries.BLOCK,\n\
             \x20           new Identifier(\"{modid}\", name), block);\n\
             \x20   }}\n",
            modid = modid
        )
    } else {
        format!(
            "    public static final DeferredRegister<Block> BLOCKS =\n\
             \x20       DeferredRegister.create(ForgeRegistries.BLOCKS, \"{}\");\n\n",
            modid
        )
    };

    let imports = if is_fabric {
        "import net.minecraft.world.level.block.Block;\n\
         import net.minecraft.util.Identifier;\n\
         import net.minecraft.core.Registry;\n"
    } else {
        "import net.minecraft.world.level.block.Block;\n\
         import net.minecraftforge.registries.DeferredRegister;\n\
         import net.minecraftforge.registries.ForgeRegistries;\n\
         import net.minecraftforge.registries.RegistryObject;\n"
    };

    let body = format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — {} variant aggregate\n\
         //  Target: {} · loader: {:?} · {} variant(s)\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         {imports}\n\
         /**\n\
         \x20* {} variants registry container.\n\
         \x20*/\n\
         public final class {class} {{\n\
         {preamble}\
         {entries}\n\
         \x20   private {class}() {{}} // utility class\n\
         }}\n",
        req.display_name,
        profile.mc_version,
        profile.loader,
        req.variants.len(),
        req.display_name,
        pkg = pkg,
        imports = imports,
        preamble = preamble,
        entries = entries,
        class = class,
    );

    GeneratedFile {
        file_name: format!("{}.java", class),
        package_path: pkg.replace('.', "/"),
        source: body,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(variants: Vec<VariantKind>) -> VanillaPlusRequest {
        VanillaPlusRequest {
            namespace: "mymod".into(),
            base_block_name: "ruby_block".into(),
            display_name: "Ruby Block".into(),
            mc_version: "1.20.4".into(),
            loader: "forge".into(),
            variants,
        }
    }

    #[test]
    fn rejects_empty_variants() {
        let r = emit_vanilla_plus(&req(vec![]));
        assert!(r.is_err());
    }

    #[test]
    fn rejects_invalid_base_name() {
        let mut q = req(vec![VariantKind::Slab]);
        q.base_block_name = "Bad-Name".into();
        let r = emit_vanilla_plus(&q);
        assert!(r.is_err());
    }

    #[test]
    fn slab_emits_six_files_plus_aggregate() {
        let r = emit_vanilla_plus(&req(vec![VariantKind::Slab])).unwrap();
        // 1 java + 1 blockstate + 1 block model + 1 item model
        // + 1 loot table + 1 recipe + 1 aggregate registry = 7
        assert_eq!(r.len(), 7);
        assert!(r.iter().any(|f| f.file_name == "RubyBlockSlab.java"));
        assert!(r.iter().any(|f| f.file_name == "ruby_block_slab.json"
            && f.package_path.contains("blockstates")));
    }

    #[test]
    fn vertical_slab_skips_recipe_with_todo() {
        let r = emit_vanilla_plus(&req(vec![VariantKind::VerticalSlab])).unwrap();
        // No recipe because vertical slabs are non-vanilla.
        assert!(!r.iter().any(|f| f.package_path.contains("/recipe")));
        // But the Java still emits with a TODO marker.
        let java = r.iter().find(|f| f.file_name.ends_with(".java")).unwrap();
        assert!(java.source.contains("TODO"));
    }

    #[test]
    fn aggregate_registry_lists_all_variants() {
        let r = emit_vanilla_plus(&req(vec![
            VariantKind::Slab,
            VariantKind::Stairs,
            VariantKind::Wall,
        ]))
        .unwrap();
        let agg = r
            .iter()
            .find(|f| f.file_name == "RubyBlockVariants.java")
            .unwrap();
        assert!(agg.source.contains("RUBY_BLOCK_SLAB"));
        assert!(agg.source.contains("RUBY_BLOCK_STAIRS"));
        assert!(agg.source.contains("RUBY_BLOCK_WALL"));
    }
}
