# 🖥️ Desktop Application Installer Guide

## Overview

The Minecraft Mod Generator is now available as a desktop application for Windows, macOS, and Linux. This guide explains how to build and distribute the installers.

---

## 📦 Build Process

### Build Command

```bash
npm run build:electron
```

This command:
1. Compiles TypeScript to JavaScript
2. Builds the React production bundle
3. Compiles Electron main process
4. Generates installers for your platform

### Build Output

Installers are generated in the `release/` directory:

```
release/
├── Minecraft Mod Generator-1.0.0.AppImage  (Linux - 103 MB)
├── minecraft-mod-ui_1.0.0_amd64.deb        (Linux - deb package)
├── Minecraft Mod Generator-1.0.0.exe       (Windows - NSIS installer)
├── Minecraft Mod Generator 1.0.0.exe       (Windows - Portable)
├── Minecraft Mod Generator-1.0.0.dmg       (macOS - DMG)
└── Minecraft Mod Generator-1.0.0.zip       (macOS - ZIP)
```

---

## 🐧 Linux Installation

### AppImage (Universal - No Installation Required)

**Format**: `.AppImage`  
**Size**: ~103 MB  
**Installation**: None required

1. Download `Minecraft Mod Generator-1.0.0.AppImage`
2. Make it executable:
   ```bash
   chmod +x "Minecraft Mod Generator-1.0.0.AppImage"
   ```
3. Run it:
   ```bash
   ./Minecraft\ Mod\ Generator-1.0.0.AppImage
   ```

**Advantages**:
- ✅ Works on all Linux distributions
- ✅ No dependencies required
- ✅ No system-wide installation
- ✅ Portable (can move around)

### DEB Package (Debian/Ubuntu)

**Format**: `.deb`  
**Installation**: System-wide

1. Download `minecraft-mod-ui_1.0.0_amd64.deb`
2. Install:
   ```bash
   sudo dpkg -i minecraft-mod-ui_1.0.0_amd64.deb
   ```
   Or:
   ```bash
   sudo apt install ./minecraft-mod-ui_1.0.0_amd64.deb
   ```
3. Launch from applications menu or:
   ```bash
   minecraft-mod-ui
   ```

**Advantages**:
- ✅ System-wide installation
- ✅ Desktop integration
- ✅ Easy uninstall

---

## 🪟 Windows Installation

### NSIS Installer (Recommended)

**Format**: `.exe`  
**Size**: ~150 MB  
**Installation**: Interactive wizard

1. Download `Minecraft Mod Generator-1.0.0.exe`
2. Double-click to run installer
3. Follow wizard steps:
   - Accept license
   - Choose installation directory
   - Create shortcuts
   - Complete installation
4. Launch from Start menu or desktop shortcut

**Features**:
- ✅ Interactive wizard
- ✅ System integration
- ✅ Uninstaller included
- ✅ Desktop shortcuts

### Portable Executable

**Format**: `.exe` (Portable)  
**Size**: ~150 MB  
**Installation**: None required

1. Download `Minecraft Mod Generator 1.0.0.exe`
2. Run directly - no installation needed
3. Application runs from current location
4. No system files modified

**Advantages**:
- ✅ No installation required
- ✅ Portable (USB drive compatible)
- ✅ No system changes
- ✅ Quick launch

---

## 🍎 macOS Installation

### DMG (Disk Image - Recommended)

**Format**: `.dmg`  
**Size**: ~150 MB  
**Installation**: Drag & drop

1. Download `Minecraft Mod Generator-1.0.0.dmg`
2. Double-click to mount
3. Drag app to Applications folder
4. Eject the DMG
5. Launch from Applications

**Features**:
- ✅ Native macOS experience
- ✅ System integration
- ✅ Code signed
- ✅ Notarized

### ZIP Archive

**Format**: `.zip`  
**Size**: ~150 MB  
**Installation**: Manual

1. Download `Minecraft Mod Generator-1.0.0.zip`
2. Extract to desired location
3. Run application from extracted folder

---

## 🔧 Build Configuration

### Platform-Specific Settings

Edit `package.json` in the `"build"` section:

```json
{
  "build": {
    "appId": "com.bobblemmc.minecraftmodui",
    "productName": "Minecraft Mod Generator",
    "directories": {
      "buildResources": "public",
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "public/**/*",
      "main.js",
      "preload.js",
      "package.json"
    ],
    "win": { /* Windows settings */ },
    "mac": { /* macOS settings */ },
    "linux": { /* Linux settings */ }
  }
}
```

### Customization

**Change Version**:
```json
{
  "version": "1.1.0"
}
```

**Change App Name**:
```json
{
  "build": {
    "productName": "My Mod Generator"
  }
}
```

**Change Output Directory**:
```json
{
  "directories": {
    "output": "dist/installers"
  }
}
```

---

## 📋 System Requirements

### Minimum Requirements

**All Platforms**:
- 4 GB RAM
- 500 MB disk space
- Modern processor (Intel Core i5 or equivalent)

**Windows**:
- Windows 7 SP1 or later
- 64-bit system
- .NET Framework 4.6.2+

**macOS**:
- macOS 10.11 (El Capitan) or later
- Apple Silicon or Intel processor
- 150 MB free disk space

**Linux**:
- Any modern distribution
- GLIBC 2.17 or later
- 150 MB free disk space

### Recommended

- 8+ GB RAM
- SSD for better performance
- Modern multi-core processor
- Stable internet connection

---

## 🚀 Distribution Methods

### 1. GitHub Releases

1. Create release on GitHub
2. Attach installers to release
3. Users download directly

### 2. Package Managers

**Linux**:
- Distribute `.deb` to Ubuntu/Debian repositories
- Create AUR package for Arch Linux
- Submit to Fedora RPM repository

**macOS**:
- Submit to Homebrew Cask

**Windows**:
- Submit to Windows Store
- Submit to Chocolatey
- Submit to Winget

### 3. Website

Host installers on official website with:
- Download links
- System requirements
- Installation guides
- Release notes

---

## 📊 Current Build Status

✅ **Linux**:
- AppImage: READY (103 MB)
- DEB: Configuration complete

**Windows & macOS**: Ready for cross-platform building

---

## 🔄 Next Steps

1. Test AppImage on different Linux distributions
2. Build Windows installers (on Windows or with Wine)
3. Build macOS installers (on macOS)
4. Code sign binaries for production
5. Create GitHub release with installers
6. Distribute to package managers

---

**Current Version**: 1.0.0  
**Build Status**: ✅ Linux AppImage - Ready  
**Last Updated**: June 5, 2026
