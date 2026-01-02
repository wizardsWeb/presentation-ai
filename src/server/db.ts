import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Handle connection errors gracefully
  client.$on("error" as never, (e: { message: string; target: string; timestamp: Date }) => {
    console.error("Prisma error:", {
      timestamp: e.timestamp,
      message: e.message,
      target: e.target,
    });
    
    // If connection is closed, log warning - Prisma will auto-reconnect
    if (e.message.includes("Closed") || e.message.includes("connection")) {
      console.warn("Database connection closed. Prisma will reconnect on next query.");
    }
  });

  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Graceful shutdown handler
if (typeof process !== "undefined") {
  const gracefulShutdown = async () => {
    await db.$disconnect();
  };
  
  process.on("beforeExit", () => {
    void gracefulShutdown();
  });
  process.on("SIGINT", () => {
    void gracefulShutdown();
  });
  process.on("SIGTERM", () => {
    void gracefulShutdown();
  });
}
