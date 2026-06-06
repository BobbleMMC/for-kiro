//! Tauri command for the Vanilla+ template library.
//!
//! `generate_vanilla_plus_variants(...)` takes a base block + a list of
//! variant kinds (slab / stairs / wall / fence / etc.) and returns
//! every Java + JSON file the user needs to register them.

use crate::commands::codegen_commands::GeneratedFile;
use crate::feature_system::vanilla_plus::{emit_vanilla_plus, VanillaPlusRequest};

#[tauri::command]
pub async fn generate_vanilla_plus_variants(
    request: VanillaPlusRequest,
) -> Result<Vec<GeneratedFile>, String> {
    emit_vanilla_plus(&request)
}
