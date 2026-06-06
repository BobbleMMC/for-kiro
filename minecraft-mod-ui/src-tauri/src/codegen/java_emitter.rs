use super::ast::{AstGraph, AstNode, NodeType};

/// Emits Java source code from AST graph
/// Generates Forge/Fabric compatible EventListener classes

pub struct JavaEmitter {
    pub namespace: String,
    pub class_name: String,
    pub mod_loader: String, // "forge" or "fabric"
}

impl JavaEmitter {
    pub fn new(namespace: &str, class_name: &str, mod_loader: &str) -> Self {
        Self {
            namespace: namespace.to_string(),
            class_name: class_name.to_string(),
            mod_loader: mod_loader.to_string(),
        }
    }

    /// Generate complete Java class from AST graph
    pub fn emit(&self, graph: &AstGraph) -> String {
        let mut output = String::new();

        // Package declaration
        output.push_str(&format!("package {}.events;\n\n", self.namespace));

        // Imports
        output.push_str(&self.generate_imports(graph));
        output.push('\n');

        // Class declaration
        if self.mod_loader == "forge" {
            output.push_str(&format!(
                "@Mod.EventBusSubscriber(modid = \"{}\", bus = Mod.EventBusSubscriber.Bus.FORGE)\n",
                self.namespace
            ));
        }
        output.push_str(&format!("public class {} {{\n\n", self.class_name));

        // Generate event handlers for each trigger
        for entry in &graph.entry_points {
            output.push_str(&self.emit_event_handler(entry));
            output.push('\n');
        }

        output.push_str("}\n");
        output
    }

    /// Generate imports based on used node types
    fn generate_imports(&self, _graph: &AstGraph) -> String {
        let mut imports = String::new();

        if self.mod_loader == "forge" {
            imports.push_str("import net.minecraftforge.event.entity.player.PlayerEvent;\n");
            imports.push_str("import net.minecraftforge.event.level.BlockEvent;\n");
            imports.push_str("import net.minecraftforge.event.entity.living.LivingDeathEvent;\n");
            imports.push_str("import net.minecraftforge.eventbus.api.SubscribeEvent;\n");
            imports.push_str("import net.minecraftforge.fml.common.Mod;\n");
        } else {
            imports.push_str("import net.fabricmc.fabric.api.event.player.PlayerBlockBreakEvents;\n");
            imports.push_str("import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;\n");
        }

        imports.push_str("import net.minecraft.world.entity.player.Player;\n");
        imports.push_str("import net.minecraft.world.level.Level;\n");
        imports.push_str("import net.minecraft.core.BlockPos;\n");
        imports.push_str("import net.minecraft.network.chat.Component;\n");
        imports
    }

    /// Emit a single event handler method
    fn emit_event_handler(&self, trigger: &AstNode) -> String {
        let mut code = String::new();

        let (event_annotation, method_name, event_param) = match &trigger.node_type {
            NodeType::Trigger(t) => {
                let (annotation, param) = self.get_event_info(&t.event_type);
                let method = format!("on{}", capitalize(&t.event_type));
                (annotation, method, param)
            }
            _ => return String::new(),
        };

        // Method annotation
        code.push_str(&format!("    {}\n", event_annotation));
        code.push_str(&format!(
            "    public static void {}({} event) {{\n",
            method_name, event_param
        ));

        // Generate body from children
        for child in &trigger.children {
            code.push_str(&self.emit_node(child, 2));
        }

        code.push_str("    }\n");
        code
    }

    /// Emit code for a single AST node
    fn emit_node(&self, node: &AstNode, indent: usize) -> String {
        let pad = "    ".repeat(indent);
        let mut code = String::new();

        match &node.node_type {
            NodeType::Condition(cond) => {
                code.push_str(&format!(
                    "{}if ({} {} {}) {{\n",
                    pad,
                    cond.left_operand
                        .as_ref()
                        .map(|n| self.value_str(n))
                        .unwrap_or_else(|| "true".to_string()),
                    cond.operator,
                    cond.right_operand
                        .as_ref()
                        .map(|n| self.value_str(n))
                        .unwrap_or_else(|| "true".to_string()),
                ));

                for child in &node.children {
                    code.push_str(&self.emit_node(child, indent + 1));
                }

                code.push_str(&format!("{}}}\n", pad));
            }
            NodeType::Action(action) => {
                code.push_str(&self.emit_action(action, &pad));

                for child in &node.children {
                    code.push_str(&self.emit_node(child, indent));
                }
            }
            NodeType::Value(_) => {
                // Values are referenced by other nodes, not emitted directly
            }
            NodeType::Trigger(_) => {
                // Nested triggers not supported
            }
        }

        code
    }

    /// Emit an action node as Java statement
    fn emit_action(&self, action: &super::ast::ActionNode, pad: &str) -> String {
        match action.action_type.as_str() {
            "sendMessage" => {
                let msg = action
                    .parameters
                    .first()
                    .map(|p| p.value.clone())
                    .unwrap_or_else(|| "Hello World".to_string());
                format!(
                    "{}player.sendSystemMessage(Component.literal(\"{}\"));\n",
                    pad, msg
                )
            }
            "setBlock" => {
                format!(
                    "{}level.setBlockAndUpdate(pos, Blocks.STONE.defaultBlockState());\n",
                    pad
                )
            }
            "giveItem" => {
                format!(
                    "{}player.getInventory().add(new ItemStack(Items.DIAMOND, 1));\n",
                    pad
                )
            }
            "spawnEntity" => {
                format!(
                    "{}// TODO: Spawn entity at position\n{}level.addFreshEntity(entity);\n",
                    pad, pad
                )
            }
            "playSound" => {
                format!(
                    "{}level.playSound(null, player.blockPosition(), SoundEvents.EXPERIENCE_ORB_PICKUP, SoundSource.PLAYERS);\n",
                    pad
                )
            }
            _ => {
                format!("{}// Action: {}\n", pad, action.action_type)
            }
        }
    }

    /// Get event annotation and parameter type
    fn get_event_info(&self, event_type: &str) -> (String, String) {
        if self.mod_loader == "forge" {
            match event_type {
                "onBlockBreak" | "blockBreak" => (
                    "@SubscribeEvent".to_string(),
                    "BlockEvent.BreakEvent".to_string(),
                ),
                "onPlayerJoin" | "playerJoin" => (
                    "@SubscribeEvent".to_string(),
                    "PlayerEvent.PlayerLoggedInEvent".to_string(),
                ),
                "onEntityDeath" | "entityDeath" => (
                    "@SubscribeEvent".to_string(),
                    "LivingDeathEvent".to_string(),
                ),
                _ => (
                    "@SubscribeEvent".to_string(),
                    "PlayerEvent".to_string(),
                ),
            }
        } else {
            // Fabric uses lambda registrations instead of annotations
            ("// Fabric Event".to_string(), "Object".to_string())
        }
    }

    /// Get value string for an AST node
    fn value_str(&self, _node: &AstNode) -> String {
        "true".to_string()
    }
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}
