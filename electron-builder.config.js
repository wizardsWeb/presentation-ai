const path = require('path');

module.exports = {
  appId: 'com.presentationai.app',
  productName: 'Presentation AI',
  copyright: 'Copyright © 2024',
  
  directories: {
    output: 'dist-electron',
    buildResources: 'build',
  },
  
  files: [
    'electron/**/*',
    '.next/**/*',
    'node_modules/**/*',
    'package.json',
    'prisma/**/*',
    'public/**/*',
    'src/**/*',
    '!node_modules/.cache/**/*',
    '!**/*.{md,ts,tsx}',
    '!**/__tests__/**/*',
    '!**/tests/**/*',
    '!**/*.test.{js,ts,tsx}',
    '!**/*.spec.{js,ts,tsx}',
  ],
  
  extraResources: [
    {
      from: 'prisma',
      to: 'prisma',
      filter: ['**/*'],
    },
  ],
  
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'assets/icon.ico',
  },
  
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'assets/icon.icns',
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },
  
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
    ],
    icon: 'assets/icon.png',
    category: 'Office',
  },
  
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  
  // Prisma binary targets
  afterPack: async (context) => {
    // Copy Prisma binaries for the target platform
    const { platform, arch } = context;
    // This will be handled by Prisma's postinstall script
  },
};

