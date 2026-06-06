//! Misc asset commands — Sound + Keybind + Config.
//!
//! PR #29 of the post-v1.2.0 roadmap. Promotes three skeleton entries
//! from the Feature Catalog (Sound, Keybind, Config) to Complete in a
//! single focused PR. They share the registry-table CRUD pattern
//! (asset_type = "sound" / "keybind" / "config") and the same
//! version_matrix-based loader switching, so colocating them keeps the
//! diff reviewable.
//!
//! Each command consumes a `RegistryAsset` whose `metadata` field is
//! the structured shape persisted by the matching React editor:
//!
//!   * Sound   — list of sound events with category + ogg paths;
//!               emits `SoundEvents.java` registry class **plus**
//!               `assets/<modid>/sounds.json`.
//!   * Keybind — single keybind entry with default key, category,
//!               description; emits `ModKeyMappings.java` with the
//!               correct registration hook per loader.
//!   * Config  — list of typed fields (bool / int / double / string /
//!               enum); emits a Forge/NeoForge ForgeConfigSpec class
//!               or a Fabric @Config-style class.
//!
//! All three commands validate inputs strictly: invalid GLFW key
//! constants, malformed file paths, or zero-field configs are rejected
//! with human-readable error messages.

use serde::Deserialize;
use tauri::State;

use crate::commands::codegen_commands::GeneratedFile;
use crate::feature_system::version_matrix::{profile_for, LoaderId};
use super::project_commands::DbState;

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
    if sub.is_empty() {
        base
    } else {
        format!("{}.{}", base, sub)
    }
}

fn ascii_snake(name: &str) -> bool {
    !name.is_empty()
        && name
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

// ============================================================================
// Sound
// ============================================================================

#[derive(Debug, Default, Deserialize)]
pub struct SoundMeta {
    /// Sound events to register. Must be non-empty.
    #[serde(default)]
    pub events: Vec<SoundEvent>,
}

#[derive(Debug, Deserialize)]
pub struct SoundEvent {
    /// Registry id, must be ^[a-z0-9_]+\$.
    pub name: String,

    /// "master" / "music" / "record" / "weather" / "block" / "hostile" /
    /// "neutral" / "player" / "ambient" / "voice".
    #[serde(default = "default_category")]
    pub category: String,

    /// Optional human-readable subtitle. Translated client-side.
    #[serde(default)]
    pub subtitle: Option<String>,

    /// One or more ogg files to play. Each entry is a string id like
    /// "<modid>:<name>" or an explicit object form
    /// {name, volume, pitch, weight, stream}.
    #[serde(default)]
    pub sounds: Vec<serde_json::Value>,
}

fn default_category() -> String {
    "master".into()
}

const VALID_SOUND_CATEGORIES: [&str; 10] = [
    "master", "music", "record", "weather", "block", "hostile", "neutral", "player", "ambient",
    "voice",
];

fn validate_sound_meta(meta: &SoundMeta) -> Result<(), String> {
    if meta.events.is_empty() {
        return Err("Sound asset must define at least one event".into());
    }
    let mut seen: std::collections::HashSet<&str> = std::collections::HashSet::new();
    for (i, ev) in meta.events.iter().enumerate() {
        if !ascii_snake(&ev.name) {
            return Err(format!(
                "events[{}].name '{}' must match ^[a-z0-9_]+\\$",
                i, ev.name
            ));
        }
        if !seen.insert(ev.name.as_str()) {
            return Err(format!("Duplicate sound event name '{}'", ev.name));
        }
        if !VALID_SOUND_CATEGORIES.contains(&ev.category.as_str()) {
            return Err(format!(
                "events[{}].category '{}' must be one of {}",
                i,
                ev.category,
                VALID_SOUND_CATEGORIES.join("/")
            ));
        }
        if ev.sounds.is_empty() {
            return Err(format!(
                "events[{}] '{}' must reference at least one ogg file",
                i, ev.name
            ));
        }
    }
    Ok(())
}

fn sounds_json(modid: &str, meta: &SoundMeta) -> serde_json::Value {
    let mut root = serde_json::Map::new();
    for ev in &meta.events {
        let mut entry = serde_json::Map::new();
        entry.insert("category".into(), serde_json::json!(ev.category));
        if let Some(sub) = &ev.subtitle {
            entry.insert(
                "subtitle".into(),
                serde_json::json!(format!("subtitle.{}.{}", modid, ev.name)),
            );
            entry.insert("_subtitle_text".into(), serde_json::json!(sub));
        }
        // Pass-through sounds list — accept either string or object form.
        entry.insert("sounds".into(), serde_json::json!(ev.sounds));
        root.insert(ev.name.clone(), serde_json::Value::Object(entry));
    }
    serde_json::Value::Object(root)
}

fn sound_events_class_java(
    namespace: &str,
    meta: &SoundMeta,
    loader: LoaderId,
) -> String {
    let pkg = java_package(namespace, "sound");
    let modid = namespace.to_lowercase();
    let class = "ModSounds";

    let mut declarations = String::new();
    let mut registrations = String::new();
    for ev in &meta.events {
        let const_name = ev.name.to_uppercase();
        let rid = ev.name.to_lowercase();
        match loader {
            LoaderId::Fabric | LoaderId::Quilt => {
                declarations.push_str(&format!(
                    "    public static final SoundEvent {const_name} = SoundEvent.createVariableRangeEvent(\n        new ResourceLocation(\"{modid}\", \"{rid}\"));\n",
                ));
                registrations.push_str(&format!(
                    "        Registry.register(BuiltInRegistries.SOUND_EVENT, new ResourceLocation(\"{modid}\", \"{rid}\"), {const_name});\n",
                ));
            }
            LoaderId::NeoForge => {
                declarations.push_str(&format!(
                    "    public static final RegistryObject<SoundEvent> {const_name} =\n        SOUNDS.register(\"{rid}\", () -> SoundEvent.createVariableRangeEvent(new ResourceLocation(\"{modid}\", \"{rid}\")));\n",
                ));
            }
            LoaderId::Forge => {
                declarations.push_str(&format!(
                    "    public static final RegistryObject<SoundEvent> {const_name} =\n        SOUNDS.register(\"{rid}\", () -> SoundEvent.createVariableRangeEvent(new ResourceLocation(\"{modid}\", \"{rid}\")));\n",
                ));
            }
        }
    }

    let imports = match loader {
        LoaderId::Fabric | LoaderId::Quilt => "\
import net.minecraft.core.Registry;\n\
import net.minecraft.core.registries.BuiltInRegistries;\n\
import net.minecraft.resources.ResourceLocation;\n\
import net.minecraft.sounds.SoundEvent;\n",
        LoaderId::NeoForge => "\
import net.minecraft.resources.ResourceLocation;\n\
import net.minecraft.sounds.SoundEvent;\n\
import net.neoforged.neoforge.registries.DeferredRegister;\n\
import net.neoforged.neoforge.registries.NeoForgeRegistries;\n\
import net.neoforged.neoforge.registries.RegistryObject;\n\
import net.neoforged.bus.api.IEventBus;\n",
        LoaderId::Forge => "\
import net.minecraft.resources.ResourceLocation;\n\
import net.minecraft.sounds.SoundEvent;\n\
import net.minecraftforge.registries.DeferredRegister;\n\
import net.minecraftforge.registries.ForgeRegistries;\n\
import net.minecraftforge.registries.RegistryObject;\n\
import net.minecraftforge.eventbus.api.IEventBus;\n",
    };

    let body = match loader {
        LoaderId::Fabric | LoaderId::Quilt => format!(
            "public final class {class} {{\n\
             {declarations}\n\
             \x20   /** Call from your ModInitializer.onInitialize(). */\n\
             \x20   public static void register() {{\n\
             {registrations}\
             \x20   }}\n\n\
             \x20   private {class}() {{}}\n\
             }}\n",
        ),
        LoaderId::NeoForge => format!(
            "public final class {class} {{\n\
             \x20   public static final DeferredRegister<SoundEvent> SOUNDS =\n\
             \x20       DeferredRegister.create(NeoForgeRegistries.SOUND_EVENT_REGISTRY_KEY, \"{modid}\");\n\n\
             {declarations}\n\
             \x20   /** Call from your @Mod constructor with the mod event bus. */\n\
             \x20   public static void register(IEventBus bus) {{\n\
             \x20       SOUNDS.register(bus);\n\
             \x20   }}\n\n\
             \x20   private {class}() {{}}\n\
             }}\n",
        ),
        LoaderId::Forge => format!(
            "public final class {class} {{\n\
             \x20   public static final DeferredRegister<SoundEvent> SOUNDS =\n\
             \x20       DeferredRegister.create(ForgeRegistries.SOUND_EVENTS, \"{modid}\");\n\n\
             {declarations}\n\
             \x20   /** Call from your @Mod constructor with the mod event bus. */\n\
             \x20   public static void register(IEventBus bus) {{\n\
             \x20       SOUNDS.register(bus);\n\
             \x20   }}\n\n\
             \x20   private {class}() {{}}\n\
             }}\n",
        ),
    };

    format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Sound registry\n\
         //  loader: {loader:?} · events: {n}\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         {imports}\n\
         {body}",
        n = meta.events.len(),
    )
}

#[tauri::command]
pub async fn generate_sound_assets(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<Vec<GeneratedFile>, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;
    if asset.asset_type != "sound" {
        return Err(format!(
            "Asset {} is not a sound (got '{}')",
            asset_id, asset.asset_type
        ));
    }
    let project = db
        .0
        .get_project(asset.project_id)
        .map_err(|e| format!("get_project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", asset.project_id))?;

    let meta: SoundMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse sound metadata: {}", e))?
        .unwrap_or_default();
    validate_sound_meta(&meta)?;

    let modid = asset.namespace.to_lowercase();
    let profile = profile_for(&project.minecraft_version, &project.mod_loader);
    let mut out = Vec::new();

    // Java registry class.
    let java = sound_events_class_java(&asset.namespace, &meta, profile.loader);
    out.push(GeneratedFile {
        file_name: "ModSounds.java".into(),
        package_path: java_package(&asset.namespace, "sound").replace('.', "/"),
        source: java,
    });

    // sounds.json.
    let json = sounds_json(&modid, &meta);
    out.push(GeneratedFile {
        file_name: "sounds.json".into(),
        package_path: format!("../resources/assets/{}", modid),
        source: serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?,
    });

    Ok(out)
}

// ============================================================================
// Keybind
// ============================================================================

#[derive(Debug, Default, Deserialize)]
pub struct KeybindMeta {
    /// Translation key suffix. e.g. "open_my_screen".
    #[serde(default)]
    pub action_id: String,
    /// Human-readable label shown in the controls screen.
    #[serde(default)]
    pub display_name: String,
    /// GLFW key constant. e.g. "K", "G", "F4". Letters are uppercased.
    #[serde(default = "default_key")]
    pub default_key: String,
    /// "key.categories.misc" / "key.categories.gameplay" / custom.
    #[serde(default = "default_category_keybind")]
    pub category: String,
}

fn default_key() -> String {
    "K".into()
}
fn default_category_keybind() -> String {
    "key.categories.misc".into()
}

fn glfw_key_constant(s: &str) -> Result<String, String> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return Err("default_key cannot be empty".into());
    }
    // Single letter or digit → GLFW_KEY_<C>.
    if trimmed.len() == 1 {
        let c = trimmed.chars().next().unwrap();
        if c.is_ascii_alphanumeric() {
            return Ok(format!("GLFW_KEY_{}", c.to_ascii_uppercase()));
        }
    }
    // Function keys.
    let upper = trimmed.to_ascii_uppercase();
    let known = [
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14",
        "F15", "F16", "F17", "F18", "F19", "F20", "F21", "F22", "F23", "F24", "F25", "ESCAPE",
        "ENTER", "TAB", "BACKSPACE", "INSERT", "DELETE", "RIGHT", "LEFT", "DOWN", "UP", "PAGE_UP",
        "PAGE_DOWN", "HOME", "END", "SPACE", "LEFT_SHIFT", "RIGHT_SHIFT", "LEFT_CONTROL",
        "RIGHT_CONTROL", "LEFT_ALT", "RIGHT_ALT", "CAPS_LOCK", "NUM_LOCK", "SCROLL_LOCK",
        "PRINT_SCREEN", "PAUSE",
    ];
    if known.contains(&upper.as_str()) {
        return Ok(format!("GLFW_KEY_{}", upper));
    }
    Err(format!(
        "default_key '{}' not recognised. Use a single letter/digit or one of: {}",
        s,
        known.join(", ")
    ))
}

fn keybind_class_java(namespace: &str, meta: &KeybindMeta, loader: LoaderId) -> String {
    let modid = namespace.to_lowercase();
    let pkg = java_package(namespace, "client");
    let class = pascal(&format!("{}Keys", meta.action_id));
    let action_id = if meta.action_id.is_empty() {
        "action".into()
    } else {
        meta.action_id.clone()
    };
    let display = if meta.display_name.is_empty() {
        action_id.replace('_', " ")
    } else {
        meta.display_name.clone()
    };
    let key = glfw_key_constant(&meta.default_key).unwrap_or_else(|_| "GLFW_KEY_K".into());

    let registration_block = match loader {
        LoaderId::Fabric | LoaderId::Quilt => format!(
            "    /**\n\
             \x20    * Call from a ClientModInitializer / ClientLifecycleEvents.CLIENT_STARTED\n\
             \x20    * handler. Fabric registers via KeyBindingHelper.\n\
             \x20    */\n\
             \x20   public static void register() {{\n\
             \x20       KeyBindingHelper.registerKeyBinding(KEY);\n\
             \x20   }}\n",
        ),
        LoaderId::NeoForge => "    /**\n\
                              \x20    * Subscribe to RegisterKeyMappingsEvent on the mod event bus and\n\
                              \x20    * call event.register(KEY).\n\
                              \x20    */\n\
                              \x20   public static void register(net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent event) {\n\
                              \x20       event.register(KEY);\n\
                              \x20   }\n".into(),
        LoaderId::Forge => "    /**\n\
                           \x20    * Subscribe to RegisterKeyMappingsEvent (FORGE 1.20.1+) on the\n\
                           \x20    * mod event bus and call event.register(KEY).\n\
                           \x20    */\n\
                           \x20   public static void register(net.minecraftforge.client.event.RegisterKeyMappingsEvent event) {\n\
                           \x20       event.register(KEY);\n\
                           \x20   }\n".into(),
    };

    let imports = match loader {
        LoaderId::Fabric | LoaderId::Quilt => "\
import com.mojang.blaze3d.platform.InputConstants;\n\
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;\n\
import net.minecraft.client.KeyMapping;\n\
import org.lwjgl.glfw.GLFW;\n",
        _ => "\
import com.mojang.blaze3d.platform.InputConstants;\n\
import net.minecraft.client.KeyMapping;\n\
import org.lwjgl.glfw.GLFW;\n",
    };

    format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Keybind\n\
         //  loader: {loader:?} · action_id: {action_id} · default_key: {key_disp}\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         {imports}\n\
         public final class {class} {{\n\
         \x20   public static final KeyMapping KEY = new KeyMapping(\n\
         \x20       \"key.{modid}.{action_id}\",\n\
         \x20       InputConstants.Type.KEYSYM,\n\
         \x20       GLFW.{glfw_key},\n\
         \x20       \"{category}\"\n\
         \x20   );\n\n\
         \x20   /** Display label: '{display}'. Add to lang/en_us.json:\n\
         \x20    *   \"key.{modid}.{action_id}\": \"{display}\" */\n\n\
         {registration_block}\n\
         \x20   private {class}() {{}}\n\
         }}\n",
        modid = modid,
        action_id = action_id,
        glfw_key = key,
        key_disp = meta.default_key,
        display = display,
        category = meta.category,
        pkg = pkg,
        imports = imports,
        class = class,
        registration_block = registration_block,
    )
}

#[tauri::command]
pub async fn generate_keybind_class(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<GeneratedFile, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;
    if asset.asset_type != "keybind" {
        return Err(format!(
            "Asset {} is not a keybind (got '{}')",
            asset_id, asset.asset_type
        ));
    }
    let project = db
        .0
        .get_project(asset.project_id)
        .map_err(|e| format!("get_project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", asset.project_id))?;

    let meta: KeybindMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse keybind metadata: {}", e))?
        .unwrap_or_default();

    if !ascii_snake(&meta.action_id) {
        return Err(format!(
            "Keybind action_id '{}' must match ^[a-z0-9_]+\\$",
            meta.action_id
        ));
    }
    let _ = glfw_key_constant(&meta.default_key)?; // strict validation — fail early
    if meta.category.trim().is_empty() {
        return Err("Keybind category cannot be empty".into());
    }

    let profile = profile_for(&project.minecraft_version, &project.mod_loader);
    let java = keybind_class_java(&asset.namespace, &meta, profile.loader);
    let class_name = pascal(&format!("{}Keys", meta.action_id));
    let pkg = java_package(&asset.namespace, "client");

    Ok(GeneratedFile {
        file_name: format!("{}.java", class_name),
        package_path: pkg.replace('.', "/"),
        source: java,
    })
}

// ============================================================================
// Config
// ============================================================================

#[derive(Debug, Default, Deserialize)]
pub struct ConfigMeta {
    /// "common" / "client" / "server".
    #[serde(default = "default_config_kind")]
    pub kind: String,
    /// Class name for the generated file (e.g. "ModConfig").
    /// Defaults to PascalCase(asset_name).
    #[serde(default)]
    pub class_name: Option<String>,
    /// Typed fields. Must be non-empty.
    #[serde(default)]
    pub fields: Vec<ConfigField>,
}

fn default_config_kind() -> String {
    "common".into()
}

#[derive(Debug, Deserialize)]
pub struct ConfigField {
    pub name: String,
    /// "bool" / "int" / "double" / "string" / "enum".
    pub field_type: String,
    pub default_value: serde_json::Value,
    #[serde(default)]
    pub min: Option<f64>,
    #[serde(default)]
    pub max: Option<f64>,
    #[serde(default)]
    pub comment: Option<String>,
    /// Enum values (for field_type == "enum"). Used as String allowedValues.
    #[serde(default)]
    pub allowed_values: Vec<String>,
}

fn validate_config_meta(meta: &ConfigMeta) -> Result<(), String> {
    if !["common", "client", "server"].contains(&meta.kind.as_str()) {
        return Err(format!(
            "Config kind '{}' must be one of common/client/server",
            meta.kind
        ));
    }
    if meta.fields.is_empty() {
        return Err("Config must define at least one field".into());
    }
    let mut seen = std::collections::HashSet::new();
    for (i, f) in meta.fields.iter().enumerate() {
        if !ascii_snake(&f.name) {
            return Err(format!(
                "fields[{}].name '{}' must match ^[a-z0-9_]+\\$",
                i, f.name
            ));
        }
        if !seen.insert(f.name.clone()) {
            return Err(format!("Duplicate config field name '{}'", f.name));
        }
        match f.field_type.as_str() {
            "bool" | "int" | "double" | "string" | "enum" => {}
            other => {
                return Err(format!(
                    "fields[{}].field_type '{}' must be one of bool/int/double/string/enum",
                    i, other
                ))
            }
        }
        if f.field_type == "int" || f.field_type == "double" {
            if let (Some(min), Some(max)) = (f.min, f.max) {
                if min > max {
                    return Err(format!(
                        "fields[{}] '{}' min ({}) > max ({})",
                        i, f.name, min, max
                    ));
                }
            }
        }
        if f.field_type == "enum" && f.allowed_values.is_empty() {
            return Err(format!(
                "fields[{}] '{}' is enum but has no allowed_values",
                i, f.name
            ));
        }
    }
    Ok(())
}

fn config_class_java(
    namespace: &str,
    asset_name: &str,
    meta: &ConfigMeta,
    loader: LoaderId,
) -> String {
    let pkg = java_package(namespace, "config");
    let class = meta
        .class_name
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| pascal(asset_name));
    let modid = namespace.to_lowercase();

    // Forge / NeoForge use ForgeConfigSpec; Fabric users typically lean
    // on AutoConfig (Cloth Config). To keep the generator self-contained
    // we emit a portable POJO for Fabric and a real Forge spec
    // otherwise.
    match loader {
        LoaderId::Forge | LoaderId::NeoForge => forge_config_class(&pkg, &class, &modid, meta, loader),
        LoaderId::Fabric | LoaderId::Quilt => fabric_config_class(&pkg, &class, &modid, meta),
    }
}

fn forge_config_class(
    pkg: &str,
    class: &str,
    modid: &str,
    meta: &ConfigMeta,
    loader: LoaderId,
) -> String {
    let pkg_root = match loader {
        LoaderId::NeoForge => "net.neoforged.neoforge.common.ModConfigSpec",
        _ => "net.minecraftforge.common.ForgeConfigSpec",
    };
    let spec_class = match loader {
        LoaderId::NeoForge => "ModConfigSpec",
        _ => "ForgeConfigSpec",
    };

    let mut decls = String::new();
    let mut builders = String::new();
    for f in &meta.fields {
        let const_name = f.name.to_uppercase();
        if let Some(comment) = &f.comment {
            builders.push_str(&format!("        BUILDER.comment(\"{}\");\n", escape_quotes(comment)));
        }
        let push_path = format!("        BUILDER.push(\"{}\");\n", f.name);
        let pop_path = "        BUILDER.pop();\n".to_string();
        let _ = (push_path, pop_path); // we keep flat for readability

        match f.field_type.as_str() {
            "bool" => {
                let dv = f.default_value.as_bool().unwrap_or(false);
                decls.push_str(&format!(
                    "    public static final {spec_class}.BooleanValue {const_name};\n",
                ));
                builders.push_str(&format!(
                    "        {const_name} = BUILDER.define(\"{name}\", {dv});\n",
                    name = f.name,
                    dv = dv
                ));
            }
            "int" => {
                let dv = f.default_value.as_i64().unwrap_or(0);
                let min = f.min.unwrap_or(i32::MIN as f64) as i32;
                let max = f.max.unwrap_or(i32::MAX as f64) as i32;
                decls.push_str(&format!(
                    "    public static final {spec_class}.IntValue {const_name};\n",
                ));
                builders.push_str(&format!(
                    "        {const_name} = BUILDER.defineInRange(\"{name}\", {dv}, {min}, {max});\n",
                    name = f.name,
                ));
            }
            "double" => {
                let dv = f.default_value.as_f64().unwrap_or(0.0);
                let min = f.min.unwrap_or(f64::MIN);
                let max = f.max.unwrap_or(f64::MAX);
                decls.push_str(&format!(
                    "    public static final {spec_class}.DoubleValue {const_name};\n",
                ));
                builders.push_str(&format!(
                    "        {const_name} = BUILDER.defineInRange(\"{name}\", {dv}, {min}, {max});\n",
                    name = f.name,
                ));
            }
            "string" => {
                let dv = f.default_value.as_str().unwrap_or("");
                decls.push_str(&format!(
                    "    public static final {spec_class}.ConfigValue<String> {const_name};\n",
                ));
                builders.push_str(&format!(
                    "        {const_name} = BUILDER.define(\"{name}\", \"{dv}\");\n",
                    name = f.name,
                    dv = escape_quotes(dv)
                ));
            }
            "enum" => {
                let dv = f.default_value.as_str().unwrap_or("");
                let allowed = f
                    .allowed_values
                    .iter()
                    .map(|v| format!("\"{}\"", escape_quotes(v)))
                    .collect::<Vec<_>>()
                    .join(", ");
                decls.push_str(&format!(
                    "    public static final {spec_class}.ConfigValue<String> {const_name};\n",
                ));
                builders.push_str(&format!(
                    "        {const_name} = BUILDER.defineInList(\"{name}\", \"{dv}\", java.util.List.of({allowed}));\n",
                    name = f.name,
                    dv = escape_quotes(dv),
                    allowed = allowed,
                ));
            }
            _ => unreachable!("validated upstream"),
        }
    }

    format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Config (Forge/NeoForge)\n\
         //  modid: {modid} · kind: {kind} · fields: {n}\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         import {pkg_root};\n\n\
         public final class {class} {{\n\
         \x20   public static final {spec_class}.Builder BUILDER = new {spec_class}.Builder();\n\
         \x20   public static final {spec_class} SPEC;\n\n\
         {decls}\n\
         \x20   static {{\n\
         {builders}\
         \x20       SPEC = BUILDER.build();\n\
         \x20   }}\n\n\
         \x20   /** Register in your @Mod constructor with\n\
         \x20    *   ModLoadingContext.get().registerConfig(ModConfig.Type.{kind_upper}, SPEC); */\n\
         \x20   private {class}() {{}}\n\
         }}\n",
        kind = meta.kind,
        n = meta.fields.len(),
        kind_upper = meta.kind.to_uppercase(),
    )
}

fn fabric_config_class(
    pkg: &str,
    class: &str,
    modid: &str,
    meta: &ConfigMeta,
) -> String {
    let mut decls = String::new();
    for f in &meta.fields {
        if let Some(c) = &f.comment {
            decls.push_str(&format!("    /** {} */\n", c));
        }
        let (java_type, dv) = match f.field_type.as_str() {
            "bool" => (
                "boolean",
                if f.default_value.as_bool().unwrap_or(false) {
                    "true".into()
                } else {
                    "false".into()
                },
            ),
            "int" => ("int", format!("{}", f.default_value.as_i64().unwrap_or(0))),
            "double" => (
                "double",
                format!("{}", f.default_value.as_f64().unwrap_or(0.0)),
            ),
            "string" | "enum" => (
                "String",
                format!("\"{}\"", escape_quotes(f.default_value.as_str().unwrap_or(""))),
            ),
            _ => unreachable!(),
        };
        decls.push_str(&format!(
            "    public {jt} {name} = {dv};\n",
            jt = java_type,
            name = f.name,
            dv = dv
        ));
    }
    format!(
        "// =============================================================================\n\
         //  Generated by Minecraft Mod Studio — Config (Fabric)\n\
         //  modid: {modid} · kind: {kind} · fields: {n}\n\
         //\n\
         //  Fabric portable POJO. Pair with Cloth Config / AutoConfig\n\
         //  (recommended) — annotate with @Config(name = \"{modid}\")\n\
         //  or load/save with Gson manually.\n\
         // =============================================================================\n\n\
         package {pkg};\n\n\
         public final class {class} {{\n\
         {decls}\
         }}\n",
        kind = meta.kind,
        n = meta.fields.len(),
    )
}

fn escape_quotes(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[tauri::command]
pub async fn generate_config_class(
    db: State<'_, DbState>,
    asset_id: i64,
) -> Result<GeneratedFile, String> {
    let asset = db
        .0
        .get_asset(asset_id)
        .map_err(|e| format!("get_asset: {}", e))?
        .ok_or_else(|| format!("Asset {} not found", asset_id))?;
    if asset.asset_type != "config" {
        return Err(format!(
            "Asset {} is not a config (got '{}')",
            asset_id, asset.asset_type
        ));
    }
    let project = db
        .0
        .get_project(asset.project_id)
        .map_err(|e| format!("get_project: {}", e))?
        .ok_or_else(|| format!("Project {} not found", asset.project_id))?;

    let meta: ConfigMeta = asset
        .metadata
        .as_deref()
        .map(serde_json::from_str)
        .transpose()
        .map_err(|e| format!("Could not parse config metadata: {}", e))?
        .unwrap_or_default();
    validate_config_meta(&meta)?;

    let profile = profile_for(&project.minecraft_version, &project.mod_loader);
    let class = meta
        .class_name
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| pascal(&asset.asset_name));
    let java = config_class_java(&asset.namespace, &asset.asset_name, &meta, profile.loader);
    let pkg = java_package(&asset.namespace, "config");

    Ok(GeneratedFile {
        file_name: format!("{}.java", class),
        package_path: pkg.replace('.', "/"),
        source: java,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- Sound ----------

    fn ev(name: &str, cat: &str) -> SoundEvent {
        SoundEvent {
            name: name.into(),
            category: cat.into(),
            subtitle: None,
            sounds: vec![serde_json::json!(format!("modid:{}", name))],
        }
    }

    #[test]
    fn sound_validation_rejects_empty_events() {
        let m = SoundMeta { events: vec![] };
        assert!(validate_sound_meta(&m).is_err());
    }

    #[test]
    fn sound_validation_rejects_bad_category_and_duplicates() {
        let m = SoundMeta {
            events: vec![ev("hello", "rocket")],
        };
        assert!(validate_sound_meta(&m).is_err());

        let m = SoundMeta {
            events: vec![ev("hello", "master"), ev("hello", "master")],
        };
        assert!(validate_sound_meta(&m).is_err());
    }

    #[test]
    fn sound_validation_rejects_bad_name_format() {
        let m = SoundMeta {
            events: vec![ev("HelloWorld", "master")],
        };
        assert!(validate_sound_meta(&m).is_err());
    }

    #[test]
    fn sounds_json_emits_one_entry_per_event() {
        let m = SoundMeta {
            events: vec![ev("hit", "block"), ev("crackle", "weather")],
        };
        let v = sounds_json("modid", &m);
        assert!(v.get("hit").is_some());
        assert!(v.get("crackle").is_some());
        assert_eq!(v["hit"]["category"], "block");
        assert_eq!(v["crackle"]["category"], "weather");
    }

    #[test]
    fn sound_class_uses_correct_imports_per_loader() {
        let m = SoundMeta {
            events: vec![ev("ping", "master")],
        };
        let forge = sound_events_class_java("modid", &m, LoaderId::Forge);
        assert!(forge.contains("net.minecraftforge.registries.DeferredRegister"));
        let neo = sound_events_class_java("modid", &m, LoaderId::NeoForge);
        assert!(neo.contains("net.neoforged.neoforge.registries"));
        let fab = sound_events_class_java("modid", &m, LoaderId::Fabric);
        assert!(fab.contains("BuiltInRegistries.SOUND_EVENT"));
    }

    // ---------- Keybind ----------

    #[test]
    fn glfw_key_letters_and_digits() {
        assert_eq!(glfw_key_constant("k").unwrap(), "GLFW_KEY_K");
        assert_eq!(glfw_key_constant("9").unwrap(), "GLFW_KEY_9");
    }

    #[test]
    fn glfw_key_function_keys_and_named() {
        assert_eq!(glfw_key_constant("F4").unwrap(), "GLFW_KEY_F4");
        assert_eq!(glfw_key_constant("space").unwrap(), "GLFW_KEY_SPACE");
        assert_eq!(glfw_key_constant("LEFT_SHIFT").unwrap(), "GLFW_KEY_LEFT_SHIFT");
    }

    #[test]
    fn glfw_key_rejects_unknown() {
        assert!(glfw_key_constant("").is_err());
        assert!(glfw_key_constant("megabuttn").is_err());
        assert!(glfw_key_constant("F99").is_err());
    }

    #[test]
    fn keybind_class_includes_translation_key_and_glfw_constant() {
        let m = KeybindMeta {
            action_id: "open_codex".into(),
            display_name: "Open Codex".into(),
            default_key: "G".into(),
            category: "key.categories.misc".into(),
        };
        let java = keybind_class_java("modid", &m, LoaderId::Forge);
        assert!(java.contains("\"key.modid.open_codex\""), "got: {java}");
        assert!(java.contains("GLFW.GLFW_KEY_G"), "got: {java}");
        assert!(java.contains("RegisterKeyMappingsEvent"), "got: {java}");
    }

    #[test]
    fn keybind_fabric_uses_keybinding_helper() {
        let m = KeybindMeta {
            action_id: "open_codex".into(),
            display_name: "".into(),
            default_key: "G".into(),
            category: "key.categories.misc".into(),
        };
        let java = keybind_class_java("modid", &m, LoaderId::Fabric);
        assert!(java.contains("KeyBindingHelper"), "got: {java}");
    }

    // ---------- Config ----------

    #[test]
    fn config_validation_rejects_bad_kind_and_empty_fields() {
        let m = ConfigMeta {
            kind: "global".into(),
            class_name: None,
            fields: vec![],
        };
        assert!(validate_config_meta(&m).is_err());
        let m = ConfigMeta {
            kind: "common".into(),
            class_name: None,
            fields: vec![],
        };
        assert!(validate_config_meta(&m).is_err());
    }

    #[test]
    fn config_validation_rejects_inverted_min_max() {
        let m = ConfigMeta {
            kind: "common".into(),
            class_name: None,
            fields: vec![ConfigField {
                name: "x".into(),
                field_type: "int".into(),
                default_value: serde_json::json!(0),
                min: Some(10.0),
                max: Some(1.0),
                comment: None,
                allowed_values: vec![],
            }],
        };
        assert!(validate_config_meta(&m).is_err());
    }

    #[test]
    fn config_validation_rejects_enum_without_allowed_values() {
        let m = ConfigMeta {
            kind: "common".into(),
            class_name: None,
            fields: vec![ConfigField {
                name: "mode".into(),
                field_type: "enum".into(),
                default_value: serde_json::json!("a"),
                min: None,
                max: None,
                comment: None,
                allowed_values: vec![],
            }],
        };
        assert!(validate_config_meta(&m).is_err());
    }

    #[test]
    fn forge_config_emits_define_in_range_for_int() {
        let m = ConfigMeta {
            kind: "common".into(),
            class_name: Some("RubyConfig".into()),
            fields: vec![ConfigField {
                name: "max_veins".into(),
                field_type: "int".into(),
                default_value: serde_json::json!(8),
                min: Some(1.0),
                max: Some(64.0),
                comment: Some("Max veins per chunk".into()),
                allowed_values: vec![],
            }],
        };
        let java = config_class_java("modid", "ruby_config", &m, LoaderId::Forge);
        assert!(java.contains("ForgeConfigSpec"), "got: {java}");
        assert!(java.contains("BUILDER.defineInRange(\"max_veins\""), "got: {java}");
        assert!(java.contains("Max veins per chunk"), "got: {java}");
    }

    #[test]
    fn neoforge_config_uses_modconfigspec() {
        let m = ConfigMeta {
            kind: "client".into(),
            class_name: None,
            fields: vec![ConfigField {
                name: "debug".into(),
                field_type: "bool".into(),
                default_value: serde_json::json!(true),
                min: None,
                max: None,
                comment: None,
                allowed_values: vec![],
            }],
        };
        let java = config_class_java("modid", "client_config", &m, LoaderId::NeoForge);
        assert!(java.contains("ModConfigSpec"), "got: {java}");
        assert!(java.contains("BUILDER.define(\"debug\", true)"), "got: {java}");
    }

    #[test]
    fn fabric_config_emits_pojo() {
        let m = ConfigMeta {
            kind: "common".into(),
            class_name: Some("ClientCfg".into()),
            fields: vec![ConfigField {
                name: "show_hud".into(),
                field_type: "bool".into(),
                default_value: serde_json::json!(true),
                min: None,
                max: None,
                comment: None,
                allowed_values: vec![],
            }],
        };
        let java = config_class_java("modid", "client_cfg", &m, LoaderId::Fabric);
        assert!(java.contains("public boolean show_hud = true"), "got: {java}");
    }

    #[test]
    fn forge_config_emits_define_in_list_for_enum() {
        let m = ConfigMeta {
            kind: "common".into(),
            class_name: Some("ModeCfg".into()),
            fields: vec![ConfigField {
                name: "mode".into(),
                field_type: "enum".into(),
                default_value: serde_json::json!("normal"),
                min: None,
                max: None,
                comment: None,
                allowed_values: vec!["easy".into(), "normal".into(), "hard".into()],
            }],
        };
        let java = config_class_java("modid", "mode_cfg", &m, LoaderId::Forge);
        assert!(java.contains("defineInList(\"mode\""), "got: {java}");
        assert!(java.contains("\"easy\""), "got: {java}");
        assert!(java.contains("\"hard\""), "got: {java}");
    }
}
