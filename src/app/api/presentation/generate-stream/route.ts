import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Enable Edge Runtime for lower latency
export const runtime = "edge";

interface SlidesRequest {
  title: string;
  outline: string[];
  language: string;
  tone: string;
}

// Ultra-compact prompt for maximum speed
const singleSlideTemplate = `Create 1 slide as XML. Topic: {SLIDE_TOPIC}. Language: {LANGUAGE}. Tone: {TONE}.

Format: <SECTION layout="{SUGGESTED_LAYOUT}">content</SECTION>

Use ONE component:
- BULLETS: <BULLETS><DIV><H3>title</H3><P>text</P></DIV></BULLETS>
- ICONS: <ICONS><DIV><ICON query="word"/><H3>title</H3><P>text</P></DIV></ICONS>
- CYCLE: <CYCLE><DIV><H3>step</H3><P>text</P></DIV></CYCLE>
- ARROWS: <ARROWS><DIV><H3>from</H3><P>text</P></DIV><DIV><H3>to</H3><P>text</P></DIV></ARROWS>
- TIMELINE: <TIMELINE><DIV><H3>date</H3><P>event</P></DIV></TIMELINE>
- PYRAMID: <PYRAMID><DIV><H3>level</H3><P>text</P></DIV></PYRAMID>
- COLUMNS: <COLUMNS><DIV><H3>a</H3><P>text</P></DIV><DIV><H3>b</H3><P>text</P></DIV></COLUMNS>

Add image: <IMG query="descriptive image prompt"/>

Output ONLY the <SECTION> tag:`;

// Optimized model settings for speed - streaming enabled for faster first token
const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.5,
  maxTokens: 600, // Reduced for speed
  streaming: true, // Enable streaming for faster first token
});

const layouts = ["left", "right", "vertical"] as const;

function getLayout(index: number): string {
  return layouts[index % layouts.length] ?? "left";
}

interface SlideResult {
  index: number;
  content: string;
  success: boolean;
}

async function generateSlide(
  topic: string,
  index: number,
  language: string,
  tone: string
): Promise<SlideResult> {
  try {
    const prompt = PromptTemplate.fromTemplate(singleSlideTemplate);
    const chain = RunnableSequence.from([
      prompt,
      model,
      new StringOutputParser(),
    ]);

    // Use streaming and collect chunks for faster first-token response
    let result = "";
    const stream = await chain.stream({
      SLIDE_TOPIC: topic,
      LANGUAGE: language,
      TONE: tone,
      SUGGESTED_LAYOUT: getLayout(index),
    });

    for await (const chunk of stream) {
      result += chunk;
    }

    return { index, content: result, success: true };
  } catch {
    return { index, content: "", success: false };
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, outline, language, tone } =
      (await req.json()) as SlidesRequest;

    if (!title || !outline || !Array.isArray(outline) || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a streaming response that sends slides as they complete
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const total = outline.length;

          // Send initial metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "start", total })}\n\n`
            )
          );

          // Process ALL slides in parallel for maximum speed
          // gpt-4o-mini handles high concurrency very well
          const allPromises: Promise<SlideResult>[] = outline.map((topic, index) =>
            generateSlide(topic ?? "", index, language, tone)
          );

          // Wait for all slides to complete
          const results = await Promise.all(allPromises);

          // Sort by index and send each slide
          results.sort((a, b) => a.index - b.index);

          for (const result of results) {
            if (result.success) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "slide",
                    index: result.index,
                    content: result.content,
                  })}\n\n`
                )
              );
            } else {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    index: result.index,
                  })}\n\n`
                )
              );
            }
          }

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Generation failed" })}\n\n`
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
  } catch {
    return NextResponse.json(
      { error: "Failed to generate presentation" },
      { status: 500 }
    );
  }
}
