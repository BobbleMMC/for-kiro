# Release Guide

Minecraft Mod Studio ships as **three platform-native ZIP archives**, one for
each supported OS. Each ZIP contains a small installer plus a separate
content sidecar (`studio.bin`), so installer downloads stay lean and content
updates don't need a binary rebuild.

## Archive contents

```
Minecraft-Mod-Studio-1.0.0-windows.zip
├── Minecraft-Mod-Studio-Setup-1.0.0.exe   ← NSIS installer (LZMA, ~5–8 MB)
├── studio.bin                              ← gzipped tar of templates etc.
├── manifest.json                           ← sidecar manifest (sha256 + sizes)
└── INSTALL.txt                             ← short install guide

Minecraft-Mod-Studio-1.0.0-macos.zip
├── Minecraft-Mod-Studio-1.0.0.dmg          ← signed disk image
├── studio.bin
├── manifest.json
└── INSTALL.txt

Minecraft-Mod-Studio-1.0.0-linux.zip
├── Minecraft-Mod-Studio-1.0.0.AppImage     ← portable, no install needed
├── Minecraft-Mod-Studio-1.0.0.deb          ← Debian / Ubuntu package
├── studio.bin
├── manifest.json
└── INSTALL.txt
```

## Why a separate `studio.bin`?

| Property              | Embedded resources | Sidecar `studio.bin`         |
| --------------------- | ------------------ | ---------------------------- |
| Installer size        | Larger             | Smaller (gzip-once)          |
| Content hot-patch     | Requires rebuild   | Replace one file             |
| Per-platform installer| Different binary   | Same `.bin` on all platforms |
| First-launch I/O      | None               | One file open + decompress   |

The `studio.bin` is a gzipped tar archive whose entries are listed (with
sha256 + size) in `manifest.json`. The Rust backend memory-maps it on
startup via `app_lib::resources::init`, so only **one** decompression pass
happens for the lifetime of the app.

## Building locally

```bash
# Per-platform release (auto-detects OS):
npm run release

# Or pass a target explicitly:
bash scripts/release.sh linux
bash scripts/release.sh macos
bash scripts/release.sh windows

# Skip the (slow) Tauri compile if a bundle already exists:
SKIP_TAURI_BUILD=1 npm run release

# Just rebuild the sidecar without touching the binary:
npm run build:resources
```

Output goes to `release-out/<target>/<product>-<version>-<target>.zip`.

## CI builds

Every push of a tag matching `v*` triggers
[`.github/workflows/release.yml`](../.github/workflows/release.yml), which:

1. Runs the release script on Ubuntu, macOS and Windows in parallel.
2. Uploads each ZIP as a job artifact.
3. Attaches all three ZIPs to the auto-generated GitHub Release.

You can also trigger it manually via *Actions → Release → Run workflow*.

## Installer size optimisations

| Optimisation                         | Saving (Windows NSIS) |
| ------------------------------------ | --------------------- |
| `compression: lzma` (vs zlib)        | ~25 %                 |
| Sidecar resources (vs embed)         | ~15 %                 |
| `webviewInstallMode: downloadBootstrapper` | ~15–25 % (skips the embedded WebView2) |
| Rust release profile (`opt-level=z`, `lto=fat`, `panic=abort`, `strip`) | ~30–40 % off the binary |

Combined, these halve the typical Tauri NSIS installer size to roughly
**5–8 MB** for an app of this scope (vs. ~14–18 MB by default).

## Hot-patching content

To ship new templates without releasing a new binary:

1. Add / edit files in `resources-src/`.
2. Run `npm run build:resources`.
3. Replace `studio.bin` + `manifest.json` next to the installed executable.
4. Restart the app.

The Rust loader detects mismatched checksums vs. its in-memory cache and
re-loads on next launch.

## Sandbox note

The Tauri build needs `webkit2gtk` on Linux runners; this is pre-installed
on `ubuntu-22.04`. Local builds in restricted environments (no GTK) can
still produce the resource sidecar (`npm run build:resources`) but skip
the Tauri step with `SKIP_TAURI_BUILD=1`.
