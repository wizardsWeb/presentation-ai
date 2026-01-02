import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { 
  speechToText, 
  type LanguageCode 
} from "@/lib/bhashini/client";

export const runtime = "nodejs"; // Bhashini API needs Node.js runtime

/**
 * POST /api/ai/speech-to-text
 * 
 * Convert speech audio to text in Indian languages
 * 
 * Request body:
 * - audio: Base64 encoded audio content
 * - language: Language code (hi, bn, ta, te, mr, gu, kn, ml, pa, or, etc.)
 * 
 * Response:
 * - text: Transcribed text
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio, language } = body;

    if (!audio) {
      return NextResponse.json(
        { error: "Audio content is required" },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: "Language code is required" },
        { status: 400 }
      );
    }

    const text = await speechToText(audio as string, language as LanguageCode);

    return NextResponse.json({ 
      success: true,
      text,
      language 
    });
  } catch (error) {
    console.error("Speech-to-text error:", error);
    return NextResponse.json(
      { 
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
