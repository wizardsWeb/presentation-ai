/**
 * YouTube Video Search API Route
 * 
 * Searches for relevant educational videos based on presentation topic.
 * Used during presentation generation to find videos to embed.
 */

import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { searchYouTubeVideo, type YouTubeVideoResult } from "@/lib/youtube/search";

export const runtime = "nodejs";

interface SearchRequest {
  topic: string;
  language?: string;
}

interface SearchResponse {
  success: boolean;
  video?: YouTubeVideoResult;
  error?: string;
}

export async function POST(req: Request): Promise<NextResponse<SearchResponse>> {
  try {
    // Verify authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as SearchRequest;
    const { topic, language = "en" } = body;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Topic is required" },
        { status: 400 }
      );
    }

    // Search for a relevant video
    const result = await searchYouTubeVideo(topic.trim(), language);

    if (!result.success || !result.video) {
      return NextResponse.json({
        success: false,
        error: result.error ?? "No video found",
      });
    }

    return NextResponse.json({
      success: true,
      video: result.video,
    });
  } catch (error) {
    console.error("YouTube search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for simple queries
export async function GET(req: Request): Promise<NextResponse<SearchResponse>> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic");
    const language = url.searchParams.get("language") ?? "en";

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "Topic query parameter is required" },
        { status: 400 }
      );
    }

    const result = await searchYouTubeVideo(topic, language);

    if (!result.success || !result.video) {
      return NextResponse.json({
        success: false,
        error: result.error ?? "No video found",
      });
    }

    return NextResponse.json({
      success: true,
      video: result.video,
    });
  } catch (error) {
    console.error("YouTube search API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
