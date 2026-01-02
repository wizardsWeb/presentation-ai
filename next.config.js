/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Disable ESLint and TypeScript errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "mdv3b4d8f9.ufs.sh", // UploadThing file storage
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  
  // Electron-specific optimizations
  ...(process.env.ELECTRON === 'true' && {
    // Disable image optimization in Electron for better performance
    images: {
      unoptimized: true,
    },
  }),
};

export default config;
