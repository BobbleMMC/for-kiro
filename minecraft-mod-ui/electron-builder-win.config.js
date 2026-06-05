/**
 * Electron Builder Windows Configuration
 * Optimized for Windows NSIS and Portable builds
 */

module.exports = {
  appId: 'com.bobblemmc.minecraftmodui',
  productName: 'Minecraft Mod Generator',
  
  directories: {
    buildResources: 'public',
    output: 'release'
  },

  files: [
    'dist/**/*',
    'public/**/*',
    'main.js',
    'preload.js',
    'package.json'
  ],

  extraMetadata: {
    main: 'main.js'
  },

  // Windows-specific configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    icon: 'public/favicon.svg',
    certificateFile: process.env.WIN_CSC_LINK,
    certificatePassword: process.env.WIN_CSC_KEY_PASSWORD,
    signingHashAlgorithms: ['sha256'],
    sign: './customSign.js'
  },

  // NSIS Installer configuration
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Minecraft Mod Generator',
    installerIcon: 'public/favicon.svg',
    uninstallerIcon: 'public/favicon.svg',
    installerHeaderIcon: 'public/favicon.svg',
    
    // Install directory
    defaultInstallationPath: '$ProgramFiles/Minecraft Mod Generator',
    
    // License agreement
    license: 'LICENSE',
    
    // Installer script customization
    include: './installer-script.nsi'
  },

  // Portable executable configuration
  portable: {
    artifactName: '${productName}.exe'
  }
};
