import { LangChainAdapter } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { env } from "@/env";

// Use Node.js runtime when using Gemini (Edge runtime has compatibility issues)
// Use Edge runtime for OpenAI (faster)
export const runtime = env.GOOGLE_API_KEY ? "nodejs" : "edge";

interface OutlineRequest {
  prompt: string;
  numberOfCards: number;
  language: string;
}

// Map language codes to full language names for better clarity
const getLanguageName = (langCode: string): string => {
  const languageMap: Record<string, string> = {
    "en-US": "English",
    "en": "English",
    "hi": "Hindi",
    "pt": "Portuguese",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ru": "Russian",
    "ar": "Arabic",
  };
  return languageMap[langCode] ?? langCode;
};

// Optimized prompt - enhanced for multilingual support, especially Hindi
const outlineTemplate = `You are generating a presentation outline. Generate exactly {numberOfCards} presentation topics in {language} language for the topic: {prompt}

CRITICAL: All content MUST be written entirely in {language} language. This includes:
- All topic titles (# headings)
- All bullet points (- items)
- All text content

Format each topic as:
# Topic Title (in {language} only)
- Key point 1 (in {language} only)
- Key point 2 (in {language} only)
- Key point 3 (in {language} only)

Rules: 
- Logical flow, clear headings
- 2-3 bullet points per topic
- No bold/italic formatting
- Write EVERYTHING in {language} language - do not mix languages`;

// Use Gemini if API key is available (supports multilingual), otherwise fallback to OpenAI
async function generateWithGemini(
  prompt: string,
  numberOfCards: number,
  language: string,
): Promise<Response> {
  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1500,
    },
  });

  // Get full language name for better clarity
  const languageName = getLanguageName(language);
  
  const fullPrompt = outlineTemplate
    .replace("{numberOfCards}", numberOfCards.toString())
    .replace(/{language}/g, languageName)
    .replace("{prompt}", prompt);

  const result = await model.generateContentStream(fullPrompt);

  // Convert Gemini stream to AI SDK format (Server-Sent Events)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            // Format as AI SDK data stream: "0:" prefix for text chunks
            controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
          }
        }
        // Send completion marker
        controller.enqueue(encoder.encode(`d:{"type":"done"}\n`));
        controller.close();
      } catch (error) {
        console.error("Gemini streaming error:", error);
        controller.enqueue(
          encoder.encode(
            `e:${JSON.stringify({ error: "Streaming failed" })}\n`
          )
        );
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
}

// OpenAI fallback using LangChain
const openAIChain = RunnableSequence.from([
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

    // Use Gemini if API key is available, otherwise use OpenAI
    if (env.GOOGLE_API_KEY) {
      return await generateWithGemini(prompt, numberOfCards, language);
    }

    // Fallback to OpenAI
    const stream = await openAIChain.stream({
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
