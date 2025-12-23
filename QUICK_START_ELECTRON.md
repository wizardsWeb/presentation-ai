# Quick Start: Electron Desktop App

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
Create a `.env` file with at minimum:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/presentation_ai"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"
OPENAI_API_KEY="your-key"
TOGETHER_AI_API_KEY="your-key"
GOOGLE_CLIENT_ID="your-id"
GOOGLE_CLIENT_SECRET="your-secret"
```

### 3. Initialize Database
```bash
npm run db:push
```

### 4. Run in Development
```bash
npm run dev:electron
```

That's it! The Electron app should launch automatically.

## 📦 Building for Distribution

### Build the App
```bash
# First build Next.js
npm run build

# Then build Electron
npm run build:electron
```

The distributable will be in `dist-electron/` directory.

## 🛠️ Available Scripts

- `npm run dev:electron` - Run in development mode
- `npm run electron` - Run Electron (assumes Next.js is running)
- `npm run electron:pack` - Package without installer
- `npm run build:electron` - Build full distributable

## ⚠️ Important Notes

1. **Database**: Currently uses PostgreSQL. For production Electron apps, consider switching to SQLite for local storage.

2. **Port**: The app uses port 3000 by default. Make sure it's available or change it in `electron/main.js`.

3. **Icons**: Add your app icons to the `assets/` directory:
   - `icon.ico` (Windows)
   - `icon.icns` (macOS)
   - `icon.png` (Linux)

4. **Environment Variables**: In production builds, you may want to bundle environment variables or use a config file.

## 🐛 Troubleshooting

**App won't start?**
- Check if port 3000 is available
- Verify database connection
- Check console for errors

**Build fails?**
- Ensure all dependencies are installed
- Run `npm run build` first
- Check `electron-builder.config.js` settings

**Database errors?**
- Verify DATABASE_URL in `.env`
- Run `npm run db:push` to sync schema
- Check database server is running

For more details, see [ELECTRON_SETUP.md](./ELECTRON_SETUP.md)

