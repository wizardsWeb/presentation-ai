import { auth } from "@/server/auth";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import { env } from "@/env";

// Use Node.js runtime for Gemini
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid messages" },
        { status: 400 }
      );
    }

    // Check for Gemini API key - try multiple sources
    // Also check process.env directly since env.GOOGLE_API_KEY is optional
    const rawKey = env.GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!rawKey) {
      console.error("GOOGLE_API_KEY is missing. Please set GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable.");
      console.error("env.GOOGLE_API_KEY:", env.GOOGLE_API_KEY ? "exists" : "missing");
      console.error("process.env.GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY ? "exists" : "missing");
      return NextResponse.json(
        { 
          error: "GOOGLE_API_KEY is required",
          details: "Please set GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable"
        },
        { status: 500 }
      );
    }

    // Remove any quotes that might be in the .env file value
    const googleApiKey = rawKey.trim().replace(/^['"]|['"]$/g, '');
    
    if (!googleApiKey || googleApiKey.length === 0) {
      console.error("GOOGLE_API_KEY is empty after trimming quotes.");
      return NextResponse.json(
        { 
          error: "GOOGLE_API_KEY is invalid",
          details: "The API key appears to be empty"
        },
        { status: 500 }
      );
    }

    // Extract system message if present
    const systemMessage = messages.find(
      (msg: { role: string; content?: unknown }) => msg.role === "system"
    ) as { role: string; content?: unknown } | undefined;
    const systemPrompt = systemMessage?.content as string | undefined;

    // Filter out system messages and convert to AI SDK format
    const chatMessages = messages
      .filter((msg: { role: string }) => msg.role !== "system")
      .map((msg: { role: string; content: string }) => {
        if (msg.role === "user") {
          return { role: "user" as const, content: msg.content };
        } else if (msg.role === "assistant") {
          return { role: "assistant" as const, content: msg.content };
        }
        return null;
      })
      .filter((msg): msg is { role: "user" | "assistant"; content: string } =>
        msg !== null
      );

    // Use streamText with Gemini model for real-time streaming
    // AI SDK v5 supports Google models with specification v2
    // Set API key in environment for this request
    const originalApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_API_KEY = googleApiKey;
    
    try {
      const result = streamText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: google("gemini-2.5-flash") as any, // Type assertion to handle v1/v2 compatibility
        system: systemPrompt,
        messages: chatMessages,
        temperature: 0.7,
        maxTokens: 2000,
      });

      // Convert v5 stream format to v4 format for Plate AI plugin compatibility
      // Plate AI expects lines starting with "0:" followed by JSON string
      // In AI SDK v5, textStream yields strings directly
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream text deltas in the format Plate AI expects
            for await (const textDelta of result.textStream) {
              // Format as "0:" + JSON.stringify(text) + "\n"
              const line = `0:${JSON.stringify(textDelta)}\n`;
              controller.enqueue(encoder.encode(line));
            }
            // Send finish event
            controller.enqueue(encoder.encode(`d:{"type":"finish"}\n`));
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            const errorLine = `e:${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n`;
            controller.enqueue(encoder.encode(errorLine));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } finally {
      // Restore original API key
      if (originalApiKey !== undefined) {
        process.env.GOOGLE_API_KEY = originalApiKey;
      } else {
        delete process.env.GOOGLE_API_KEY;
      }
    }
  } catch (error) {
    console.error("Error in AI command:", error);
    return NextResponse.json(
      {
        error: "Failed to process AI command",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

