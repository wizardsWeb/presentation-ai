import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Add connection pool settings for better stability
    datasourceUrl: env.DATABASE_URL,
  });

  // Handle connection errors gracefully
  client.$on("error" as never, (e: { message: string; target: string; timestamp: Date }) => {
    console.error("Prisma error:", {
      timestamp: e.timestamp,
      message: e.message,
      target: e.target,
    });
  });

  return client;
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
