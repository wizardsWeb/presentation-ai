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
  _options?: {
    width?: number;
    height?: number;
    style?: string;
  }
): Promise<{ success: boolean; url?: string; error?: string; buffer?: Buffer }> {
  // Use GOOGLE_AI_PRO_KEY for nano banana generation (PRIORITY)
  const apiKey = env.GOOGLE_AI_PRO_KEY ?? env.NANO_BANANA_API_KEY ?? env.GOOGLE_API_KEY;

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

    // Try multiple model names - Google's image generation models may vary
    // Note: Gemini models that support image generation may have different names
    const possibleModels = [
      "gemini-2.0-flash-exp",  // Experimental flash model
      "gemini-2.0-flash-thinking-exp",  // Thinking variant
      "gemini-1.5-flash",  // Fallback to flash
      "gemini-1.5-pro",  // Pro variant
    ];

    let result;
    let lastError: Error | null = null;

    // Try each model until one works
    for (const modelName of possibleModels) {
      try {
        console.log(`[Nano Banana] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
        });

        // Generate content with the prompt
        console.log(`[Nano Banana] Generating image with prompt length: ${prompt.length} characters`);
        
        result = await model.generateContent(prompt);
        console.log(`[Nano Banana] API call successful with model: ${modelName}!`);
        break;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = (error as { code?: number })?.code;
        
        console.warn(`[Nano Banana] Model ${modelName} failed:`, errorMessage);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a model not found error (404) - try next model
        const isModelNotFound = 
          errorCode === 404 ||
          errorMessage.includes("404") ||
          errorMessage.includes("not found") ||
          errorMessage.includes("MODEL_NOT_FOUND");
        
        if (isModelNotFound) {
          console.log(`[Nano Banana] Model ${modelName} not found, trying next...`);
          continue; // Try next model
        }
        
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
        
        // For other errors, continue to next model
        continue;
      }
    }

    // If all models failed, return error
    if (!result) {
      const errorMessage = lastError?.message ?? "All models failed";
      console.error(`[Nano Banana] All models failed. Last error:`, errorMessage);
      return {
        success: false,
        error: `Image generation failed: ${errorMessage}. Please check your API key has access to image generation models. Note: Gemini models may not support direct image generation.`,
      };
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const response = await result.response;

    // Log response structure for debugging
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const responseText = response.text();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const candidates = (response.candidates ?? []) as unknown[];
    console.log(`[Nano Banana] Response structure:`, {
      hasCandidates: candidates.length > 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      candidatesCount: candidates.length,
      responseText: typeof responseText === 'string' ? responseText.substring(0, 200) : "No text",
    });

    // Extract base64 image data from response
    let imageBuffer: Buffer | null = null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    for (const candidate of candidates) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (candidate.content?.parts) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.log(`[Nano Banana] Found ${candidate.content.parts.length} parts in candidate`);
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        for (const part of candidate.content.parts) {
          // Log part structure for debugging
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-optional-chain
          const hasInlineData = part.inlineData && part.inlineData.data;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const hasText = !!part.text;
          console.log(`[Nano Banana] Part type:`, {
            hasInlineData: !!hasInlineData,
            hasText,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            partKeys: Object.keys(part),
          });

          // Check if part contains inline image data (base64)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-optional-chain
          if (part.inlineData?.data) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
            const imageData = part.inlineData.data as string;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            console.log(`[Nano Banana] Found image data, length: ${typeof imageData === 'string' ? imageData.length : 'unknown'}`);
            imageBuffer = Buffer.from(imageData, "base64");
            break;
          }
          
          // Alternative: Check for image in different response formats
          // Some Gemini models return images differently
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          const partAny = part as Record<string, unknown>;
          const altImageData = partAny.imageData ?? partAny.image;
          if (typeof altImageData === 'string') {
            console.log(`[Nano Banana] Found alternative image data format`);
            imageBuffer = Buffer.from(altImageData, "base64");
            break;
          }
        }
        if (imageBuffer) break;
      }
    }

    if (!imageBuffer) {
      // Log full response for debugging
      console.error(`[Nano Banana] No image data found. Full response:`, JSON.stringify(response, null, 2).substring(0, 1000));
      return {
        success: false,
        error: "No image data found in response. The model may not support image generation, or the response format is unexpected.",
      };
    }

    // Upload to UploadThing for permanent storage
    try {
      const filename = `slide_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      // Convert Buffer to Uint8Array for UTFile
      const uint8Array = new Uint8Array(imageBuffer);
      const utFile = new UTFile([uint8Array], filename);

      console.log(`[Nano Banana] Uploading image to UploadThing, size: ${imageBuffer.length} bytes`);
      const uploadResult = await utapi.uploadFiles([utFile]);

      const uploadData = uploadResult[0];
      if (!uploadData?.data?.ufsUrl) {
        console.error("[Nano Banana] UploadThing error:", uploadData?.error);
        console.error("[Nano Banana] UploadThing response:", JSON.stringify(uploadData, null, 2));
        return {
          success: false,
          error: uploadData?.error?.message ?? "Failed to upload image to UploadThing. Please check UPLOADTHING_SECRET and UPLOADTHING_APP_ID environment variables.",
          buffer: imageBuffer, // Return buffer as fallback
        };
      }

      const permanentUrl = uploadData.data.ufsUrl;
      console.log(`[Nano Banana] Image uploaded successfully to UploadThing: ${permanentUrl}`);

      return {
        success: true,
        url: permanentUrl,
      };
    } catch (uploadError) {
      console.error("[Nano Banana] UploadThing upload failed:", uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}. Please check UploadThing configuration.`,
        buffer: imageBuffer, // Return buffer as fallback
      };
    }
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

