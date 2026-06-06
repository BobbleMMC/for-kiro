# Resource sidecar source files

Everything in this directory is bundled at release time into a single
`resources/studio.bin` archive (gzipped tarball). The Tauri installer
ships this archive *next to* the executable instead of embedding it,
which keeps the installer download small and lets us update template
content without rebuilding the binary.

## Layout

- `templates/` — project skeletons (Forge / Fabric / NeoForge / Bedrock)
- `prompts/`   — AI agent prompt templates (codegen, debug, migration)
- `themes/`    — colour scheme JSON files

## Adding a resource

1. Drop the file under the appropriate sub-directory.
2. Run `npm run build:resources` from the project root.
3. Commit both the source file and the regenerated `resources/studio.bin`
   + `resources/manifest.json`.

The Rust backend lazily extracts entries on demand via `app_lib::resources`.
