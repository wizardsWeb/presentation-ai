import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

interface SlidesRequest {
  title: string;
  outline: string[];
  language: string;
  tone: string;
}

// Optimized single-slide prompt - more concise for faster generation
const singleSlideTemplate = `Create ONE presentation slide in XML format.

SLIDE INFO:
- Title: {TITLE}
- Topic: {SLIDE_TOPIC}  
- Slide {SLIDE_NUMBER}/{TOTAL_SLIDES}
- Language: {LANGUAGE}
- Tone: {TONE}

OUTPUT: Single <SECTION layout="{SUGGESTED_LAYOUT}"> with ONE component.

COMPONENTS (pick one):
BULLETS: <BULLETS><DIV><H3>Point</H3><P>Desc</P></DIV>...</BULLETS>
ICONS: <ICONS><DIV><ICON query="word"/><H3>Title</H3><P>Desc</P></DIV>...</ICONS>
CYCLE: <CYCLE><DIV><H3>Step</H3><P>Desc</P></DIV>...</CYCLE>
ARROWS: <ARROWS><DIV><H3>From</H3><P>Desc</P></DIV><DIV><H3>To</H3><P>Desc</P></DIV></ARROWS>
TIMELINE: <TIMELINE><DIV><H3>Date</H3><P>Event</P></DIV>...</TIMELINE>
PYRAMID: <PYRAMID><DIV><H3>Top</H3><P>Desc</P></DIV>...</PYRAMID>
COLUMNS: <COLUMNS><DIV><H3>A</H3><P>Desc</P></DIV><DIV><H3>B</H3><P>Desc</P></DIV></COLUMNS>

ADD IMAGE: <IMG query="detailed 10+ word description of visual"/>

RULES: Expand on topic (don't copy), include image, be concise.

Generate ONLY the <SECTION> tag:`;

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  streaming: false,
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
  title: string,
  topic: string,
  index: number,
  total: number,
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

    const result = await chain.invoke({
      TITLE: title,
      SLIDE_NUMBER: index + 1,
      TOTAL_SLIDES: total,
      SLIDE_TOPIC: topic,
      LANGUAGE: language,
      TONE: tone,
      SUGGESTED_LAYOUT: getLayout(index),
    });

    return { index, content: result, success: true };
  } catch (error) {
    console.error(`Slide ${index} failed:`, error);
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

          // Process slides in batches of 3 for speed while avoiding rate limits
          const batchSize = 3;

          for (let i = 0; i < total; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, total);
            const batchPromises: Promise<SlideResult>[] = [];

            for (let j = i; j < batchEnd; j++) {
              batchPromises.push(
                generateSlide(title, outline[j] ?? "", j, total, language, tone)
              );
            }

            // Wait for batch to complete
            const results = await Promise.all(batchPromises);

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
          }

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
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
  } catch (error) {
    console.error("Error in streaming generation:", error);
    return NextResponse.json(
      { error: "Failed to generate presentation" },
      { status: 500 }
    );
  }
}
