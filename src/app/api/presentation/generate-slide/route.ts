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

const singleSlideTemplate = `Generate ONE presentation slide in XML format.

## SLIDE DETAILS
- Slide Number: {SLIDE_INDEX} of {TOTAL_SLIDES}
- Topic: {TITLE}
- Slide Content: {OUTLINE_ITEM}
- Language: {LANGUAGE}
- Layout: {LAYOUT}
- Section Type: {SECTION_TYPE}

## TEACHING APPROACH
{TEACHING_STYLE_INSTRUCTIONS}

## TARGET AUDIENCE
{AUDIENCE_INSTRUCTIONS}

## REQUIRED FORMAT
Generate exactly this structure:
\`\`\`xml
<SECTION layout="{LAYOUT}" section="{SECTION_TYPE}">
  <!-- Use ONE of these layout components -->
  <!-- Add detailed image query -->
</SECTION>
\`\`\`

## AVAILABLE LAYOUT COMPONENTS (choose ONE that best fits the content):
- COLUMNS: For comparisons (2-3 DIV elements with H3 and P)
- BULLETS: For key points (DIV elements with H3/P content)
- ICONS: For concepts (DIV with ICON query, H3, P)
- CYCLE: For circular processes (3-4 DIV elements)
- ARROWS: For cause-effect flows (2-3 DIV elements)
- TIMELINE: For chronological events (DIV elements with dates)
- PYRAMID: For hierarchy (top-to-bottom importance)
- STAIRCASE: For progression (DIV elements for each level)
- CHART: For data (charttype="vertical-bar" with TABLE/TR/TD)

## IMAGE QUERIES
Include at least one detailed image query (10+ words):
\`\`\`xml
<IMG query="detailed description of image with style, lighting, and context" />
\`\`\`

## RULES
1. Generate ONLY ONE <SECTION> tag
2. DO NOT copy outline verbatim - expand with examples and details
3. Use the specified layout and section type
4. Write all content in {LANGUAGE}
5. Include engaging, specific content appropriate for the audience

Generate the single slide now:`;

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.6,
  maxTokens: 800, // Smaller token limit for single slide
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
