import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/env";
import { db } from "@/server/db";
import { type InputJsonValue } from "@prisma/client/runtime/library";
import { retryDbOperation } from "@/lib/db/retry";

// Use Node.js runtime for Gemini
export const runtime = "nodejs";

// GET endpoint to retrieve existing presenter notes
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const presentationId = searchParams.get("presentationId");

    if (!presentationId) {
      return NextResponse.json(
        { error: "Missing presentationId" },
        { status: 400 },
      );
    }

    // Fetch presenter notes from database with retry logic
    const presentation = await retryDbOperation(
      () => db.presentation.findUnique({
        where: { id: presentationId },
      })
    ) as { presenterNotes?: unknown } | null;

    const notes = presentation?.presenterNotes as Array<{
      summary: string;
      fullNotes: string;
    }> | undefined;

    if (!notes || !Array.isArray(notes)) {
      return NextResponse.json({ notes: null });
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching presenter notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch presenter notes" },
      { status: 500 },
    );
  }
}

interface PresenterNotesRequest {
  presentationId: string;
  slides: Array<{
    content: string; // Plain text content of the slide
    slideNumber: number;
  }>;
  language: string;
  presentationTitle?: string;
}

// Generate presenter notes using Gemini or OpenAI
async function generatePresenterNotes(
  slides: PresenterNotesRequest["slides"],
  language: string,
  presentationTitle?: string,
): Promise<Array<{ summary: string; fullNotes: string }>> {
  const languageName = getLanguageName(language);
  
  const prompt = `You are an expert presentation coach. Generate presenter notes for ${slides.length} slides in ${languageName} language.

Presentation Title: ${presentationTitle ?? "Untitled"}

For EACH slide, you must provide:
1. "summary": A concise 2-4 line overview in ${languageName}
2. "fullNotes": Detailed presenter notes in ${languageName} explaining:
   - WHY the content is structured this way
   - HOW to present it effectively  
   - Key talking points and transitions
   - What to emphasize
   - Estimated speaking time

CRITICAL: You MUST return a valid JSON array with exactly ${slides.length} items. No markdown, no explanations, just pure JSON.

JSON Format (return this exact structure):
[
  {
    "summary": "2-4 line summary here",
    "fullNotes": "Complete detailed notes here"
  }
]

Slides:
${slides.map((slide) => `\nSlide ${slide.slideNumber}:\n${slide.content ?? "(No content)"}`).join("\n\n---\n\n")}

Return ONLY the JSON array starting with [ and ending with ].`;

  // Use Gemini only
  if (!env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is required for presenter notes generation");
  }

  const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8000, // Increased to handle multiple slides
    },
  });

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log("Gemini response length:", response.length);
    
    // Extract JSON from response
    let jsonString = response.trim();
    
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\n?/gi, "").replace(/```\n?/g, "");
    
    // Try to find JSON array - use more flexible matching
    let jsonMatch = jsonString.match(/\[[\s\S]*\]/);
    
    // If no match, try to find JSON that might be incomplete
    if (!jsonMatch) {
      // Try to find the start of JSON array
      const startIndex = jsonString.indexOf('[');
      if (startIndex !== -1) {
        // Try to extract from start to end, handling potential truncation
        const potentialJson = jsonString.substring(startIndex);
        // Try to fix incomplete JSON by finding the last complete object
        const lastCompleteBrace = potentialJson.lastIndexOf('}');
        if (lastCompleteBrace !== -1) {
          const fixedJson = potentialJson.substring(0, lastCompleteBrace + 1) + ']';
          jsonMatch = [fixedJson];
        }
      }
    }
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate structure
        if (!Array.isArray(parsed)) {
          throw new Error("Response is not a JSON array");
        }
        
        // Ensure correct length
        if (parsed.length !== slides.length) {
          console.warn(`Expected ${slides.length} notes, got ${parsed.length}. Adjusting...`);
          // Pad if needed
          while (parsed.length < slides.length) {
            parsed.push({
              summary: "Summary not available",
              fullNotes: "Full notes not available",
            });
          }
          // Truncate if too many
          parsed.splice(slides.length);
        }
        
        // Validate each item
        for (let i = 0; i < parsed.length; i++) {
          const item = parsed[i] as { summary?: string; fullNotes?: string };
          if (!item || typeof item !== "object") {
            parsed[i] = { summary: "Summary not available", fullNotes: "Full notes not available" };
          } else {
            if (!item.summary) item.summary = "Summary not available";
            if (!item.fullNotes) item.fullNotes = "Full notes not available";
          }
        }
        
        return parsed as Array<{ summary: string; fullNotes: string }>;
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Attempted to parse:", jsonMatch[0].substring(0, 500));
        throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
      }
    }
    
    throw new Error("Failed to find JSON array in Gemini response");
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
}

// Map language codes to full language names
function getLanguageName(langCode: string): string {
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
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { presentationId, slides, language, presentationTitle } =
      (await req.json()) as PresenterNotesRequest;

    if (!presentationId || !slides || !Array.isArray(slides) || slides.length === 0 || !language) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if presenter notes already exist in the database
    // Use retry logic for connection stability
    const existingPresentation = await retryDbOperation(
      () => db.presentation.findUnique({
        where: { id: presentationId },
      })
    );

    // If presenter notes exist and match the number of slides, return them
    const existingNotes = (existingPresentation as { presenterNotes?: unknown })?.presenterNotes as Array<{
      summary: string;
      fullNotes: string;
    }> | undefined;
    
    if (existingNotes && Array.isArray(existingNotes) && existingNotes.length === slides.length) {
      console.log("Returning existing presenter notes from database");
      return NextResponse.json({ notes: existingNotes });
    }

    // Generate new presenter notes
    const notes = await generatePresenterNotes(slides, language, presentationTitle ?? undefined);

    // Save presenter notes to the database with retry logic
    try {
      await retryDbOperation(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.presentation.update as any)({
          where: { id: presentationId },
          data: {
            presenterNotes: notes as unknown as InputJsonValue,
          },
        });
      });
      console.log("Presenter notes saved to database");
    } catch (dbError) {
      console.error("Failed to save presenter notes to database:", dbError);
      // Don't fail the request if saving fails - still return the notes
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error generating presenter notes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    
    return NextResponse.json(
      { 
        error: "Failed to generate presenter notes",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}
