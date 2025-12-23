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

interface SlidesRequest {
  title: string; // Presentation title
  outline: string[]; // Array of main topics with markdown content
  language: string; // Language to use for the slides
  tone: string; // Style for image queries (optional)
  teachingStyle?: TeachingStyle; // Teaching approach
  audienceType?: AudienceType; // Target audience
}

// Get teaching style content instructions
const getTeachingStyleContent = (style: TeachingStyle): string => {
  const styleMap: Record<TeachingStyle, string> = {
    "concept-first": "Structure each slide with: definition/concept first, then detailed explanation, followed by concrete examples. Build understanding from fundamentals.",
    "example-first": "Start each slide with a compelling real-world example or case study, then identify patterns, and finally reveal the underlying concept or principle.",
    "storytelling": "Frame content as a narrative with hooks, challenges, and resolutions. Use storytelling elements: characters, conflict, journey, and transformation.",
    "data-driven": "Lead with data, statistics, and evidence. Include charts where appropriate. Support every claim with quantifiable information and analysis.",
  };
  return styleMap[style];
};

// Get audience-specific content adjustments
const getAudienceContent = (audience: AudienceType): string => {
  const audienceMap: Record<AudienceType, string> = {
    "school": "Use simple, age-appropriate language. Include fun, relatable examples from everyday life. Add engaging visuals and interactive elements. Avoid technical jargon.",
    "college": "Include academic depth, theoretical frameworks, and references to research. Balance theory with practical applications. Encourage critical analysis and discussion.",
    "training": "Focus on practical, actionable skills. Include exercises, scenarios, and hands-on examples. Emphasize real-world workplace applications and immediate takeaways.",
    "professional": "Be concise and executive-friendly. Focus on strategic implications, ROI, and business value. Use professional terminology and respect the audience's time.",
  };
  return audienceMap[audience];
};

// Map language codes to full language names for better clarity
const getLanguageName = (langCode: string): string => {
  const languageMap: Record<string, string> = {
    "en-US": "English",
    "en-GB": "English",
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
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "bn": "Bengali",
  };
  return languageMap[langCode] ?? langCode;
};

const slidesTemplate = `
You are an expert presentation designer.Your task is to create an engaging presentation in XML format.
## CORE REQUIREMENTS

1. FORMAT: Use <SECTION> tags for each slide
2. CONTENT: DO NOT copy outline verbatim - expand with examples, data, and context
3. VARIETY: Each slide must use a DIFFERENT layout component
4. VISUALS: Include detailed image queries (10+ words) on every slide

## PRESENTATION DETAILS
- Title: {TITLE}
- Outline (for reference only): {OUTLINE_FORMATTED}
- Language: {LANGUAGE}
- Tone: {TONE}
- Total Slides: {TOTAL_SLIDES}

## LANGUAGE REQUIREMENT
CRITICAL: Write ALL content in {LANGUAGE} language only. All slide titles, headings, bullet points, paragraphs, and image queries must be in {LANGUAGE}. Do not mix languages.

## TEACHING APPROACH
{TEACHING_STYLE_INSTRUCTIONS}

## TARGET AUDIENCE
{AUDIENCE_INSTRUCTIONS}

## PRESENTATION STRUCTURE
\`\`\`xml
<PRESENTATION>

<!--Every slide must follow this structure (layout determines where the image appears, section identifies the slide's role) -->
<SECTION layout="left" | "right" | "vertical" section="introduction" | "content" | "example" | "activity" | "summary">
  <!-- Required: include ONE layout component per slide -->
  <!-- Required: include at least one detailed image query -->
</SECTION>

<!-- Other Slides in the SECTION tag-->

</PRESENTATION>
\`\`\`

## SECTION LAYOUTS
Vary the layout attribute in each SECTION tag to control image placement:
- layout="left" - Root image appears on the left side
- layout="right" - Root image appears on the right side
- layout="vertical" - Root image appears at the top

## SECTION TYPES (section attribute)
Assign an appropriate section type to each slide based on its pedagogical role:
- section="introduction" - Opening slides (hook, overview, agenda) - use for first 1-2 slides
- section="content" - Main body slides with core information and concepts
- section="example" - Slides with case studies, demonstrations, or practical illustrations
- section="activity" - Interactive elements, exercises, or audience engagement points
- section="summary" - Recap and conclusion slides - use for final 1-2 slides

Use all three layouts throughout the presentation for visual variety.

## AVAILABLE LAYOUTS
Choose ONE different layout for each slide:

1. COLUMNS: For comparisons
\`\`\`xml
<COLUMNS>
  <DIV><H3>First Concept</H3><P>Description</P></DIV>
  <DIV><H3>Second Concept</H3><P>Description</P></DIV>
</COLUMNS>
\`\`\`

2. BULLETS: For key points
\`\`\`xml
<BULLETS>
  <DIV><H3>Main Point</H3><P>Description</P></DIV>
  <DIV><P>Second point with details</P></DIV>
</BULLETS>
\`\`\`

3. ICONS: For concepts with symbols
\`\`\`xml
<ICONS>
  <DIV><ICON query="rocket" /><H3>Innovation</H3><P>Description</P></DIV>
  <DIV><ICON query="shield" /><H3>Security</H3><P>Description</P></DIV>
</ICONS>
\`\`\`

4. CYCLE: For processes and workflows
\`\`\`xml
<CYCLE>
  <DIV><H3>Research</H3><P>Initial exploration phase</P></DIV>
  <DIV><H3>Design</H3><P>Solution creation phase</P></DIV>
  <DIV><H3>Implement</H3><P>Execution phase</P></DIV>
  <DIV><H3>Evaluate</H3><P>Assessment phase</P></DIV>
</CYCLE>
\`\`\`

5. ARROWS: For cause-effect or flows
\`\`\`xml
<ARROWS>
  <DIV><H3>Challenge</H3><P>Current market problem</P></DIV>
  <DIV><H3>Solution</H3><P>Our innovative approach</P></DIV>
  <DIV><H3>Result</H3><P>Measurable outcomes</P></DIV>
</ARROWS>
\`\`\`

6. TIMELINE: For chronological progression
\`\`\`xml
<TIMELINE>
  <DIV><H3>2022</H3><P>Market research completed</P></DIV>
  <DIV><H3>2023</H3><P>Product development phase</P></DIV>
  <DIV><H3>2024</H3><P>Global market expansion</P></DIV>
</TIMELINE>
\`\`\`

7. PYRAMID: For hierarchical importance
\`\`\`xml
<PYRAMID>
  <DIV><H3>Vision</H3><P>Our aspirational goal</P></DIV>
  <DIV><H3>Strategy</H3><P>Key approaches to achieve vision</P></DIV>
  <DIV><H3>Tactics</H3><P>Specific implementation steps</P></DIV>
</PYRAMID>
\`\`\`

8. STAIRCASE: For progressive advancement
\`\`\`xml
<STAIRCASE>
  <DIV><H3>Basic</H3><P>Foundational capabilities</P></DIV>
  <DIV><H3>Advanced</H3><P>Enhanced features and benefits</P></DIV>
  <DIV><H3>Expert</H3><P>Premium capabilities and results</P></DIV>
</STAIRCASE>
\`\`\`

9. CHART: For data visualization (use approximately 1 in 10 slides when content has statistics/data)
\`\`\`xml
<CHART charttype="vertical-bar">
  <TABLE>
    <TR><TD type="label"><VALUE>Q1</VALUE></TD><TD type="data"><VALUE>45</VALUE></TD></TR>
    <TR><TD type="label"><VALUE>Q2</VALUE></TD><TD type="data"><VALUE>72</VALUE></TD></TR>
    <TR><TD type="label"><VALUE>Q3</VALUE></TD><TD type="data"><VALUE>89</VALUE></TD></TR>
  </TABLE>
</CHART>
\`\`\`
Chart types: "vertical-bar" (comparisons), "horizontal-bar" (rankings), "line" (trends), "pie" (parts of whole), "area" (cumulative trends)
Use charts when slide contains statistics, percentages, comparisons, or data trends. Include approximately 1 chart per 10 slides.

10. IMAGES: Most slides needs at least one
\`\`\`xml
<!-- Good image queries (detailed, specific): -->
<IMG query="futuristic smart city with renewable energy infrastructure and autonomous vehicles in morning light" />
<IMG query="close-up of microchip with circuit board patterns in blue and gold tones" />
<IMG query="diverse team of professionals collaborating in modern office with data visualizations" />

<!-- NOT just: "city", "microchip", "team meeting" -->
\`\`\`

## CONTENT EXPANSION STRATEGY
For each outline point:
- Add supporting data/statistics
- Include real-world examples
- Reference industry trends
- Add thought-provoking questions

## CRITICAL RULES
1. Generate exactly {TOTAL_SLIDES} slides. NOT MORE NOT LESS ! EXACTLY {TOTAL_SLIDES}
2. NEVER repeat layouts in consecutive slides
3. DO NOT copy outline verbatim - expand and enhance
4. Include at least one detailed image query in most of the slides
5. Use appropriate heading hierarchy
6. Vary the SECTION layout attribute (left/right/vertical) throughout the presentation
   - Use each layout (left, right, vertical) at least twice
   - Don't use the same layout more than twice in a row
7. ALWAYS include the section attribute on every SECTION tag
   - First slide: section="introduction"
   - Last slide: section="summary"
   - Middle slides: section="content", "example", or "activity" based on content

Now create a complete XML presentation with {TOTAL_SLIDES} slides that significantly expands on the outline.
`;

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.4, // Lower for faster, more deterministic output
  maxTokens: 3000, // Reduced for faster response - still plenty for full presentations
  streaming: true,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, outline, language, tone, teachingStyle, audienceType } =
      (await req.json()) as SlidesRequest;

    if (!title || !outline || !Array.isArray(outline) || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Use defaults if pedagogy params not provided
    const finalTeachingStyle: TeachingStyle = teachingStyle ?? "concept-first";
    const finalAudienceType: AudienceType = audienceType ?? "professional";

    // Convert language code to language name
    const languageName = getLanguageName(language);

    const prompt = PromptTemplate.fromTemplate(slidesTemplate);
    const stringOutputParser = new StringOutputParser();
    const chain = RunnableSequence.from([prompt, model, stringOutputParser]);

    const stream = await chain.stream({
      TITLE: title,
      LANGUAGE: languageName,
      TONE: tone,
      OUTLINE_FORMATTED: outline.join("\n\n"),
      TOTAL_SLIDES: outline.length,
      TEACHING_STYLE_INSTRUCTIONS: getTeachingStyleContent(finalTeachingStyle),
      AUDIENCE_INSTRUCTIONS: getAudienceContent(finalAudienceType),
    });

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    console.error("Error in presentation generation:", error);
    return NextResponse.json(
      { error: "Failed to generate presentation slides" },
      { status: 500 },
    );
  }
}
