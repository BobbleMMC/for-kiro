//! JSON Schema embedding.
//!
//! The on-disk JSON Schema (`schemas/studio.project.schema.json`) is
//! shipped as a static byte slice via `include_bytes!`. We expose it both
//! as raw bytes (for tooling that wants to write it to disk) and parsed
//! `serde_json::Value` (so the validator can use it).
//!
//! Layer 1 deliberately does NOT pull in a heavyweight `jsonschema` crate.
//! Strict structural validation is achieved via `serde` deserialization
//! with `deny_unknown_fields`, plus the semantic checks in `validator.rs`.
//! The JSON Schema file is shipped primarily for IDE auto-completion and
//! external tools — when Layer 2+ needs runtime JSON Schema validation,
//! we'll add the crate then.

/// Raw schema bytes, embedded at compile time.
pub const SCHEMA_BYTES: &[u8] =
    include_bytes!("../../schemas/studio.project.schema.json");

/// Parse the embedded schema into a `serde_json::Value`. Cheap (a few KB
/// of JSON), but allocates each time — callers that need it repeatedly
/// should cache.
pub fn schema_value() -> serde_json::Value {
    serde_json::from_slice(SCHEMA_BYTES).expect(
        "embedded studio.project.schema.json must be valid JSON (build-time invariant)",
    )
}

/// `$id` of the schema. Useful when emitting `$schema` references inside
/// generated manifests for IDE auto-completion.
pub fn schema_id() -> String {
    schema_value()
        .get("$id")
        .and_then(|v| v.as_str())
        .map(str::to_owned)
        .unwrap_or_else(|| "studio.project.schema.json".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_schema_is_valid_json() {
        let value = schema_value();
        assert!(value.is_object(), "schema root must be an object");
        assert_eq!(
            value.get("type").and_then(|v| v.as_str()),
            Some("object"),
            "schema root .type must be \"object\""
        );
    }

    #[test]
    fn schema_declares_required_top_level_fields() {
        let value = schema_value();
        let required = value
            .get("required")
            .and_then(|v| v.as_array())
            .expect("schema.required must exist and be an array");
        let required_names: Vec<&str> = required.iter().filter_map(|v| v.as_str()).collect();
        for field in [
            "schemaVersion",
            "studioVersion",
            "project",
            "paths",
            "metadata",
        ] {
            assert!(
                required_names.contains(&field),
                "schema.required is missing top-level field {}",
                field
            );
        }
    }
}
