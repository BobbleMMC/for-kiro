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
) -> String {
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

    let loader_imports = if mod_loader == "fabric" {
        "import net.fabricmc.fabric.api.object.builder.v1.block.FabricBlockSettings;\n\
         import net.minecraft.util.Identifier;\n\
         import net.minecraft.util.registry.Registry;\n"
    } else {
        "import net.minecraftforge.registries.DeferredRegister;\n\
         import net.minecraftforge.registries.ForgeRegistries;\n\
         import net.minecraftforge.registries.RegistryObject;\n"
    };

    let registration = if mod_loader == "fabric" {
        format!(
            "    public static final Block {const_name} = Registry.register(\n\
             \x20       Registry.BLOCK,\n\
             \x20       new Identifier(\"{ns}\", \"{rid}\"),\n\
             \x20       new Block(FabricBlockSettings.create()\n\
             \x20           .strength({hardness}f, {resistance}f)\n\
             \x20           .luminance({luminance})\n\
             \x20           .sounds({sound})\n\
             {gravity}\
             {fire}\
             \x20       )\n\
             \x20   );\n",
            const_name = constant,
            ns = namespace,
            rid = registry_id,
            hardness = hardness,
            resistance = resistance,
            luminance = luminance,
            sound = sound_type,
            gravity = if has_gravity { "            // gravity not in vanilla settings — implement FallingBlock subclass for true gravity\n" } else { "" },
            fire = if is_flammable { "            // flammability handled via FireBlock.setFireInfo\n" } else { "" },
        )
    } else {
        format!(
            "    public static final DeferredRegister<Block> BLOCKS =\n\
             \x20       DeferredRegister.create(ForgeRegistries.BLOCKS, \"{ns}\");\n\n\
             \x20   public static final RegistryObject<Block> {const_name} =\n\
             \x20       BLOCKS.register(\"{rid}\", () -> new Block(\n\
             \x20           BlockBehaviour.Properties.of()\n\
             \x20               .mapColor({map_color})\n\
             \x20               .strength({hardness}f, {resistance}f)\n\
             \x20               .lightLevel(state -> {luminance})\n\
             \x20               .sound({sound})\n\
             \x20       ));\n",
            ns = namespace,
            const_name = constant,
            rid = registry_id,
            hardness = hardness,
            resistance = resistance,
            luminance = luminance,
            sound = sound_type,
            map_color = map_color,
        )
    };

    format!(
        "package {pkg}.block;\n\n\
         import net.minecraft.world.level.block.Block;\n\
         import net.minecraft.world.level.block.SoundType;\n\
         import net.minecraft.world.level.block.state.BlockBehaviour;\n\
         import net.minecraft.world.level.material.MapColor;\n\
         {loader_imports}\n\
         /**\n\
         \x20* {display_name} — auto-generated by Minecraft Mod Studio.\n\
         \x20* Edit visual properties in the Block Editor; this file will be regenerated.\n\
         \x20*/\n\
         public final class {class_name} {{\n\
         \n\
         {registration}\n\
         \x20   private {class_name}() {{}} // utility class — registry container only\n\
         }}\n",
        pkg = pkg,
        loader_imports = loader_imports,
        display_name = display_name,
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
    namespace: &str,
    item_name: &str,
    display_name: &str,
    max_stack_size: i32,
    rarity: &str,
    durability: Option<i32>,
    mod_loader: &str,
) -> String {
    let class_name = to_pascal_case(item_name);
    let pkg = java_package(namespace);
    let constant = item_name.to_uppercase();
    let registry_id = item_name.to_lowercase();
    let rarity_const = rarity.to_uppercase();

    let durability_call = durability
        .map(|d| format!("\n            .durability({})", d))
        .unwrap_or_default();

    let loader_imports = if mod_loader == "fabric" {
        "import net.minecraft.util.Identifier;\n\
         import net.minecraft.util.registry.Registry;\n"
    } else {
        "import net.minecraftforge.registries.DeferredRegister;\n\
         import net.minecraftforge.registries.ForgeRegistries;\n\
         import net.minecraftforge.registries.RegistryObject;\n"
    };

    let registration = if mod_loader == "fabric" {
        format!(
            "    public static final Item {const_name} = Registry.register(\n\
             \x20       Registry.ITEM,\n\
             \x20       new Identifier(\"{ns}\", \"{rid}\"),\n\
             \x20       new Item(new Item.Settings()\n\
             \x20           .maxCount({stack})\n\
             \x20           .rarity(Rarity.{rarity}){dur}\n\
             \x20       )\n\
             \x20   );\n",
            const_name = constant,
            ns = namespace,
            rid = registry_id,
            stack = max_stack_size,
            rarity = rarity_const,
            dur = durability_call,
        )
    } else {
        format!(
            "    public static final DeferredRegister<Item> ITEMS =\n\
             \x20       DeferredRegister.create(ForgeRegistries.ITEMS, \"{ns}\");\n\n\
             \x20   public static final RegistryObject<Item> {const_name} =\n\
             \x20       ITEMS.register(\"{rid}\", () -> new Item(\n\
             \x20           new Item.Properties()\n\
             \x20               .stacksTo({stack})\n\
             \x20               .rarity(Rarity.{rarity}){dur}\n\
             \x20       ));\n",
            ns = namespace,
            const_name = constant,
            rid = registry_id,
            stack = max_stack_size,
            rarity = rarity_const,
            dur = durability_call,
        )
    };

    format!(
        "package {pkg}.item;\n\n\
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
        &item.namespace,
        &item.item_name,
        &item.display_name,
        item.max_stack_size,
        &item.rarity,
        item.durability,
        &project.mod_loader,
    );

    let class_name = to_pascal_case(&item.item_name);
    let package_path = java_package(&item.namespace).replace('.', "/") + "/item";

    Ok(GeneratedFile {
        file_name: format!("{}.java", class_name),
        package_path,
        source,
    })
}
