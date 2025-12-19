import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { type AudienceType } from "@/states/presentation-state";
import { nanoid } from "nanoid";
import { env } from "@/env";

// Use Node.js runtime when using Gemini (Edge runtime has compatibility issues)
export const runtime = env.GOOGLE_API_KEY ? "nodejs" : "edge";

interface QuizRequest {
  slideContents: string[];     // Text content extracted from slides
  presentationTitle: string;
  numberOfQuestions: number;   // How many questions to generate
  language: string;
  audienceType: AudienceType;
}

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  slideIndex?: number;
}

// Map language codes to full language names
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

// Get audience-appropriate quiz settings
const getAudienceQuizSettings = (audience: AudienceType): string => {
  const settings: Record<AudienceType, string> = {
    "school": "Use simple, clear language. Make questions fun and engaging. Avoid complex terminology. Include encouraging feedback in explanations.",
    "college": "Include analytical questions that test deeper understanding. Reference concepts and theories. Challenge critical thinking.",
    "training": "Focus on practical application and real-world scenarios. Test understanding of procedures and best practices.",
    "professional": "Ask strategic questions about implications and applications. Be concise and business-focused.",
  };
  return settings[audience];
};

// Quiz generation prompt template
const createQuizPrompt = (
  presentationTitle: string,
  slideContents: string,
  numberOfQuestions: number,
  language: string,
  audienceSettings: string
) => `You are an expert quiz creator. Generate ${numberOfQuestions} multiple-choice questions based on the presentation content below.

PRESENTATION TITLE: ${presentationTitle}

SLIDE CONTENTS:
${slideContents}

LANGUAGE: Generate all questions and answers in ${language}

AUDIENCE GUIDELINES: ${audienceSettings}

REQUIREMENTS:
1. Each question must have exactly 4 options (A, B, C, D)
2. Questions should test understanding, not just recall
3. Mix difficulty levels: some easy, some medium, some hard
4. Explanations should clarify why the correct answer is right
5. Questions should cover different slides/topics from the presentation
6. Make wrong options plausible but clearly incorrect

OUTPUT FORMAT (strict JSON array only, no markdown):
[
  {
    "question": "The question text in ${language}",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Clear explanation of why this answer is correct",
    "difficulty": "easy",
    "slideIndex": 0
  }
]

Generate exactly ${numberOfQuestions} questions as a valid JSON array. Output ONLY the JSON array, no additional text, no markdown code blocks.`;

// Parse and validate questions from AI response
function parseQuestions(result: string): GeneratedQuestion[] {
  let jsonStr = result.trim();
  
  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();
  
  const parsed = JSON.parse(jsonStr) as GeneratedQuestion[];
  
  // Validate and sanitize questions
  return parsed.map((q, idx) => ({
    id: nanoid(),
    question: q.question || `Question ${idx + 1}`,
    options: Array.isArray(q.options) && q.options.length === 4 
      ? q.options 
      : ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer <= 3 
      ? q.correctAnswer 
      : 0,
    explanation: q.explanation || "No explanation provided.",
    difficulty: ["easy", "medium", "hard"].includes(q.difficulty) 
      ? q.difficulty 
      : "medium",
    slideIndex: typeof q.slideIndex === "number" ? q.slideIndex : undefined,
  }));
}

// Generate quiz using Gemini
async function generateWithGemini(
  presentationTitle: string,
  slideContents: string,
  numberOfQuestions: number,
  language: string,
  audienceSettings: string
): Promise<GeneratedQuestion[]> {
  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4000,
    },
  });

  const prompt = createQuizPrompt(
    presentationTitle,
    slideContents,
    numberOfQuestions,
    language,
    audienceSettings
  );

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  return parseQuestions(text);
}

// Generate quiz using OpenAI (fallback)
async function generateWithOpenAI(
  presentationTitle: string,
  slideContents: string,
  numberOfQuestions: number,
  language: string,
  audienceSettings: string
): Promise<GeneratedQuestion[]> {
  const promptTemplate = `You are an expert quiz creator. Generate {numberOfQuestions} multiple-choice questions based on the presentation content below.

PRESENTATION TITLE: {presentationTitle}

SLIDE CONTENTS:
{slideContents}

LANGUAGE: Generate all questions and answers in {language}

AUDIENCE GUIDELINES: {audienceSettings}

REQUIREMENTS:
1. Each question must have exactly 4 options (A, B, C, D)
2. Questions should test understanding, not just recall
3. Mix difficulty levels: some easy, some medium, some hard
4. Explanations should clarify why the correct answer is right
5. Questions should cover different slides/topics from the presentation
6. Make wrong options plausible but clearly incorrect

OUTPUT FORMAT (strict JSON array only):
[
  {{
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Clear explanation",
    "difficulty": "easy" | "medium" | "hard",
    "slideIndex": 0
  }}
]

Generate exactly {numberOfQuestions} questions as a valid JSON array. No additional text.`;

  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 4000,
  });

  const chain = RunnableSequence.from([
    PromptTemplate.fromTemplate(promptTemplate),
    model,
    new StringOutputParser(),
  ]);

  const result = await chain.invoke({
    presentationTitle,
    slideContents,
    numberOfQuestions,
    language,
    audienceSettings,
  });

  return parseQuestions(result);
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      slideContents, 
      presentationTitle, 
      numberOfQuestions, 
      language,
      audienceType 
    } = (await req.json()) as QuizRequest;

    if (!slideContents || !Array.isArray(slideContents) || slideContents.length === 0) {
      return NextResponse.json(
        { error: "Slide contents are required" },
        { status: 400 }
      );
    }

    // Format slide contents with indices for reference
    const formattedSlides = slideContents
      .map((content, idx) => `[Slide ${idx + 1}]\n${content}`)
      .join("\n\n---\n\n");

    const questionsToGenerate = Math.min(numberOfQuestions || 5, 10); // Max 10 questions
    const audienceSettings = getAudienceQuizSettings(audienceType || "professional");
    const languageName = getLanguageName(language || "en-US");

    let questions: GeneratedQuestion[];

    try {
      // Use Gemini if API key is available, otherwise fallback to OpenAI
      if (env.GOOGLE_API_KEY) {
        questions = await generateWithGemini(
          presentationTitle || "Untitled Presentation",
          formattedSlides,
          questionsToGenerate,
          languageName,
          audienceSettings
        );
      } else {
        questions = await generateWithOpenAI(
          presentationTitle || "Untitled Presentation",
          formattedSlides,
          questionsToGenerate,
          languageName,
          audienceSettings
        );
      }
    } catch (parseError) {
      console.error("Failed to parse quiz questions:", parseError);
      return NextResponse.json(
        { error: "Failed to generate valid quiz questions" },
        { status: 500 }
      );
    }

    // Return the quiz data
    return NextResponse.json({
      success: true,
      quiz: {
        questions,
        currentQuestionIndex: 0,
        userAnswers: questions.map(() => null),
        isComplete: false,
        score: 0,
        showResults: false,
      },
    });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
