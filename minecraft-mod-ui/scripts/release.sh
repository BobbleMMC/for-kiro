#!/usr/bin/env bash
# ----------------------------------------------------------------------------
#  release.sh — produce a per-platform release archive.
#
#  Steps (host-platform aware):
#    1. Regenerate resources/studio.bin + resources/manifest.json
#    2. Run `cargo tauri build` with the size-optimised release profile
#    3. Collect the platform-native installer (.exe / .dmg / .AppImage / .deb)
#    4. Copy resources/studio.bin and manifest.json side-by-side
#    5. Zip the trio into release-out/<target>/<product>-<version>-<target>.zip
#
#  The resulting ZIP layout:
#
#    Minecraft-Mod-Studio-1.0.0-windows.zip
#    ├── Minecraft.Mod.Studio.Setup.exe   (~5–8 MB with WebView2 web installer)
#    ├── studio.bin                        (gzipped tar of templates / prompts)
#    └── manifest.json                     (sidecar manifest)
#
#  The installer copies studio.bin next to the exe at install time so the
#  Rust resource loader finds it via Tauri's resource_dir().
# ----------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

PRODUCT="Minecraft-Mod-Studio"
VERSION="$(node -p "require('./package.json').version")"

# ---------- target detection ----------
case "${1:-${OSTYPE:-}}" in
  *linux*|linux)   TARGET="linux";   BUNDLE_DIR="src-tauri/target/release/bundle";;
  *darwin*|macos)  TARGET="macos";   BUNDLE_DIR="src-tauri/target/release/bundle";;
  *msys*|*cygwin*|*win*|windows) TARGET="windows"; BUNDLE_DIR="src-tauri/target/release/bundle";;
  *) echo "Unknown OSTYPE='${OSTYPE:-}'. Pass 'linux', 'macos', or 'windows'." >&2; exit 2;;
esac

OUT_DIR="release-out/${TARGET}"
STAGE_DIR="release-out/_stage_${TARGET}"
ZIP_NAME="${PRODUCT}-${VERSION}-${TARGET}.zip"

echo "==> Target:  ${TARGET}"
echo "==> Version: ${VERSION}"

# ---------- 1. Resources sidecar ----------
echo "==> [1/4] Building resource sidecar (studio.bin)"
node scripts/build-resources.mjs

# ---------- 2. Tauri build ----------
echo "==> [2/4] Building Tauri release (this can take 5–15 minutes)"
if [[ -z "${SKIP_TAURI_BUILD:-}" ]]; then
  ( cd src-tauri && cargo tauri build )
else
  echo "    SKIP_TAURI_BUILD set — assuming bundle already exists"
fi

# ---------- 3. Stage installer + sidecar ----------
echo "==> [3/4] Staging artifacts"
rm -rf "${STAGE_DIR}"
mkdir -p "${STAGE_DIR}"

case "${TARGET}" in
  windows)
    INSTALLER="$(find "${BUNDLE_DIR}/nsis" -name '*-setup.exe' | head -1 || true)"
    [[ -z "${INSTALLER}" ]] && { echo "NSIS installer not found"; exit 3; }
    cp "${INSTALLER}" "${STAGE_DIR}/${PRODUCT}-Setup-${VERSION}.exe"
    ;;
  macos)
    INSTALLER="$(find "${BUNDLE_DIR}/dmg" -name '*.dmg' | head -1 || true)"
    [[ -z "${INSTALLER}" ]] && { echo "DMG not found"; exit 3; }
    cp "${INSTALLER}" "${STAGE_DIR}/${PRODUCT}-${VERSION}.dmg"
    ;;
  linux)
    APPIMAGE="$(find "${BUNDLE_DIR}/appimage" -name '*.AppImage' | head -1 || true)"
    DEB="$(find "${BUNDLE_DIR}/deb" -name '*.deb' | head -1 || true)"
    [[ -n "${APPIMAGE}" ]] && cp "${APPIMAGE}" "${STAGE_DIR}/${PRODUCT}-${VERSION}.AppImage"
    [[ -n "${DEB}" ]]      && cp "${DEB}"      "${STAGE_DIR}/${PRODUCT}-${VERSION}.deb"
    [[ -z "${APPIMAGE}${DEB}" ]] && { echo "Neither AppImage nor .deb found"; exit 3; }
    ;;
esac

cp resources/studio.bin     "${STAGE_DIR}/studio.bin"
cp resources/manifest.json  "${STAGE_DIR}/manifest.json"

# README inside the zip with install instructions
cat > "${STAGE_DIR}/INSTALL.txt" <<EOF
${PRODUCT} ${VERSION} — ${TARGET}

This archive contains:
  • Installer / app bundle
  • studio.bin       — content sidecar (templates, prompts, themes)
  • manifest.json    — sidecar manifest (do not delete)

Install steps:
  Windows: double-click the .exe, follow the wizard. The installer copies
           studio.bin next to the program automatically.
  macOS:   open the .dmg, drag the app into /Applications, then drag
           studio.bin and manifest.json into the same folder.
  Linux:   AppImage — chmod +x, then run. Place studio.bin next to the
           AppImage. .deb — sudo apt install ./*.deb (sidecar auto-installed
           into /usr/lib/${PRODUCT,,}/).

Generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

# ---------- 4. Zip everything ----------
echo "==> [4/4] Compressing release"
mkdir -p "${OUT_DIR}"
( cd "${STAGE_DIR}" && zip -9 -r "${ROOT}/${OUT_DIR}/${ZIP_NAME}" . )
rm -rf "${STAGE_DIR}"

ZIP_SIZE=$(du -h "${OUT_DIR}/${ZIP_NAME}" | cut -f1)
echo
echo "✓ Release ready: ${OUT_DIR}/${ZIP_NAME} (${ZIP_SIZE})"
ls -la "${OUT_DIR}/${ZIP_NAME}"
