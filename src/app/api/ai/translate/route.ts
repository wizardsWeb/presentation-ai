import { NextRequest, NextResponse } from "next/server";
import { 
  translateText, 
  type LanguageCode 
} from "@/lib/bhashini/client";

export const runtime = "nodejs"; // Bhashini API needs Node.js runtime

/**
 * POST /api/ai/translate
 * 
 * Translate text between Indian languages
 * 
 * Request body:
 * - text: Text to translate
 * - sourceLanguage: Source language code (hi, bn, ta, te, mr, gu, kn, ml, pa, or, etc.)
 * - targetLanguage: Target language code
 * 
 * Response:
 * - translation: Translated text
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, sourceLanguage, targetLanguage } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 }
      );
    }

    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: "Source and target language codes are required" },
        { status: 400 }
      );
    }

    const translation = await translateText(
      text as string,
      sourceLanguage as LanguageCode,
      targetLanguage as LanguageCode
    );

    return NextResponse.json({ 
      success: true,
      translation,
      sourceLanguage,
      targetLanguage
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { 
        error: "Failed to translate text",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
