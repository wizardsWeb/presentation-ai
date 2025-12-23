"use server";
import "server-only";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { type Prisma, DocumentType } from "@prisma/client";

export type PresentationDocument = Prisma.BaseDocumentGetPayload<{
  include: {
    presentation: true;
  };
}>;

const ITEMS_PER_PAGE = 10;

export async function fetchPresentations(page = 0) {
  try {
    const session = await auth();
    const userId = session?.user.id;

    // Debug logging
    console.log("[fetchPresentations] Session user ID:", userId);
    console.log("[fetchPresentations] Session:", JSON.stringify(session, null, 2));

    if (!userId) {
      return {
        items: [],
        hasMore: false,
      };
    }

    const skip = page * ITEMS_PER_PAGE;

    const items = await db.baseDocument.findMany({
      where: {
        userId,
        type: DocumentType.PRESENTATION,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip: skip,
      include: {
        presentation: true,
      },
    });

    const hasMore = items.length === ITEMS_PER_PAGE;

    return {
      items,
      hasMore,
    };
  } catch (error) {
    // Handle database connection errors gracefully
    console.error("[fetchPresentations] Database error:", error);
    
    // Check if it's a database connection error
    const isConnectionError = error instanceof Error && (
      error.message.includes("Can't reach database server") ||
      error.message.includes("connection") ||
      error.message.includes("timeout") ||
      error.name === "PrismaClientInitializationError"
    );

    if (isConnectionError) {
      console.warn("[fetchPresentations] Database unavailable, returning empty results");
      // Return empty results instead of throwing error
      return {
        items: [],
        hasMore: false,
      };
    }

    // For other errors, still return empty but log the error
    console.error("[fetchPresentations] Unexpected error:", error);
    return {
      items: [],
      hasMore: false,
    };
  }
}

export async function fetchPublicPresentations(page = 0) {
  try {
    const skip = page * ITEMS_PER_PAGE;

    const [items, total] = await Promise.all([
      db.baseDocument.findMany({
        where: {
          type: DocumentType.PRESENTATION,
          isPublic: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: ITEMS_PER_PAGE,
        skip: skip,
        include: {
          presentation: true,
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      }),
      db.baseDocument.count({
        where: {
          type: DocumentType.PRESENTATION,
          isPublic: true,
        },
      }),
    ]);

    const hasMore = skip + ITEMS_PER_PAGE < total;

    return {
      items,
      hasMore,
    };
  } catch (error) {
    // Handle database connection errors gracefully
    console.error("[fetchPublicPresentations] Database error:", error);
    
    const isConnectionError = error instanceof Error && (
      error.message.includes("Can't reach database server") ||
      error.message.includes("connection") ||
      error.message.includes("timeout") ||
      error.name === "PrismaClientInitializationError"
    );

    if (isConnectionError) {
      console.warn("[fetchPublicPresentations] Database unavailable, returning empty results");
      return {
        items: [],
        hasMore: false,
      };
    }

    console.error("[fetchPublicPresentations] Unexpected error:", error);
    return {
      items: [],
      hasMore: false,
    };
  }
}

export async function fetchUserPresentations(userId: string, page = 0) {
  try {
    const session = await auth();
    const currentUserId = session?.user.id;

    const skip = page * ITEMS_PER_PAGE;

    const [items, total] = await Promise.all([
      db.baseDocument.findMany({
        where: {
          userId,
          type: DocumentType.PRESENTATION,
          OR: [
            { isPublic: true },
            { userId: currentUserId }, // Include private presentations if the user is viewing their own
          ],
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: ITEMS_PER_PAGE,
        skip: skip,
        include: {
          presentation: true,
        },
      }),
      db.baseDocument.count({
        where: {
          userId,
          type: DocumentType.PRESENTATION,
          OR: [{ isPublic: true }, { userId: currentUserId }],
        },
      }),
    ]);

    const hasMore = skip + ITEMS_PER_PAGE < total;

    return {
      items,
      hasMore,
    };
  } catch (error) {
    // Handle database connection errors gracefully
    console.error("[fetchUserPresentations] Database error:", error);
    
    const isConnectionError = error instanceof Error && (
      error.message.includes("Can't reach database server") ||
      error.message.includes("connection") ||
      error.message.includes("timeout") ||
      error.name === "PrismaClientInitializationError"
    );

    if (isConnectionError) {
      console.warn("[fetchUserPresentations] Database unavailable, returning empty results");
      return {
        items: [],
        hasMore: false,
      };
    }

    console.error("[fetchUserPresentations] Unexpected error:", error);
    return {
      items: [],
      hasMore: false,
    };
  }
}
