import { env } from "@/env";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";

export interface SlideImagePrompt {
  slideTopic: string;
  slideNumber: number;
  totalSlides: number;
  language: string;
  tone: string;
  teachingStyle?: string;
  audienceType?: string;
  researchContext?: string;
}

/**
 * Generate a detailed, professional slide image prompt for nano banana
 * Creates a comprehensive prompt that will generate a complete slide as an image
 */
export function generateSlideImagePrompt(options: SlideImagePrompt): string {
  const {
    slideTopic,
    slideNumber,
    totalSlides,
    language,
    tone,
    teachingStyle = "professional",
    audienceType = "professional",
    researchContext,
  } = options;

  // Determine slide type based on position
  const isFirstSlide = slideNumber === 1;
  const isLastSlide = slideNumber === totalSlides;
  const slideType = isFirstSlide ? "title/introduction" : isLastSlide ? "summary/conclusion" : "content";

  // Build comprehensive prompt for detailed, content-rich slides
  const prompt = `Create a professional, detailed presentation slide image for a ${tone} ${audienceType} presentation. The slide must look like a complete, polished presentation slide with organized content, tables, charts, and visual elements.

SLIDE CONTENT:
Topic: "${slideTopic}"
Slide ${slideNumber} of ${totalSlides} (${slideType} slide)
${researchContext ? `\nResearch Context: ${researchContext}` : ""}

CRITICAL DESIGN REQUIREMENTS:
- Professional slide layout with clear visual hierarchy
- High contrast, readable text (minimum 12pt equivalent, preferably larger)
- Balanced composition with proper spacing and alignment
- Professional color scheme with good contrast for readability
- Generous white space for clarity and breathing room
- Typography: Use clear, professional fonts (sans-serif for headings, readable sans-serif for body text)
- All text must be crisp, clear, and easily readable - NOT pixelated or blurry

MANDATORY CONTENT ELEMENTS:
1. **TITLE SECTION (Top 10-15% of slide)**
   - Large, bold title: "${slideTopic}"
   - Subtitle or context if relevant
   - Clear visual separation from content

2. **MAIN CONTENT AREA (60-70% of slide)**
   - Organized into clear sections with visual separation
   - Use columns, boxes, or sections to organize information
   - Include 3-6 key points or pieces of information
   - Each point should be clearly labeled and explained

3. **VISUAL ELEMENTS (Integrated throughout)**
   - **TABLES**: If the topic involves comparisons, lists, or structured data, include a well-formatted table with:
     * Clear column headers
     * Organized rows with data
     * Professional borders and spacing
     * Easy-to-read text in cells
   - **CHARTS/GRAPHS**: If the topic involves data, statistics, trends, or comparisons, include appropriate charts:
     * Bar charts for comparisons
     * Line graphs for trends over time
     * Pie charts for proportions/percentages
     * Area charts for cumulative data
     * Charts must have clear labels, axes, legends, and readable values
   - **DIAGRAMS/ILLUSTRATIONS**: Include relevant diagrams, flowcharts, or illustrations that support the content
   - **ICONS**: Use relevant icons or symbols to enhance visual communication

4. **SUPPORTING ELEMENTS**
   - Bullet points or numbered lists where appropriate
   - Key statistics or metrics highlighted
   - Visual separators (lines, boxes, colors) to organize sections
   - Callout boxes for important information

LAYOUT OPTIONS (Choose the best fit for the content):
- **Two-column layout**: Title on left, content/diagram on right (or vice versa)
- **Three-section layout**: Title at top, two content sections below
- **Full-width with sections**: Title at top, content organized in horizontal sections
- **Grid layout**: Content organized in a grid with clear sections

STYLE GUIDELINES:
${teachingStyle === "data-driven" ? "- CRITICAL: Include data tables, charts, graphs, and statistical visualizations\n- Emphasize numbers, metrics, and quantitative information\n- Use bar charts, line graphs, and data tables prominently" : ""}
${teachingStyle === "storytelling" ? "- Use narrative flow with visual storytelling elements\n- Include engaging imagery and illustrations\n- Create visual connections between concepts" : ""}
${teachingStyle === "example-first" ? "- Showcase real-world examples with visual representations\n- Include before/after comparisons or case studies\n- Use diagrams showing practical applications" : ""}
${teachingStyle === "concept-first" ? "- CRITICAL: Include clear conceptual diagrams and flowcharts\n- Show relationships between concepts visually\n- Use structured information with visual hierarchy\n- Include process diagrams or step-by-step visuals" : ""}
${audienceType === "school" ? "- Colorful, engaging design with age-appropriate visuals\n- Larger text, simpler language\n- Fun illustrations and icons\n- Clear, bold colors" : ""}
${audienceType === "college" ? "- Academic, sophisticated design\n- Research-oriented with detailed information\n- Professional diagrams and technical illustrations\n- Include citations or references if relevant" : ""}
${audienceType === "professional" ? "- Corporate, executive-friendly design\n- Business-focused with professional aesthetics\n- Data-driven with charts and tables\n- Clean, modern design with subtle colors" : ""}
${audienceType === "training" ? "- Practical, hands-on instructional design\n- Step-by-step visual guides\n- Clear process diagrams\n- Action-oriented visuals" : ""}

TECHNICAL SPECIFICATIONS:
- Aspect ratio: 16:9 (1920x1080 pixels)
- Resolution: Ultra-high quality, all text must be crystal clear and readable
- Color depth: Rich, professional color palette with good contrast
- Text quality: All text must be rendered as vector-quality text, NOT pixelated
- Layout: Professional slide template style (like PowerPoint, Keynote, or Google Slides)
- File format: High-quality PNG with transparency support where needed

CONTENT REQUIREMENTS:
- **Title**: "${slideTopic}" - Large, bold, prominent at the top
- **Body Content**: 3-6 key points or pieces of information, well-organized
- **Tables**: Include tables if the topic has structured data, comparisons, or lists
- **Charts**: Include charts/graphs if the topic involves data, statistics, trends, or quantitative information
- **Diagrams**: Include relevant diagrams, flowcharts, or process illustrations
- **Visual Hierarchy**: Use size, color, and spacing to create clear visual hierarchy
- **Language**: All text must be in ${language}
- **Specificity**: Include specific details, examples, or data points related to "${slideTopic}"

VISUAL QUALITY REQUIREMENTS:
- Every element must be professionally designed and polished
- Text must be perfectly readable (no blur, no pixelation)
- Charts and tables must be clear and well-formatted
- Colors must be harmonious and professional
- Spacing must be consistent and balanced
- The overall slide must look like it was created by a professional presentation designer

OUTPUT REQUIREMENTS:
Generate a complete, ready-to-use presentation slide image that:
1. Contains all content as part of the image (no separate text layers needed)
2. Has professional layout with tables, charts, or diagrams where appropriate
3. Is visually complete and requires no additional editing
4. Looks like a high-quality slide from a professional presentation
5. Has all text clearly readable and properly formatted
6. Includes visual elements (tables, charts, diagrams) that enhance understanding

The slide should be a complete, self-contained image that looks exactly like a professional presentation slide with organized content, visual elements, and perfect formatting.`;

  return prompt;
}

/**
 * Generate slide image using Google Gemini 2.5 Flash Image model
 * Returns base64 image data that needs to be uploaded to UploadThing
 */
export async function generateSlideImageWithNanoBanana(
  prompt: string,
  options?: {
    width?: number;
    height?: number;
    style?: string;
  }
): Promise<{ success: boolean; url?: string; error?: string; buffer?: Buffer }> {
  // Use GOOGLE_AI_PRO_KEY for nano banana generation (PRIORITY)
  const apiKey = env.GOOGLE_AI_PRO_KEY || env.NANO_BANANA_API_KEY || env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("[Nano Banana] API key not found. Checked: GOOGLE_AI_PRO_KEY, NANO_BANANA_API_KEY, GOOGLE_API_KEY");
    return {
      success: false,
      error: "GOOGLE_AI_PRO_KEY not configured. Please set GOOGLE_AI_PRO_KEY in your .env file",
    };
  }

  // Validate API key format (Google API keys typically start with AIza)
  if (!apiKey.startsWith("AIza")) {
    console.warn(`[Nano Banana] API key format may be incorrect. Expected format: AIza...`);
  }
  console.log(`[Nano Banana] Using API key: ${apiKey.substring(0, 10)}... (length: ${apiKey.length})`);

  try {
    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use "gemini-2.5-flash-image" for Nano Banana
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
    });

    // Generate content with the prompt
    // Single attempt only (no retries for speed)
    console.log(`[Nano Banana] Generating image with prompt length: ${prompt.length} characters`);
    
    let result;
    try {
      result = await model.generateContent(prompt);
      console.log(`[Nano Banana] API call successful!`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: number })?.code;
      
      console.error(`[Nano Banana] API error:`, errorMessage);
      
      // Check if it's a rate limit error (429) or quota error
      const isRateLimit = 
        errorCode === 429 ||
        errorMessage.includes("429") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") || 
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("Rate limit");
      
      if (isRateLimit) {
        return {
          success: false,
          error: "Rate limit exceeded. Please wait a few minutes and try again, or check your Google AI API quota.",
        };
      }
      
      // For any other error, throw immediately
      throw error;
    }
    
    if (!result) {
      throw new Error("Failed to generate content");
    }
    
    const response = await result.response;

    // Extract base64 image data from response
    let imageBuffer: Buffer | null = null;

    for (const candidate of response.candidates || []) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          // Check if part contains inline image data (base64)
          if (part.inlineData && part.inlineData.data) {
            const imageData = part.inlineData.data;
            imageBuffer = Buffer.from(imageData, "base64");
            break;
          }
        }
        if (imageBuffer) break;
      }
    }

    if (!imageBuffer) {
      return {
        success: false,
        error: "No image data found in response",
      };
    }

    // Upload to UploadThing for permanent storage
    const filename = `slide_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    // Convert Buffer to Uint8Array for UTFile
    const uint8Array = new Uint8Array(imageBuffer);
    const utFile = new UTFile([uint8Array], filename);

    const uploadResult = await utapi.uploadFiles([utFile]);

    const uploadData = uploadResult[0];
    if (!uploadData?.data?.ufsUrl) {
      console.error("UploadThing error:", uploadData?.error);
      return {
        success: false,
        error: uploadData?.error?.message || "Failed to upload image to UploadThing",
        buffer: imageBuffer, // Return buffer as fallback
      };
    }

    const permanentUrl = uploadData.data.ufsUrl;
    console.log(`Nano Banana image uploaded to UploadThing: ${permanentUrl}`);

    return {
      success: true,
      url: permanentUrl,
    };
  } catch (error) {
    console.error("Nano banana generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}

/**
 * Generate a complete slide as an image
 */
export async function generateFullSlideImage(
  options: SlideImagePrompt
): Promise<{ success: boolean; url?: string; error?: string }> {
  const prompt = generateSlideImagePrompt(options);
  
  return generateSlideImageWithNanoBanana(prompt, {
    width: 1920,
    height: 1080,
    style: "professional",
  });
}

