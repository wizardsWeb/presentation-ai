import { LangChainAdapter } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { 
  type TeachingStyle, 
  type AudienceType 
} from "@/states/presentation-state";
import { generateFullSlideImage } from "@/lib/image/nano-banana-service";

// Use Node.js runtime when nano-banana is used (requires Buffer API)
// Otherwise use Edge runtime for faster response
// Note: Runtime is determined dynamically based on imageModel
export const runtime = "nodejs"; // Changed to nodejs because nano-banana requires Buffer

// Polyfill console.groupCollapsed for Edge runtime (required by Google Generative AI SDK)
if (typeof console.groupCollapsed === "undefined") {
  console.groupCollapsed = (...args: unknown[]) => {
    console.log("[GROUP]", ...args);
  };
  console.group = (...args: unknown[]) => {
    console.log("[GROUP]", ...args);
  };
  console.groupEnd = () => {
    // No-op
  };
}

interface SingleSlideRequest {
  slideIndex: number;
  totalSlides: number;
  outlineItem: string; // The outline content for this specific slide
  title: string;
  language: string;
  tone: string;
  previousLayouts?: string[]; // Layouts used in previous slides to avoid repetition
  teachingStyle?: TeachingStyle;
  audienceType?: AudienceType;
  imageModel?: string; // For nano-banana full slide generation
}

// Get teaching style content instructions
const getTeachingStyleContent = (style: TeachingStyle): string => {
  const styleMap: Record<TeachingStyle, string> = {
    "concept-first": "Structure with: definition/concept first, then explanation, followed by examples.",
    "example-first": "Start with a real-world example, then identify patterns, finally reveal the concept.",
    "storytelling": "Frame as narrative with hooks, challenges, and resolutions.",
    "data-driven": "Lead with data and statistics. Support claims with evidence.",
  };
  return styleMap[style];
};

// Get audience-specific content adjustments
const getAudienceContent = (audience: AudienceType): string => {
  const audienceMap: Record<AudienceType, string> = {
    "school": "Simple language, fun examples, engaging visuals. Avoid jargon.",
    "college": "Academic depth, theoretical frameworks, critical analysis.",
    "training": "Practical skills, exercises, workplace applications.",
    "professional": "Concise, strategic focus, business value, ROI.",
  };
  return audienceMap[audience];
};

// Determine section type based on slide position
const getSectionType = (slideIndex: number, totalSlides: number, outlineItem: string): string => {
  // Check if outline already has a section marker
  const sectionMatch = outlineItem.match(/^\[(introduction|content|example|activity|summary)\]/i);
  if (sectionMatch?.[1]) {
    return sectionMatch[1].toLowerCase();
  }
  
  // Default based on position
  if (slideIndex === 0) return "introduction";
  if (slideIndex === totalSlides - 1) return "summary";
  return "content";
};

// Get layout based on position and previous layouts
const getLayoutForSlide = (slideIndex: number, previousLayouts: string[]): string => {
  const layouts = ["left", "right", "vertical"];
  
  // Avoid using the same layout as the previous slide
  const lastLayout = previousLayouts[previousLayouts.length - 1];
  const availableLayouts = layouts.filter(l => l !== lastLayout);
  
  // Safety check: if no layouts available (shouldn't happen), use all layouts
  const finalLayouts = availableLayouts.length > 0 ? availableLayouts : layouts;
  
  // Rotate through available layouts
  return finalLayouts[slideIndex % finalLayouts.length] ?? "vertical";
};

const singleSlideTemplate = `Create 1 slide as XML. Slide {SLIDE_INDEX}/{TOTAL_SLIDES}. Topic: {TITLE}. Content: {OUTLINE_ITEM}. Language: {LANGUAGE}. {TEACHING_STYLE_INSTRUCTIONS} {AUDIENCE_INSTRUCTIONS}

Format: <SECTION layout="{LAYOUT}" section="{SECTION_TYPE}">content</SECTION>

Components (pick ONE):
- BULLETS: <BULLETS><DIV><H3>title</H3><P>text</P></DIV></BULLETS>
- ICONS: <ICONS><DIV><ICON query="word"/><H3>title</H3><P>text</P></DIV></ICONS>
- COLUMNS: <COLUMNS><DIV><H3>a</H3><P>text</P></DIV><DIV><H3>b</H3><P>text</P></DIV></COLUMNS>
- CYCLE/ARROWS/TIMELINE: <CYCLE><DIV><H3>step</H3><P>text</P></DIV></CYCLE>
- PYRAMID/STAIRCASE: <PYRAMID><DIV><H3>level</H3><P>text</P></DIV></PYRAMID>

Add image: <IMG query="descriptive 10+ word image prompt with style and context"/>

Rules: Expand outline creatively. Use specified layout/section. Write in {LANGUAGE}. Output ONLY the <SECTION> tag:`;

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.4, // Lower for faster, more deterministic output
  maxTokens: 600, // Reduced from 800 - single slides don't need as many tokens
  streaming: true,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      slideIndex, 
      totalSlides, 
      outlineItem, 
      title, 
      language, 
      tone, 
      previousLayouts = [],
      teachingStyle,
      audienceType,
      imageModel,
    } = (await req.json()) as SingleSlideRequest;

    if (slideIndex === undefined || !outlineItem || !title || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // CRITICAL: If nano-banana is selected, skip ALL text generation and only generate image
    if (imageModel === "nano-banana") {
      console.log(`[Generate Slide] Using nano-banana for slide ${slideIndex + 1} - skipping text generation`);
      
      // Use defaults if pedagogy params not provided
      const finalTeachingStyle: TeachingStyle = teachingStyle ?? "concept-first";
      const finalAudienceType: AudienceType = audienceType ?? "professional";

      // Generate the full slide image - NO TEXT GENERATION
      const result = await generateFullSlideImage({
        slideTopic: outlineItem,
        slideNumber: slideIndex + 1,
        totalSlides,
        language,
        tone: tone ?? "professional",
        teachingStyle: finalTeachingStyle,
        audienceType: finalAudienceType,
      });

      if (!result.success || !result.url) {
        return NextResponse.json(
          { error: result.error ?? "Failed to generate slide image" },
          { status: 500 },
        );
      }

      // Extract plain string values to avoid any circular reference issues
      const imageUrl: string = typeof result.url === "string" ? result.url : String(result.url || "");
      const sectionType: string = getSectionType(slideIndex, totalSlides, outlineItem);
      
      // Escape URL for XML
      const escapedUrl = imageUrl
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      
      // Create XML structure as plain string
      const slideXml = `<SECTION layout="vertical" section="${sectionType}">
  <FULL_SLIDE_IMAGE url="${escapedUrl}" />
</SECTION>`;

      // Return as a stream in AI SDK format
      // The client expects: "0:"content"\n" where content is a JSON stringified string
      // Create the stream with only plain string values to avoid circular references
      const xmlContent = String(slideXml); // Ensure it's a plain string
      const jsonContent = JSON.stringify(xmlContent); // This should work now
      
      const stream = new ReadableStream({
        start(controller) {
          try {
            const encoder = new TextEncoder();
            // Format: "0:"json_string"\n"
            controller.enqueue(encoder.encode(`0:${jsonContent}\n`));
            controller.close();
          } catch (error) {
            console.error("Error creating stream:", error);
            controller.error(error instanceof Error ? error : new Error(String(error)));
          }
        },
      });

      // Return plain Response (not using LangChainAdapter for custom streams)
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Slide-Index": String(slideIndex),
        },
      });
    }

    // Use defaults if pedagogy params not provided
    const finalTeachingStyle: TeachingStyle = teachingStyle ?? "concept-first";
    const finalAudienceType: AudienceType = audienceType ?? "professional";

    // Determine layout and section type
    const layout = getLayoutForSlide(slideIndex, previousLayouts);
    const sectionType = getSectionType(slideIndex, totalSlides, outlineItem);

    const prompt = PromptTemplate.fromTemplate(singleSlideTemplate);
    const stringOutputParser = new StringOutputParser();
    const chain = RunnableSequence.from([prompt, model, stringOutputParser]);

    const stream = await chain.stream({
      SLIDE_INDEX: slideIndex + 1, // 1-indexed for display
      TOTAL_SLIDES: totalSlides,
      TITLE: title,
      OUTLINE_ITEM: outlineItem,
      LANGUAGE: language,
      LAYOUT: layout,
      SECTION_TYPE: sectionType,
      TEACHING_STYLE_INSTRUCTIONS: getTeachingStyleContent(finalTeachingStyle),
      AUDIENCE_INSTRUCTIONS: getAudienceContent(finalAudienceType),
    });

    // Add slide index to response headers for client-side identification
    const response = LangChainAdapter.toDataStreamResponse(stream);
    response.headers.set("X-Slide-Index", String(slideIndex));
    
    return response;
  } catch (error) {
    console.error("Error in single slide generation:", error);
    return NextResponse.json(
      { error: "Failed to generate slide" },
      { status: 500 },
    );
  }
}
