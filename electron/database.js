const path = require('path');
const { app } = require('electron');
const fs = require('fs');

/**
 * Get the database path for Electron
 * Currently uses PostgreSQL from DATABASE_URL in both dev and production
 * 
 * NOTE: To use SQLite for offline/local storage in production:
 * 1. Update prisma/schema.prisma to use SQLite provider
 * 2. Uncomment the SQLite code below
 * 3. Run migrations for SQLite
 */
function getDatabaseUrl() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // For now, use DATABASE_URL from .env in both dev and production
  // This requires a PostgreSQL server to be running
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // TODO: Uncomment below for SQLite support (requires schema changes)
  /*
  if (!isDev) {
    // In production, use a local SQLite database
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'presentation-ai.db');
    
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Return SQLite connection string
    return `file:${dbPath}`;
  }
  */
  
  // Fallback: return null instead of throwing - let Next.js handle the error
  console.warn('DATABASE_URL environment variable is not set. Please set it in your .env file.');
  return null;
}

/**
 * Initialize the database for Electron
 */
async function initializeDatabase() {
  try {
    const dbUrl = getDatabaseUrl();
    
    if (!dbUrl) {
      console.warn('DATABASE_URL not set. The app will continue but database features may not work.');
      return null;
    }
    
    // Set the DATABASE_URL environment variable
    process.env.DATABASE_URL = dbUrl;
    
    // If using SQLite in production, you might want to run migrations
    // This would require updating Prisma schema to support SQLite
    // For now, we'll just set the environment variable
    
    console.log('Database initialized successfully');
    return dbUrl;
  } catch (error) {
    console.error('Database initialization error:', error.message);
    // Don't throw - allow the app to continue, but Next.js will handle the error
    // Return null to indicate failure
    return null;
  }
}

module.exports = {
  getDatabaseUrl,
  initializeDatabase,
};

