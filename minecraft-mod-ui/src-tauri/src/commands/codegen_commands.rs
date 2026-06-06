//! Tauri commands that bridge the Rust `codegen` module to the React UI.
//!
//! These commands let the frontend turn:
//!   * a saved visual node graph (`visual_nodes_data` row) into a Forge or
//!     Fabric event-handler `.java` source file, with safeguards applied;
//!   * a single Block / Item DB row into a starter Java class.
//!
//! All commands operate on data already persisted in the SQLite database;
//! the React side simply provides ids.

use tauri::State;

use crate::codegen::ast::parse_graph;
use crate::codegen::java_emitter::JavaEmitter;
use crate::codegen::safeguard::apply_all_safeguards;
use super::project_commands::DbState;

/// A generated Java source file ready to be written to disk or shown in
/// the in-app code preview pane.
#[derive(Debug, Clone, serde::Serialize)]
pub struct GeneratedFile {
    pub file_name: String,
    pub package_path: String, // e.g. "com/example/mymod/events"
    pub source: String,
}

/// Capitalize first character (mirror of the helper used in `java_emitter`).
fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Convert namespace to dotted Java package — `mymod` → `com.bobblemmc.mymod`.
/// We keep things simple: if the namespace already contains a dot we trust it,
/// otherwise we prefix `com.modstudio.` to avoid emitting a class in the
/// default package (which Java disallows for `public` classes used in Forge).
fn java_package(namespace: &str) -> String {
    if namespace.contains('.') {
        namespace.to_string()
    } else {
        format!("com.modstudio.{}", namespace)
    }
}

/// Convert a snake_case identifier to PascalCase for class names.
fn to_pascal_case(s: &str) -> String {
    s.split(|c: char| !c.is_alphanumeric())
        .filter(|seg| !seg.is_empty())
        .map(capitalize)
        .collect()
}

// ============================================================================
// Visual graph → Java event handler class
// ============================================================================

#[tauri::command]
pub async fn generate_event_handlers(
    db: State<'_, DbState>,
    graph_id: i64,
) -> Result<GeneratedFile, String> {
    // 1. Fetch the saved graph
    let graph = db
        .0
        .get_visual_graph(graph_id)
        .map_err(|e| format!("Failed to load graph: {}", e))?
        .ok_or_else(|| format!("Graph {} not found", graph_id))?;

    // 2. Fetch the parent project (for namespace + loader)
    let project = db
        .0
        .get_project(graph.project_id)
        .map_err(|e| format!("Failed to load project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", graph.project_id))?;

    // 3. Parse React Flow nodes/edges → AST
    let ast = parse_graph(&graph.nodes_json, &graph.edges_json)?;

    // 4. Emit Java source
    let class_name = to_pascal_case(&graph.graph_name).replace(' ', "");
    let class_name = if class_name.is_empty() {
        "ModEventHandlers".to_string()
    } else {
        class_name
    };

    let emitter = JavaEmitter::new(&project.namespace, &class_name, &project.mod_loader);
    let raw_source = emitter.emit(&ast);

    // 5. Apply runtime safeguards (loop limiter, NPE shield, thread dispatch)
    let final_source = apply_all_safeguards(&raw_source);

    // 6. Translate namespace into a slash-separated package path
    let package_path = java_package(&project.namespace).replace('.', "/") + "/events";

    Ok(GeneratedFile {
        file_name: format!("{}.java", class_name),
        package_path,
        source: final_source,
    })
}

// ============================================================================
// Block row → starter Java class
// ============================================================================

fn emit_block_class(
    namespace: &str,
    block_name: &str,
    display_name: &str,
    hardness: f64,
    resistance: f64,
    luminance: i32,
    has_gravity: bool,
    is_flammable: bool,
    material_type: &str,
    mod_loader: &str,
    mc_version: &str,
) -> String {
    use crate::feature_system::version_matrix::{profile_for, LoaderId};

    let profile = profile_for(mc_version, mod_loader);
    let class_name = to_pascal_case(block_name);
    let pkg = java_package(namespace);
    let constant = block_name.to_uppercase();
    let registry_id = block_name.to_lowercase();

    // Map material to Vanilla MapColor / SoundType for a sensible default.
    let (sound_type, map_color) = match material_type {
        "wood" => ("SoundType.WOOD", "MapColor.WOOD"),
        "metal" | "ore" => ("SoundType.METAL", "MapColor.METAL"),
        "glass" => ("SoundType.GLASS", "MapColor.NONE"),
        "fabric" => ("SoundType.WOOL", "MapColor.WOOL"),
        "dirt" => ("SoundType.GRAVEL", "MapColor.DIRT"),
        _ => ("SoundType.STONE", "MapColor.STONE"),
    };

    let is_fabric = matches!(profile.loader, LoaderId::Fabric);

    let loader_imports = if is_fabric {
        "import net.fabricmc.fabric.api.object.builder.v1.block.FabricBlockSettings;\n\
         import net.minecraft.util.Identifier;\n\
         import net.minecraft.core.registries.Registries;\n\
         import net.minecraft.core.Registry;\n"
    } else {
        match profile.loader {
            LoaderId::NeoForge => "import net.neoforged.neoforge.registries.DeferredRegister;\n\
                                   import net.neoforged.neoforge.registries.NeoForgeRegistries;\n\
                                   import net.neoforged.bus.api.IEventBus;\n",
            _ => "import net.minecraftforge.registries.DeferredRegister;\n\
                  import net.minecraftforge.registries.ForgeRegistries;\n\
                  import net.minecraftforge.registries.RegistryObject;\n",
        }
    };

    // Material.STONE arg in 1.19; nothing in 1.20+.
    let props_init = profile.block_properties_init;
    // mapColor was added in 1.20; older versions skip the line.
    let map_color_line = if profile.has_map_color_setter {
        format!("                .mapColor({})\n", map_color)
    } else {
        String::new()
    };

    let registration = if is_fabric {
        format!(
            "    public static final Block {const_name} = Registry.register(\n\
             \x20       net.minecraft.registry.Registries.BLOCK,\n\
             \x20       new Identifier(\"{ns}\", \"{rid}\"),\n\
             \x20       new Block({props_init}\n\
             {map_color_line}\
             \x20           .strength({hardness}f, {resistance}f)\n\
             \x20           .lightLevel(state -> {luminance})\n\
             \x20           .sound({sound})\n\
             {gravity}{fire}\
             \x20       )\n\
             \x20   );\n",
            const_name = constant,
            ns = namespace,
            rid = registry_id,
            props_init = props_init.replace("BlockBehaviour.Properties", "FabricBlockSettings"),
            map_color_line = map_color_line,
            hardness = hardness,
            resistance = resistance,
            luminance = luminance,
            sound = sound_type,
            gravity = if has_gravity { "            // gravity not in vanilla settings — implement FallingBlock subclass for true gravity\n" } else { "" },
            fire = if is_flammable { "            // flammability handled via FireBlock.setFireInfo\n" } else { "" },
        )
    } else {
        let registry_module = match profile.loader {
            LoaderId::NeoForge => "NeoForgeRegistries.BLOCKS",
            _ => "ForgeRegistries.BLOCKS",
        };
        format!(
            "    public static final DeferredRegister<Block> BLOCKS =\n\
             \x20       DeferredRegister.create({registry}, \"{ns}\");\n\n\
             \x20   public static final RegistryObject<Block> {const_name} =\n\
             \x20       BLOCKS.register(\"{rid}\", () -> new Block(\n\
             \x20           {props_init}\n\
             {map_color_line}\
             \x20               .strength({hardness}f, {resistance}f)\n\
             \x20               .lightLevel(state -> {luminance})\n\
             \x20               .sound({sound})\n\
             \x20       ));\n",
            registry = registry_module,
            ns = namespace,
            const_name = constant,
            rid = registry_id,
            props_init = props_init,
            map_color_line = map_color_line.replace("                ", "                    "),
            hardness = hardness,
            resistance = resistance,
            luminance = luminance,
            sound = sound_type,
        )
    };

    let material_import = if !profile.has_map_color_setter {
        "import net.minecraft.world.level.material.Material;\n"
    } else {
        ""
    };

    format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Block\n\
         //  Target: {mc_version} · loader: {loader:?} · pack_format: {pf} · java: {jv}\n\
         // =============================================================================\n\n\
         package {pkg}.block;\n\n\
         import net.minecraft.world.level.block.Block;\n\
         import net.minecraft.world.level.block.SoundType;\n\
         import net.minecraft.world.level.block.state.BlockBehaviour;\n\
         {material_import}\
         {map_color_import}\
         {loader_imports}\n\
         /**\n\
         \x20* {display_name} — auto-generated by Minecraft Mod Studio.\n\
",
        mc_version = profile.mc_version,
        loader = profile.loader,
        pf = profile.pack_format,
        jv = profile.java_version,
        pkg = pkg,
        material_import = material_import,
        map_color_import = if profile.has_map_color_setter {
            "import net.minecraft.world.level.material.MapColor;\n"
        } else {
            ""
        },
        loader_imports = loader_imports,
        display_name = display_name,
    ) + &format!(
        "\x20* Edit visual properties in the Block Editor; this file will be regenerated.\n\
         \x20*/\n\
         public final class {class_name} {{\n\
         \n\
         {registration}\n\
         \x20   private {class_name}() {{}} // utility class — registry container only\n\
         }}\n",
        class_name = class_name,
        registration = registration,
    )
}

#[tauri::command]
pub async fn generate_block_class(
    db: State<'_, DbState>,
    block_id: i64,
) -> Result<GeneratedFile, String> {
    let block = db
        .0
        .get_block(block_id)
        .map_err(|e| format!("Failed to load block: {}", e))?
        .ok_or_else(|| format!("Block {} not found", block_id))?;

    let project = db
        .0
        .get_project(block.project_id)
        .map_err(|e| format!("Failed to load project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", block.project_id))?;

    let source = emit_block_class(
        &block.namespace,
        &block.block_name,
        &block.display_name,
        block.hardness,
        block.resistance,
        block.luminance,
        block.has_gravity,
        block.is_flammable,
        &block.material_type,
        &project.mod_loader,
        &project.minecraft_version,
    );

    let class_name = to_pascal_case(&block.block_name);
    let package_path = java_package(&block.namespace).replace('.', "/") + "/block";

    Ok(GeneratedFile {
        file_name: format!("{}.java", class_name),
        package_path,
        source,
    })
}

// ============================================================================
// Item row → starter Java class
// ============================================================================

fn emit_item_class(
    item: &crate::db::operations::Item,
    mod_loader: &str,
    mc_version: &str,
) -> String {
    use crate::feature_system::version_matrix::{profile_for, LoaderId};

    let profile = profile_for(mc_version, mod_loader);
    let namespace = &item.namespace;
    let item_name = &item.item_name;
    let display_name = &item.display_name;
    let max_stack_size = item.max_stack_size;
    let rarity = &item.rarity;
    let durability = item.durability;

    let class_name = to_pascal_case(item_name);
    let pkg = java_package(namespace);
    let constant = item_name.to_uppercase();
    let registry_id = item_name.to_lowercase();
    let rarity_const = rarity.to_uppercase();

    let durability_call = durability
        .map(|d| format!("\n            .durability({})", d))
        .unwrap_or_default();

    // PR #26: extras-aware chain. Reuses the helper from item_variants
    // so the plain Item generator and the Tool/Armor/Food variants stay
    // in sync about which fields are emitted on which profile.
    let extras_chain = crate::commands::item_variants::build_item_props_chain(item, &profile);
    // The legacy block below already hard-codes .stacksTo(maxStack),
    // .rarity(Rarity.X) and (optionally) .durability(N), so strip those
    // from the extras chain to avoid double emission.
    let mut extras_filtered = String::new();
    for piece in split_chain(&extras_chain) {
        if piece.starts_with(".stacksTo(")
            || piece.starts_with(".maxCount(")
            || piece.starts_with(".rarity(")
            || piece.starts_with(".durability(")
        {
            continue;
        }
        extras_filtered.push_str(piece);
    }

    let is_fabric = matches!(profile.loader, LoaderId::Fabric);

    let loader_imports = if is_fabric {
        "import net.minecraft.util.Identifier;\n\
         import net.minecraft.core.registries.Registries;\n\
         import net.minecraft.core.Registry;\n"
    } else {
        match profile.loader {
            LoaderId::NeoForge => "import net.neoforged.neoforge.registries.DeferredRegister;\n\
                                   import net.neoforged.neoforge.registries.NeoForgeRegistries;\n",
            _ => "import net.minecraftforge.registries.DeferredRegister;\n\
                  import net.minecraftforge.registries.ForgeRegistries;\n\
                  import net.minecraftforge.registries.RegistryObject;\n",
        }
    };

    let registration = if is_fabric {
        format!(
            "    public static final Item {const_name} = Registry.register(\n\
             \x20       net.minecraft.registry.Registries.ITEM,\n\
             \x20       new Identifier(\"{ns}\", \"{rid}\"),\n\
             \x20       new Item(new Item.Settings()\n\
             \x20           .maxCount({stack})\n\
             \x20           .rarity(Rarity.{rarity}){dur}{extras}\n\
             \x20       )\n\
             \x20   );\n",
            const_name = constant,
            ns = namespace,
            rid = registry_id,
            stack = max_stack_size,
            rarity = rarity_const,
            dur = durability_call,
            extras = extras_filtered,
        )
    } else {
        let registry_module = match profile.loader {
            LoaderId::NeoForge => "NeoForgeRegistries.ITEMS",
            _ => "ForgeRegistries.ITEMS",
        };
        format!(
            "    public static final DeferredRegister<Item> ITEMS =\n\
             \x20       DeferredRegister.create({registry}, \"{ns}\");\n\n\
             \x20   public static final RegistryObject<Item> {const_name} =\n\
             \x20       ITEMS.register(\"{rid}\", () -> new Item(\n\
             \x20           new Item.Properties()\n\
             \x20               .stacksTo({stack})\n\
             \x20               .rarity(Rarity.{rarity}){dur}{extras}\n\
             \x20       ));\n",
            registry = registry_module,
            ns = namespace,
            const_name = constant,
            rid = registry_id,
            stack = max_stack_size,
            rarity = rarity_const,
            dur = durability_call,
            extras = extras_filtered,
        )
    };

    format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Item\n\
         //  Target: {mc_version} · loader: {loader:?} · pack_format: {pf} · java: {jv}\n\
         // =============================================================================\n\n\
         package {pkg}.item;\n\n\
         import net.minecraft.world.item.Item;\n\
         import net.minecraft.world.item.Rarity;\n\
         {loader_imports}\n\
         /**\n\
         \x20* {display_name} — auto-generated by Minecraft Mod Studio.\n\
         \x20* Edit visual properties in the Item Editor; this file will be regenerated.\n\
         \x20*/\n\
         public final class {class_name} {{\n\
         \n\
         {registration}\n\
         \x20   private {class_name}() {{}} // utility class — registry container only\n\
         }}\n",
        mc_version = profile.mc_version,
        loader = profile.loader,
        pf = profile.pack_format,
        jv = profile.java_version,
        pkg = pkg,
        loader_imports = loader_imports,
        display_name = display_name,
        class_name = class_name,
        registration = registration,
    )
}

#[tauri::command]
pub async fn generate_item_class(
    db: State<'_, DbState>,
    item_id: i64,
) -> Result<GeneratedFile, String> {
    let item = db
        .0
        .get_item(item_id)
        .map_err(|e| format!("Failed to load item: {}", e))?
        .ok_or_else(|| format!("Item {} not found", item_id))?;

    let project = db
        .0
        .get_project(item.project_id)
        .map_err(|e| format!("Failed to load project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", item.project_id))?;

    let source = emit_item_class(
        &item,
        &project.mod_loader,
        &project.minecraft_version,
    );

    let class_name = to_pascal_case(&item.item_name);
    let package_path = java_package(&item.namespace).replace('.', "/") + "/item";

    Ok(GeneratedFile {
        file_name: format!("{}.java", class_name),
        package_path,
        source,
    })
}

/// Split an Item.Properties chain like `.stacksTo(16).rarity(Rarity.RARE)`
/// into individual `.<call>(...)` segments. Used to filter duplicates
/// when merging the legacy hardcoded chain with the PR #26 extras chain.
fn split_chain(chain: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let bytes = chain.as_bytes();
    let mut start = 0;
    let mut depth = 0i32;
    for (i, &b) in bytes.iter().enumerate() {
        if b == b'.' && depth == 0 && i > start {
            out.push(&chain[start..i]);
            start = i;
        } else if b == b'(' {
            depth += 1;
        } else if b == b')' {
            depth = depth.saturating_sub(1);
        }
    }
    if start < chain.len() {
        out.push(&chain[start..]);
    }
    out
}


// ============================================================================
// Write generated code to disk
// ============================================================================
//
// Bridges the read-only `generate_*` commands above to the on-disk project
// scaffold. The frontend modal lets the user click "Write to project" after
// reviewing the source — that calls this command, which resolves the
// project's working directory via the scaffold marker (file_registry) and
// writes the file under `src/main/java/<package_path>/<file_name>`.
//
// The write also registers the file in `file_registry` so the project's
// known-files set stays accurate. The on-disk file watcher (when active)
// will see the change and emit `fs-event` to the frontend, just like a
// manual edit, which keeps both flows consistent.

#[derive(Debug, Clone, serde::Serialize)]
pub struct WriteResult {
    pub absolute_path: String,
    pub relative_path: String,
}

#[tauri::command]
pub async fn write_generated_file(
    db: State<'_, DbState>,
    project_id: i64,
    package_path: String,
    file_name: String,
    source: String,
) -> Result<WriteResult, String> {
    use std::path::PathBuf;

    // Resolve project root via the scaffold marker.
    let files = db
        .0
        .get_files(project_id)
        .map_err(|e| format!("Failed to query file registry: {}", e))?;

    let project_root = files
        .iter()
        .find(|f| f.file_path == "__project_root__")
        .and_then(|f| f.last_modified.clone())
        .ok_or_else(|| {
            "Project has not been scaffolded yet — open the workspace and click Build once \
             so the project skeleton is written to disk."
                .to_string()
        })?;

    // Reject suspicious paths early so a hostile package_path can't write
    // outside the project (e.g. `../../etc/passwd`).
    let safe_pkg = package_path.trim_start_matches('/');
    let safe_name = file_name.trim_start_matches('/');
    if safe_pkg.contains("..") || safe_name.contains("..") || safe_name.contains('/') {
        return Err(format!(
            "Refusing to write to suspicious path: {}/{}",
            package_path, file_name
        ));
    }

    let relative = PathBuf::from("src/main/java")
        .join(safe_pkg)
        .join(safe_name);
    let absolute = PathBuf::from(&project_root).join(&relative);

    if let Some(parent) = absolute.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            format!("Failed to create directory {:?}: {}", parent, e)
        })?;
    }

    std::fs::write(&absolute, &source)
        .map_err(|e| format!("Failed to write {:?}: {}", absolute, e))?;

    // Update file_registry so the file is tracked alongside hand-edited ones.
    let entry = crate::db::operations::FileEntry {
        id: None,
        project_id,
        file_path: relative.to_string_lossy().to_string(),
        file_type: "code".to_string(),
        file_size: Some(source.len() as i64),
        last_modified: Some(chrono::Utc::now().to_rfc3339()),
    };
    let _ = db.0.upsert_file(&entry);

    Ok(WriteResult {
        absolute_path: absolute.to_string_lossy().to_string(),
        relative_path: relative.to_string_lossy().to_string(),
    })
}



#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::operations::Item;

    fn ruby_item() -> Item {
        Item {
            id: Some(1),
            project_id: 1,
            item_name: "ruby".into(),
            display_name: "Ruby".into(),
            namespace: "rubymod".into(),
            ..Item::default()
        }
    }

    #[test]
    fn split_chain_handles_nested_parens() {
        let parts = split_chain(
            ".stacksTo(16).rarity(Rarity.RARE).craftRemainder(Items.BUCKET).fireResistant()",
        );
        assert_eq!(
            parts,
            vec![
                ".stacksTo(16)",
                ".rarity(Rarity.RARE)",
                ".craftRemainder(Items.BUCKET)",
                ".fireResistant()",
            ],
        );
    }

    #[test]
    fn split_chain_empty_input() {
        let parts = split_chain("");
        assert!(parts.is_empty());
    }

    #[test]
    fn item_emission_includes_fire_resistant_and_remainder() {
        let mut item = ruby_item();
        item.is_fire_resistant = true;
        item.recipe_remainder = Some("Items.BUCKET".into());

        let source = emit_item_class(&item, "forge", "1.20.4");
        assert!(
            source.contains(".fireResistant()"),
            "Expected fireResistant() in:\n{source}"
        );
        assert!(
            source.contains(".craftRemainder(Items.BUCKET)"),
            "Expected craftRemainder(...) in:\n{source}"
        );
        // Defaults like .rarity(Rarity.COMMON) must NOT appear twice.
        let rarity_count = source.matches(".rarity(Rarity.COMMON)").count();
        assert!(
            rarity_count <= 1,
            "Rarity emitted {rarity_count} times — must be deduped:\n{source}"
        );
    }

    #[test]
    fn item_emission_skips_default_extras() {
        let item = ruby_item();
        let source = emit_item_class(&item, "forge", "1.20.4");
        // Default item (no extras set) — must not contain any of the
        // PR #24 extras markers.
        assert!(!source.contains("fireResistant"), "default item should not be fire-resistant");
        assert!(!source.contains("craftRemainder"), "default item should not have craftRemainder");
    }

    #[test]
    fn item_emission_neoforge_uses_neoforge_registries() {
        let item = ruby_item();
        let source = emit_item_class(&item, "neoforge", "1.21");
        assert!(source.contains("NeoForgeRegistries.ITEMS"), "got:\n{source}");
        assert!(source.contains("net.neoforged.neoforge.registries"), "got:\n{source}");
    }
}
