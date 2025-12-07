import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * Real-time streaming endpoint for Quick Mode
 * 
 * Strategy: Generate ALL slides in PARALLEL, but stream progress immediately.
 * As each slide generates tokens, we send them to the client.
 * This gives both SPEED (parallel) and INSTANT FEEDBACK (streaming).
 */

interface SlidesRequest {
  title: string;
  outline: string[];
  language: string;
  tone: string;
}

// Compact prompt for fast generation
const singleSlideTemplate = `Create 1 slide as XML. Topic: {SLIDE_TOPIC}. Language: {LANGUAGE}. Tone: {TONE}.

Format: <SECTION layout="{SUGGESTED_LAYOUT}">content</SECTION>

Components (pick ONE):
- BULLETS: <BULLETS><DIV><H3>title</H3><P>text</P></DIV></BULLETS>
- ICONS: <ICONS><DIV><ICON query="word"/><H3>title</H3><P>text</P></DIV></ICONS>
- CYCLE: <CYCLE><DIV><H3>step</H3><P>text</P></DIV></CYCLE>
- ARROWS: <ARROWS><DIV><H3>from</H3><P>text</P></DIV><DIV><H3>to</H3><P>text</P></DIV></ARROWS>
- TIMELINE: <TIMELINE><DIV><H3>date</H3><P>event</P></DIV></TIMELINE>
- PYRAMID: <PYRAMID><DIV><H3>level</H3><P>text</P></DIV></PYRAMID>
- COLUMNS: <COLUMNS><DIV><H3>a</H3><P>text</P></DIV><DIV><H3>b</H3><P>text</P></DIV></COLUMNS>
- STAIRCASE: <STAIRCASE><DIV><H3>step</H3><P>text</P></DIV></STAIRCASE>

Add image: <IMG query="descriptive prompt"/>

Rules: 
- 3-4 items with specific content (stats, examples)
- Engaging title with numbers/power words
- Output ONLY the <SECTION> tag, nothing else:`;

const layouts = ["left", "right", "vertical"] as const;

function getLayout(index: number): string {
  return layouts[index % layouts.length] ?? "left";
}

// Track slide generation state
interface SlideState {
  index: number;
  content: string;
  isComplete: boolean;
  lastSentLength: number;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { outline, language, tone } = (await req.json()) as SlidesRequest;

    if (!outline || !Array.isArray(outline) || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    
    // Use TransformStream for better streaming control
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Start async generation in the background
    void (async () => {
      try {
        const total = outline.length;

        // Send start event immediately
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "start", total })}\n\n`
          )
        );

        // Track state for all slides
        const slideStates: SlideState[] = outline.map((_, index) => ({
          index,
          content: "",
          isComplete: false,
          lastSentLength: 0,
        }));

        // Create streaming model
        const model = new ChatOpenAI({
          modelName: "gpt-4o-mini",
          temperature: 0.6,
          maxTokens: 600,
          streaming: true,
        });

        // Generate ALL slides in parallel
        const generateSlide = async (topic: string, index: number) => {
          const layout = getLayout(index);
          const state = slideStates[index]!;

          try {
            const prompt = PromptTemplate.fromTemplate(singleSlideTemplate);
            const chain = RunnableSequence.from([
              prompt,
              model,
              new StringOutputParser(),
            ]);

            const stream = await chain.stream({
              SLIDE_TOPIC: topic,
              LANGUAGE: language,
              TONE: tone,
              SUGGESTED_LAYOUT: layout,
            });

            for await (const chunk of stream) {
              state.content += chunk;
              
              // Send token update every few characters
              if (state.content.length - state.lastSentLength >= 20 || chunk.includes(">")) {
                await writer.write(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "token",
                      index,
                      partial: state.content,
                    })}\n\n`
                  )
                );
                state.lastSentLength = state.content.length;
              }
            }

            state.isComplete = true;

            // Send complete event for this slide
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "slide_complete",
                  index,
                  content: state.content,
                })}\n\n`
              )
            );

            return { index, success: true, content: state.content };
          } catch (error) {
            console.error(`Error generating slide ${index}:`, error);
            state.isComplete = true;
            
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "slide_error",
                  index,
                  error: "Failed to generate slide",
                })}\n\n`
              )
            );

            return { index, success: false, content: "" };
          }
        };

        // Launch ALL slides in parallel - they will stream their tokens as they generate
        const promises = outline.map((topic, index) => 
          generateSlide(topic ?? "", index)
        );

        // Wait for all to complete
        await Promise.all(promises);

        // Send completion
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );

        await writer.close();
      } catch (error) {
        console.error("Stream error:", error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : "Generation failed",
            })}\n\n`
          )
        );
        await writer.close();
      }
    })();

    return new Response(readable, {
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
