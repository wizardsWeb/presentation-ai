import GoogleProvider from "next-auth/providers/google";
import { env } from "@/env";
import NextAuth, { type Session, type DefaultSession } from "next-auth";

// Lazy load db to avoid PrismaClient initialization in Edge Runtime (middleware)
// The db is only needed in Node.js runtime (API routes), not Edge Runtime
const getDb = async () => {
  try {
    // Dynamic import only in Node.js runtime
    // In Edge Runtime, this will fail gracefully
    const { db } = await import("@/server/db");
    return db;
  } catch (error) {
    // In Edge Runtime, Prisma won't be available - this is expected
    return null;
  }
};
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      hasAccess: boolean;
      location?: string;
      role: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    hasAccess: boolean;
    role: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.hasAccess = user.hasAccess;
        token.name = user.name;
        token.image = user.image;
        token.picture = user.image;
        token.location = (user as Session["user"]).location;
        token.role = user.role;
        token.isAdmin = user.role === "ADMIN";
      }

      // Handle updates
      if (trigger === "update" && (session as Session)?.user) {
        // Only access db in Node.js runtime (API routes), not Edge Runtime
        try {
          const db = await getDb();
          if (db) {
            const user = await db.user.findUnique({
              where: { id: token.id as string },
            });
            console.log("Session", session, user);
            if (session) {
              token.name = (session as Session).user.name;
              token.image = (session as Session).user.image;
              token.picture = (session as Session).user.image;
              token.location = (session as Session).user.location;
              token.role = (session as Session).user.role;
              token.isAdmin = (session as Session).user.role === "ADMIN";
            }
            if (user) {
              token.hasAccess = user?.hasAccess ?? false;
              token.role = user.role;
              token.isAdmin = user.role === "ADMIN";
            }
          }
        } catch (error) {
          // Silently fail in Edge Runtime - this callback won't run there anyway
          console.error("Database access error in JWT callback:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.hasAccess = token.hasAccess as boolean;
      session.user.location = token.location as string;
      session.user.role = token.role as string;
      session.user.isAdmin = token.role === "ADMIN";
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Only access db in Node.js runtime (API routes), not Edge Runtime
        try {
          const db = await getDb();
          if (db) {
            const dbUser = await db.user.findUnique({
              where: { email: user.email! },
              select: { id: true, hasAccess: true, role: true },
            });

            if (dbUser) {
              user.hasAccess = dbUser.hasAccess;
              user.role = dbUser.role;
            } else {
              user.hasAccess = false;
              user.role = "USER";
            }
          } else {
            // Fallback if db is not available (Edge Runtime)
            user.hasAccess = false;
            user.role = "USER";
          }
        } catch (error) {
          // Fallback on error
          console.error("Database access error in signIn callback:", error);
          user.hasAccess = false;
          user.role = "USER";
        }
      }

      return true;
    },
  },

  // Adapter is optional when using JWT strategy
  // We can't initialize it here because it would load Prisma in Edge Runtime
  // Account linking will still work via the signIn callback which lazy-loads db
  adapter: undefined,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
});
