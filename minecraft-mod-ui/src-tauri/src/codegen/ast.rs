use serde::{Deserialize, Serialize};

/// Abstract Syntax Tree representation for visual node graphs
/// Converts React Flow JSON into a logical tree structure

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    /// Entry points - triggers that start execution (Red nodes)
    Trigger(TriggerNode),
    /// Conditional branches (Yellow nodes)
    Condition(ConditionNode),
    /// Actions that modify game state (Blue nodes)
    Action(ActionNode),
    /// Variable/value nodes (Green nodes)
    Value(ValueNode),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggerNode {
    pub event_type: String, // e.g., "onBlockBreak", "onPlayerJoin", "onEntityDeath"
    pub parameters: Vec<Parameter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionNode {
    pub condition_type: String, // e.g., "if", "switch", "compare"
    pub left_operand: Option<Box<AstNode>>,
    pub right_operand: Option<Box<AstNode>>,
    pub operator: String, // "==", "!=", ">", "<", ">=", "<="
    pub true_branch: Vec<AstNode>,
    pub false_branch: Vec<AstNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionNode {
    pub action_type: String, // e.g., "setBlock", "spawnEntity", "giveItem", "sendMessage"
    pub target: Option<String>,
    pub parameters: Vec<Parameter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueNode {
    pub value_type: ValueType,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValueType {
    Integer,
    Float,
    String,
    Boolean,
    BlockRef,
    ItemRef,
    EntityRef,
    Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parameter {
    pub name: String,
    pub param_type: ValueType,
    pub value: String,
    pub is_connected: bool, // Whether value comes from another node's output
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AstNode {
    pub id: String,
    pub node_type: NodeType,
    pub position: (f64, f64),
    pub children: Vec<AstNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AstGraph {
    pub name: String,
    pub entry_points: Vec<AstNode>, // All trigger nodes (roots)
}

/// Parse React Flow nodes/edges JSON into AST
pub fn parse_graph(nodes_json: &str, edges_json: &str) -> Result<AstGraph, String> {
    let nodes: Vec<serde_json::Value> =
        serde_json::from_str(nodes_json).map_err(|e| format!("Invalid nodes JSON: {}", e))?;
    let edges: Vec<serde_json::Value> =
        serde_json::from_str(edges_json).map_err(|e| format!("Invalid edges JSON: {}", e))?;

    // Find trigger (entry) nodes
    let entry_points: Vec<AstNode> = nodes
        .iter()
        .filter(|node| {
            node.get("type")
                .and_then(|t| t.as_str())
                .map(|t| t == "trigger" || t == "event")
                .unwrap_or(false)
        })
        .map(|node| build_ast_node(node, &nodes, &edges))
        .collect::<Result<Vec<_>, _>>()?;

    Ok(AstGraph {
        name: "generated_graph".to_string(),
        entry_points,
    })
}

/// Build AST node recursively following edges
fn build_ast_node(
    node: &serde_json::Value,
    all_nodes: &[serde_json::Value],
    all_edges: &[serde_json::Value],
) -> Result<AstNode, String> {
    let id = node
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let node_type_str = node
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("action");

    let position = node
        .get("position")
        .map(|p| {
            let x = p.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let y = p.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
            (x, y)
        })
        .unwrap_or((0.0, 0.0));

    let data = node.get("data").cloned().unwrap_or(serde_json::Value::Null);

    // Find child nodes connected via edges from this node
    let child_ids: Vec<String> = all_edges
        .iter()
        .filter(|edge| {
            edge.get("source")
                .and_then(|s| s.as_str())
                .map(|s| s == id)
                .unwrap_or(false)
        })
        .filter_map(|edge| edge.get("target").and_then(|t| t.as_str()).map(String::from))
        .collect();

    let children: Vec<AstNode> = child_ids
        .iter()
        .filter_map(|child_id| all_nodes.iter().find(|n| n.get("id").and_then(|v| v.as_str()) == Some(child_id)))
        .map(|child_node| build_ast_node(child_node, all_nodes, all_edges))
        .collect::<Result<Vec<_>, _>>()?;

    let node_type = match node_type_str {
        "trigger" | "event" => NodeType::Trigger(TriggerNode {
            event_type: data
                .get("eventType")
                .and_then(|v| v.as_str())
                .unwrap_or("onCustomEvent")
                .to_string(),
            parameters: vec![],
        }),
        "condition" | "if" => NodeType::Condition(ConditionNode {
            condition_type: "if".to_string(),
            left_operand: None,
            right_operand: None,
            operator: data
                .get("operator")
                .and_then(|v| v.as_str())
                .unwrap_or("==")
                .to_string(),
            true_branch: vec![],
            false_branch: vec![],
        }),
        "action" => NodeType::Action(ActionNode {
            action_type: data
                .get("actionType")
                .and_then(|v| v.as_str())
                .unwrap_or("custom")
                .to_string(),
            target: data.get("target").and_then(|v| v.as_str()).map(String::from),
            parameters: vec![],
        }),
        _ => NodeType::Value(ValueNode {
            value_type: ValueType::String,
            value: data
                .get("value")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        }),
    };

    Ok(AstNode {
        id,
        node_type,
        position,
        children,
    })
}
