# Electron Setup Guide

This guide will help you set up and run Presentation AI as an Electron desktop application.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- PostgreSQL database (for development) or SQLite (for production)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory with your configuration:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/presentation_ai"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   OPENAI_API_KEY="your-openai-key"
   TOGETHER_AI_API_KEY="your-together-ai-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   # ... other API keys
   ```

3. **Set up the database:**
   ```bash
   npm run db:push
   ```

## Development

### Run in Development Mode

To run the app in development mode with hot reload:

```bash
npm run dev:electron
```

This will:
1. Start the Next.js development server
2. Wait for it to be ready
3. Launch the Electron window

### Run Electron Only (if Next.js is already running)

```bash
npm run electron:dev
```

## Building for Production

### 1. Build Next.js Application

```bash
npm run build
```

### 2. Build Electron App

#### Package (without installer):
```bash
npm run electron:pack
```

#### Create Distributable:
```bash
npm run build:electron
```

This will create platform-specific installers in the `dist-electron` directory:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` file
- **Linux**: `.AppImage` file

## Project Structure

```
presentation-ai-updated/
├── electron/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Preload script for security
│   └── database.js      # Database helper for Electron
├── electron-builder.config.js  # Electron Builder configuration
└── ...
```

## Key Features

### Database Handling

- **Development**: Uses PostgreSQL from your `.env` file
- **Production**: Can be configured to use SQLite for local storage

### Security

- Context isolation enabled
- Node integration disabled in renderer
- Preload script for safe API exposure

### Window Management

- Auto-opens DevTools in development
- Handles external links properly
- Prevents new window creation

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, you can change it by modifying `serverPort` in `electron/main.js`.

### Database Connection Issues

Make sure your `DATABASE_URL` is correctly set in the `.env` file. For production builds, you may want to switch to SQLite.

### Build Errors

1. Make sure all dependencies are installed: `npm install`
2. Ensure Prisma is generated: `npm run postinstall`
3. Check that Next.js build completed: `npm run build`

## Platform-Specific Notes

### macOS

- May require code signing for distribution
- Gatekeeper may need entitlements configured

### Windows

- NSIS installer is used by default
- Desktop and Start Menu shortcuts are created

### Linux

- AppImage format is used
- May need additional dependencies on some distributions

## Next Steps

1. Customize the app icon in `assets/` directory
2. Update `electron-builder.config.js` with your app details
3. Configure code signing for distribution
4. Test the app on all target platforms

## Support

For issues or questions, please check the main README.md or open an issue on GitHub.

