#!/usr/bin/env node
/**
 * Windows Installer Build Script
 * Builds both NSIS installer and portable executable
 * Usage: node build-windows.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = __dirname;
const RELEASE_DIR = path.join(PROJECT_DIR, 'release');

console.log('🔨 Building Windows Installers...\n');

// Ensure release directory exists
if (!fs.existsSync(RELEASE_DIR)) {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
}

try {
  console.log('📦 Building NSIS Installer...');
  execSync('npx electron-builder --win nsis --publish never', {
    cwd: PROJECT_DIR,
    stdio: 'inherit',
  });

  console.log('\n✅ NSIS Installer built successfully!\n');

  console.log('📦 Building Portable Executable...');
  execSync('npx electron-builder --win portable --publish never', {
    cwd: PROJECT_DIR,
    stdio: 'inherit',
  });

  console.log('\n✅ Portable Executable built successfully!\n');

  // List generated files
  console.log('📋 Generated Files:');
  const files = fs.readdirSync(RELEASE_DIR).filter(f => f.endsWith('.exe'));
  files.forEach(file => {
    const filePath = path.join(RELEASE_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  ✓ ${file} (${sizeMB} MB)`);
  });

  console.log('\n🎉 All Windows installers built successfully!');
  console.log(`📁 Output directory: ${RELEASE_DIR}\n`);

  process.exit(0);
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
