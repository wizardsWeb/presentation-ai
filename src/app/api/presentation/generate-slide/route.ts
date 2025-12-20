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

// Edge runtime for faster response
export const runtime = "edge";

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
  
  // Rotate through available layouts
  return availableLayouts[slideIndex % availableLayouts.length] ?? "vertical";
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
      tone: _tone, 
      previousLayouts = [],
      teachingStyle,
      audienceType,
    } = (await req.json()) as SingleSlideRequest;

    if (slideIndex === undefined || !outlineItem || !title || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
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
