# Electron Configuration

This directory contains the Electron-specific files for the desktop application.

## Files

- **main.js**: Main Electron process that creates the application window and manages the Next.js server
- **preload.js**: Preload script that safely exposes Electron APIs to the renderer process
- **database.js**: Helper functions for managing the database in Electron context

## How It Works

1. **Main Process** (`main.js`):
   - Initializes the database connection
   - Starts the Next.js server (dev or production)
   - Creates and manages the Electron window
   - Handles window lifecycle events

2. **Preload Script** (`preload.js`):
   - Provides a secure bridge between the main process and renderer
   - Exposes only necessary Electron APIs
   - Maintains context isolation for security

3. **Database Helper** (`database.js`):
   - Manages database URL for Electron
   - Handles local file paths for production
   - Can be extended to support SQLite for offline mode

## Development

Run `npm run dev:electron` from the project root to start both Next.js and Electron in development mode.

## Production

The Electron app will be built using `electron-builder` which packages the Next.js app along with Electron.

