import { LangChainAdapter } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

// Enable Edge Runtime for lower latency
export const runtime = "edge";

interface OutlineRequest {
  prompt: string;
  numberOfCards: number;
  language: string;
}

// Optimized prompt - shorter = faster
const outlineTemplate = `Generate {numberOfCards} presentation topics in {language} for: {prompt}

Format each topic as:
# Topic Title
- Key point 1
- Key point 2
- Key point 3

Rules: Logical flow, clear headings, 2-3 bullet points each, no bold/italic.`;

const outlineChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(outlineTemplate),
  new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 1500,
    streaming: true,
  }),
]);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, numberOfCards, language } =
      (await req.json()) as OutlineRequest;

    if (!prompt || !numberOfCards || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const stream = await outlineChain.stream({
      prompt,
      numberOfCards,
      language,
    });

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    console.error("Error in outline generation:", error);
    return NextResponse.json(
      { error: "Failed to generate outline" },
      { status: 500 },
    );
  }
}
