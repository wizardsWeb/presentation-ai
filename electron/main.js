const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { initializeDatabase } = require('./database');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Load .env file if it exists
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    });
    console.log('Loaded .env file');
  } else {
    console.warn('.env file not found. Make sure to set environment variables.');
  }
}

// Load environment variables before anything else
loadEnvFile();

let mainWindow = null;
let nextServer = null;
let serverPort = 3000;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, '../assets/icon.png'), // Add your app icon
    show: false, // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window creation
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Load the app
  if (isDev) {
    // In development, wait for Next.js server to be ready
    waitForServer(() => {
      console.log('Loading URL in Electron window...');
      mainWindow.loadURL(`http://localhost:${serverPort}`);
    });
    
    // Fallback: Load after 10 seconds even if check fails
    // (server might be ready but slow to respond)
    setTimeout(() => {
      if (mainWindow && !mainWindow.webContents.getURL()) {
        console.log('Loading URL after timeout (server may be ready)...');
        mainWindow.loadURL(`http://localhost:${serverPort}`);
      }
    }, 10000);
  } else {
    // In production, load from the built Next.js app
    mainWindow.loadURL(`http://localhost:${serverPort}`);
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const nextPath = path.join(__dirname, '../');
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npm.cmd' : 'npm';
    
    // Set Electron flag for Next.js config
    const env = {
      ...process.env,
      PORT: serverPort,
      ELECTRON: 'true',
      NODE_ENV: isDev ? 'development' : 'production',
    };
    
    if (isDev) {
      // In development, use next dev
      nextServer = spawn(command, ['run', 'dev'], {
        cwd: nextPath,
        env,
        stdio: 'inherit',
      });
    } else {
      // In production, use next start
      nextServer = spawn(command, ['start'], {
        cwd: nextPath,
        env,
        stdio: 'inherit',
      });
    }

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    // Give Next.js time to start
    // In dev mode, Next.js can take longer to compile
    setTimeout(() => {
      console.log('Next.js server process started');
      resolve();
    }, isDev ? 3000 : 2000);
  });
}

function waitForServer(callback, maxAttempts = 120) {
  const http = require('http');
  let attempts = 0;
  let serverReady = false; // Track if we've already called the callback

  console.log(`Waiting for Next.js server on http://localhost:${serverPort}...`);

  const checkServer = () => {
    // Don't check if already ready
    if (serverReady) return;
    
    attempts++;
    if (attempts > 1 && attempts % 10 === 0) {
      console.log(`Still waiting for server... (attempt ${attempts}/${maxAttempts})`);
    }

    const req = http.get(`http://localhost:${serverPort}`, (res) => {
      // Any response means the server is up - but only call callback once
      if (!serverReady) {
        serverReady = true;
        console.log(`Server is ready! (status: ${res.statusCode})`);
        callback();
      }
    });

    req.on('error', (err) => {
      if (!serverReady && attempts < maxAttempts) {
        // Retry after a short delay
        setTimeout(checkServer, 500);
      } else if (!serverReady) {
        console.error(`Next.js server failed to start after ${maxAttempts} attempts:`, err.message);
        console.error('Make sure the Next.js server is running on port', serverPort);
        // Don't quit - let the user see the error
        // app.quit();
      }
    });

    // Increase timeout to 5 seconds
    req.setTimeout(5000, () => {
      req.destroy();
      if (!serverReady && attempts < maxAttempts) {
        setTimeout(checkServer, 500);
      } else if (!serverReady) {
        console.error(`Next.js server connection timeout after ${maxAttempts} attempts`);
        console.error('The server may still be starting. Check the terminal for Next.js output.');
        // Don't quit - let the user see what's happening
        // app.quit();
      }
    });
  };

  // Start checking after a short delay to give the server time to start
  setTimeout(checkServer, 2000);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize database for Electron (non-blocking)
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Continue anyway - Next.js will handle database connection errors
  }
  
  await startNextServer();
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

