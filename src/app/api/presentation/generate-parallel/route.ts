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

// Shorter prompt for a single slide - faster LLM response
const singleSlideTemplate = `You are an expert presentation designer. Generate ONE slide in XML format.

## SLIDE DETAILS
- Presentation Title: {TITLE}
- Slide Number: {SLIDE_NUMBER} of {TOTAL_SLIDES}
- Slide Topic: {SLIDE_TOPIC}
- Language: {LANGUAGE}
- Tone: {TONE}
- Previous Layouts Used: {PREVIOUS_LAYOUTS}

## OUTPUT FORMAT
Generate a single <SECTION> tag with the content. Vary the layout attribute based on slide position.

\`\`\`xml
<SECTION layout="{SUGGESTED_LAYOUT}">
  <!-- Your content here using ONE of the layout components -->
</SECTION>
\`\`\`

## LAYOUT OPTIONS (pick ONE, avoid repeating previous layouts)
- layout="left" | "right" | "vertical" - Controls root image position

## AVAILABLE COMPONENTS (use exactly ONE per slide)

1. BULLETS: For key points
\`\`\`xml
<BULLETS>
  <DIV><H3>Point</H3><P>Description</P></DIV>
  <DIV><P>Another point</P></DIV>
</BULLETS>
\`\`\`

2. ICONS: For concepts with symbols
\`\`\`xml
<ICONS>
  <DIV><ICON query="rocket" /><H3>Title</H3><P>Description</P></DIV>
  <DIV><ICON query="target" /><H3>Title</H3><P>Description</P></DIV>
</ICONS>
\`\`\`

3. CYCLE: For processes (use 3-4 items)
\`\`\`xml
<CYCLE>
  <DIV><H3>Step 1</H3><P>Description</P></DIV>
  <DIV><H3>Step 2</H3><P>Description</P></DIV>
  <DIV><H3>Step 3</H3><P>Description</P></DIV>
</CYCLE>
\`\`\`

4. ARROWS: For flows (2-3 items)
\`\`\`xml
<ARROWS>
  <DIV><H3>From</H3><P>Description</P></DIV>
  <DIV><H3>To</H3><P>Description</P></DIV>
</ARROWS>
\`\`\`

5. TIMELINE: For progression
\`\`\`xml
<TIMELINE>
  <DIV><H3>Phase 1</H3><P>Description</P></DIV>
  <DIV><H3>Phase 2</H3><P>Description</P></DIV>
</TIMELINE>
\`\`\`

6. PYRAMID: For hierarchy
\`\`\`xml
<PYRAMID>
  <DIV><H3>Top</H3><P>Description</P></DIV>
  <DIV><H3>Middle</H3><P>Description</P></DIV>
  <DIV><H3>Base</H3><P>Description</P></DIV>
</PYRAMID>
\`\`\`

7. STAIRCASE: For progression
\`\`\`xml
<STAIRCASE>
  <DIV><H3>Level 1</H3><P>Description</P></DIV>
  <DIV><H3>Level 2</H3><P>Description</P></DIV>
</STAIRCASE>
\`\`\`

8. COLUMNS: For comparisons
\`\`\`xml
<COLUMNS>
  <DIV><H3>Option A</H3><P>Description</P></DIV>
  <DIV><H3>Option B</H3><P>Description</P></DIV>
</COLUMNS>
\`\`\`

## IMAGE REQUIREMENT
Include at least one detailed IMG tag (10+ words for query):
\`\`\`xml
<IMG query="detailed description of the image you want, include style, mood, colors" />
\`\`\`

## RULES
1. Generate ONLY ONE <SECTION> with ONE layout component
2. DO NOT copy the outline verbatim - expand with examples and context
3. Include a detailed image query
4. Keep content concise but engaging
5. Use the suggested layout unless it would repeat too much

Now generate the slide XML for this topic. Output ONLY the <SECTION> tag, nothing else.
`;

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  streaming: false, // Non-streaming for parallel calls
});

const layouts = ["left", "right", "vertical"] as const;

function suggestLayout(slideIndex: number, previousLayouts: string[]): string {
  // Try to avoid repeating the last layout
  const lastLayout = previousLayouts[previousLayouts.length - 1];
  const availableLayouts = layouts.filter((l) => l !== lastLayout);
  return availableLayouts[slideIndex % availableLayouts.length] ?? "left";
}

interface SlideResult {
  index: number;
  content: string;
  success: boolean;
  error?: string;
}

async function generateSingleSlide(
  title: string,
  slideTopic: string,
  slideIndex: number,
  totalSlides: number,
  language: string,
  tone: string,
  previousLayouts: string[]
): Promise<SlideResult> {
  try {
    const suggestedLayout = suggestLayout(slideIndex, previousLayouts);
    const prompt = PromptTemplate.fromTemplate(singleSlideTemplate);
    const stringOutputParser = new StringOutputParser();
    const chain = RunnableSequence.from([prompt, model, stringOutputParser]);

    const result = await chain.invoke({
      TITLE: title,
      SLIDE_NUMBER: slideIndex + 1,
      TOTAL_SLIDES: totalSlides,
      SLIDE_TOPIC: slideTopic,
      LANGUAGE: language,
      TONE: tone,
      PREVIOUS_LAYOUTS: previousLayouts.slice(-2).join(", ") || "none",
      SUGGESTED_LAYOUT: suggestedLayout,
    });

    return {
      index: slideIndex,
      content: result,
      success: true,
    };
  } catch (error) {
    console.error(`Error generating slide ${slideIndex}:`, error);
    return {
      index: slideIndex,
      content: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
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

    const totalSlides = outline.length;

    // Generate all slides in parallel with batching
    // Process in batches of 3 to avoid rate limits while still being fast
    const batchSize = 3;
    const results: SlideResult[] = [];
    const usedLayouts: string[] = [];

    for (let i = 0; i < totalSlides; i += batchSize) {
      const batchPromises: Promise<SlideResult>[] = [];
      const batchEnd = Math.min(i + batchSize, totalSlides);

      for (let j = i; j < batchEnd; j++) {
        // Pre-calculate layouts for this batch to ensure variety
        suggestLayout(j, [
          ...usedLayouts,
          ...layouts.slice(0, j - i),
        ]);
        batchPromises.push(
          generateSingleSlide(
            title,
            outline[j] ?? "",
            j,
            totalSlides,
            language,
            tone,
            [...usedLayouts]
          )
        );
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Extract layouts from results to track for next batch
      for (const result of batchResults) {
        if (result.success && result.content) {
          const layoutMatch = result.content.match(/layout="(\w+)"/);
          if (layoutMatch?.[1]) {
            usedLayouts.push(layoutMatch[1]);
          }
        }
      }
    }

    // Sort results by index and combine into final XML
    results.sort((a, b) => a.index - b.index);

    const successfulSlides = results.filter((r) => r.success);
    const failedSlides = results.filter((r) => !r.success);

    if (failedSlides.length > 0) {
      console.warn(
        `${failedSlides.length} slides failed to generate:`,
        failedSlides.map((f) => ({ index: f.index, error: f.error }))
      );
    }

    // Combine all slides into presentation XML
    const presentationXml = `<PRESENTATION>
${successfulSlides.map((r) => r.content).join("\n\n")}
</PRESENTATION>`;

    return NextResponse.json({
      success: true,
      xml: presentationXml,
      totalSlides: successfulSlides.length,
      failedSlides: failedSlides.length,
    });
  } catch (error) {
    console.error("Error in parallel presentation generation:", error);
    return NextResponse.json(
      { error: "Failed to generate presentation slides" },
      { status: 500 }
    );
  }
}
