import { LangChainAdapter } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

import { 
  type TeachingStyle, 
  type AudienceType 
} from "@/states/presentation-state";

// Use Edge runtime for OpenAI (faster streaming)
export const runtime = "edge";

interface OutlineRequest {
  prompt: string;
  numberOfCards: number;
  language: string;
  teachingStyle: TeachingStyle;
  audienceType: AudienceType;
}

// Map language codes to full language names for better clarity
const getLanguageName = (langCode: string): string => {
  const languageMap: Record<string, string> = {
    "en-US": "English",
    "en-GB": "English",
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "ru": "Russian",
    "it": "Italian",
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

// Get teaching style instructions
const getTeachingStyleInstructions = (style: TeachingStyle): string => {
  const styleMap: Record<TeachingStyle, string> = {
    "concept-first": "Start with definitions and core concepts, then explain the theory, and finally provide examples to illustrate. Each slide should build foundational understanding before application.",
    "example-first": "Begin each section with a real-world case study or example, then identify patterns, and finally extract the underlying concept. Use inductive reasoning throughout.",
    "storytelling": "Structure as a narrative: start with an engaging hook, present a problem or challenge, take the audience on a journey of discovery, and resolve with key insights and takeaways.",
    "data-driven": "Lead with statistics, data, and evidence. Present analysis of the data, draw insights, and support all claims with quantifiable information. Include charts/graphs conceptually.",
  };
  return styleMap[style];
};

// Get audience type instructions
const getAudienceTypeInstructions = (audience: AudienceType): string => {
  const audienceMap: Record<AudienceType, string> = {
    "school": "Target K-12 students. Use simple language, relatable analogies, fun examples, and avoid jargon. Make content engaging and age-appropriate. Include interactive elements conceptually.",
    "college": "Target university students. Include academic depth, theoretical frameworks, citations to research where relevant, and encourage critical thinking. Balance theory with practical applications.",
    "training": "Target corporate learners. Focus on practical skills, hands-on exercises, workplace scenarios, and actionable takeaways. Include practice activities and real-world applications.",
    "professional": "Target executives and professionals. Be concise, focus on strategic implications, use business terminology, and emphasize ROI/value. Respect their time with dense, high-value content.",
  };
  return audienceMap[audience];
};

// Optimized prompt - enhanced for multilingual support, pedagogy, and section markers
const outlineTemplate = `You are generating a presentation outline. 

CRITICAL REQUIREMENT: Generate EXACTLY {numberOfCards} slides. Not more, not less. If {numberOfCards} is 2, generate exactly 2 slides.

Topic: {prompt}
Language: {language}

TEACHING APPROACH: {teachingStyleInstructions}

TARGET AUDIENCE: {audienceInstructions}

SECTION TYPES (assign ONE to each slide based on its role):
- [introduction] - Opening slide (use for first slide only)
- [content] - Main body slides with core information
- [example] - Case studies or practical illustrations  
- [activity] - Interactive elements or exercises
- [summary] - Recap slide (use for last slide only)

FORMAT each slide as:
[section_type] # Topic Title
- Key point 1
- Key point 2
- Key point 3

RULES:
1. Generate EXACTLY {numberOfCards} slides total - this is mandatory
2. Write ALL content in {language} language only
3. Each slide must have a section type marker
4. 2-3 bullet points per slide
5. No bold/italic formatting
6. For 2 slides: use [introduction] for first, [summary] for second
7. For 3+ slides: use [introduction] for first, [summary] for last, others as needed`;

// OpenAI using LangChain for reliable streaming
const openAIChain = RunnableSequence.from([
  PromptTemplate.fromTemplate(outlineTemplate),
  new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.4, // Lower for faster, more deterministic output
    maxTokens: 1000, // Reduced from 1500 - outlines are concise
    streaming: true,
  }),
]);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, numberOfCards, language, teachingStyle, audienceType } =
      (await req.json()) as OutlineRequest;

    if (!prompt || !numberOfCards || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Use defaults if pedagogy params not provided
    const finalTeachingStyle: TeachingStyle = teachingStyle || "concept-first";
    const finalAudienceType: AudienceType = audienceType || "professional";

    // Get formatted values for the prompt
    const languageName = getLanguageName(language);
    const teachingStyleInstructions = getTeachingStyleInstructions(finalTeachingStyle);
    const audienceInstructions = getAudienceTypeInstructions(finalAudienceType);

    // Use OpenAI with LangChain for reliable streaming
    const stream = await openAIChain.stream({
      prompt,
      numberOfCards,
      language: languageName,
      teachingStyleInstructions,
      audienceInstructions,
    });

    // Restore streaming response for outline generation
    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    console.error("Error in outline generation:", error);
    return NextResponse.json(
      { error: "Failed to generate outline" },
      { status: 500 },
    );
  }
}
