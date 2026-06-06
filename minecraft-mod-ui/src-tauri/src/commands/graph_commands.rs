use tauri::State;

use crate::db::operations::VisualGraph;
use super::project_commands::DbState;

#[tauri::command]
pub async fn save_visual_graph(
    db: State<'_, DbState>,
    id: Option<i64>,
    project_id: i64,
    graph_name: String,
    graph_type: String,
    nodes_json: String,
    edges_json: String,
    viewport_json: String,
) -> Result<i64, String> {
    let graph = VisualGraph {
        id,
        project_id,
        graph_name,
        graph_type,
        nodes_json,
        edges_json,
        viewport_json,
        is_active: true,
    };

    db.0.save_visual_graph(&graph)
        .map_err(|e| format!("Failed to save graph: {}", e))
}

#[tauri::command]
pub async fn get_visual_graphs(
    db: State<'_, DbState>,
    project_id: i64,
) -> Result<Vec<VisualGraph>, String> {
    db.0.get_visual_graphs(project_id)
        .map_err(|e| format!("Failed to get graphs: {}", e))
}
