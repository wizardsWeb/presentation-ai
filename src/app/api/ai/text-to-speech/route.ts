import { NextRequest, NextResponse } from "next/server";
import { 
  textToSpeech, 
  type LanguageCode 
} from "@/lib/bhashini/client";

export const runtime = "nodejs"; // Bhashini API needs Node.js runtime

/**
 * POST /api/ai/text-to-speech
 * 
 * Convert text to speech audio in Indian languages
 * 
 * Request body:
 * - text: Text to convert to speech
 * - language: Language code (hi, bn, ta, te, mr, gu, kn, ml, pa, or, etc.)
 * - gender: Voice gender ("male" or "female", default: "female")
 * 
 * Response:
 * - audio: Base64 encoded audio content
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language, gender = "female" } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: "Language code is required" },
        { status: 400 }
      );
    }

    const audioBase64 = await textToSpeech(
      text as string, 
      language as LanguageCode,
      gender as "male" | "female"
    );

    return NextResponse.json({ 
      success: true,
      audio: audioBase64,
      language,
      gender
    });
  } catch (error) {
    console.error("Text-to-speech error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate speech",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
