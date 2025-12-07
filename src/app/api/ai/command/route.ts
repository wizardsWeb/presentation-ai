import { auth } from "@/server/auth";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextResponse } from "next/server";

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

    // Use streamText from AI SDK
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: chatMessages,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return result.toDataStreamResponse();
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

