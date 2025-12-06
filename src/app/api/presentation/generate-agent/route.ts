import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import {
  generatePresentationWithAgent,
  type AgentEvent,
  type AgentConfig,
} from "@/lib/agents/slide-agent";

interface AgentRequest {
  title: string;
  outline: string[];
  language: string;
  tone: string;
  config?: Partial<AgentConfig>;
}

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  enableResearch: true,
  enableValidation: false, // Disabled for speed
  maxRefinements: 0,
  minValidationScore: 7,
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { outline, language, tone, config: userConfig } =
      (await req.json()) as AgentRequest;

    if (!outline || !Array.isArray(outline) || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const config: AgentConfig = {
      ...DEFAULT_AGENT_CONFIG,
      ...userConfig,
    };

    // Create SSE stream for real-time token streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: AgentEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          // Sequential generation with real-time token streaming
          // Phase 1: Batch research all topics in parallel (fast)
          // Phase 2: Generate slides sequentially, streaming tokens for each
          await generatePresentationWithAgent(
            outline,
            language,
            tone,
            config,
            (event) => sendEvent(event) // Forward ALL events including tokens
          );

          // The agent already sends slide_complete and agent_done events
          // No need to send duplicates here

          controller.close();
        } catch (error) {
          sendEvent({
            type: "error",
            message: error instanceof Error ? error.message : "Generation failed",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in agent generation:", error);
    return NextResponse.json(
      { error: "Failed to start agent generation" },
      { status: 500 }
    );
  }
}
