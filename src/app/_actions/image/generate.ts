"use server";

import { db } from "@/server/db";
import { auth } from "@/server/auth";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import { 
  generateImage,
  generateImagesBatch,
  preloadImages,
  mapLegacyModel, 
  getCacheStats,
  type ImageProvider,
  type ImageResult,
  type ImageCategory,
} from "@/lib/image/image-service";

export type ImageModelList =
  | "black-forest-labs/FLUX1.1-pro"
  | "black-forest-labs/FLUX.1-schnell"
  | "black-forest-labs/FLUX.1-schnell-Free"
  | "black-forest-labs/FLUX.1-pro"
  | "black-forest-labs/FLUX.1-dev"
  | "pollinations"
  | "unsplash" // Fast stock photos
  | "nano-banana"; // Full slide image generation

export type ImageQuality = "low" | "medium" | "high";

/**
 * Enhanced image generation options
 */
export interface EnhancedImageOptions {
  /** Use Gemini to enhance the prompt for better results */
  enhancePrompt?: boolean;
  /** Enable automatic fallbacks if primary provider fails */
  fallbackEnabled?: boolean;
  /** Skip upload to UploadThing (use direct URL) */
  skipUpload?: boolean;
  /** Quality tier affects provider selection */
  quality?: ImageQuality;
  /** Hint for smart provider selection */
  category?: ImageCategory;
  /** Generation mode - quick mode skips Gemini enhancement and uses Unsplash directly */
  generationMode?: "quick" | "research";
}

/**
 * Generate an image with intelligent fallbacks and prompt enhancement
 * 
 * Optimized Flow:
 * 1. Check cache for existing result (instant if cached)
 * 2. Analyze prompt to detect best category (photo, abstract, etc.)
 * 3. Optionally enhance prompt with Gemini (cached)
 * 4. Try optimal provider based on category and quality
 * 5. If fails, cascade through fallback chain automatically
 * 6. Validate final URL and cache result
 * 7. Optionally upload to UploadThing for permanent storage
 */
export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "unsplash",
  skipUpload = false,
  options: EnhancedImageOptions = {}
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to generate images");
  }

  const {
    enhancePrompt = true, // Default to enhancing prompts
    fallbackEnabled = true,
    quality = "medium",
    category,
    generationMode,
  } = options;

  try {
    // In quick mode, skip model mapping and force Unsplash
    // In research mode or default, use the specified model
    const provider: ImageProvider = generationMode === "quick" 
      ? "unsplash" 
      : mapLegacyModel(model);
    
    // Use the enhanced image service with all optimizations
    const result: ImageResult = await generateImage({
      prompt,
      provider,
      enhancePrompt: generationMode === "quick" ? false : enhancePrompt, // Skip enhancement in quick mode
      fallbackEnabled,
      maxRetries: 2,
      quality,
      category,
      generationMode, // Pass generation mode to image service
    });

    if (!result.success || !result.url) {
      throw new Error(result.error ?? "Failed to generate image");
    }

    // Log generation details
    const cacheInfo = result.fromCache ? " (from cache)" : "";
    console.log(`Image generated: provider=${result.provider}, category=${result.category}, fallback=${result.fallbackUsed}${cacheInfo}`);
    if (result.enhancedPrompt) {
      console.log(`Prompt enhanced: "${prompt.substring(0, 50)}..." → "${result.enhancedPrompt.substring(0, 50)}..."`);
    }

    const imageUrl = result.url;

    // Determine if we should skip upload
    // Skip for stock photo URLs (they're permanent) or cached results
    const isStockPhoto = result.provider === "unsplash" || result.provider === "pexels";
    const shouldSkipUpload = skipUpload || isStockPhoto || result.fromCache;

    // If skipping upload, return the direct URL
    if (shouldSkipUpload) {
      const generatedImage = await db.generatedImage.create({
        data: {
          url: imageUrl,
          prompt: prompt,
          userId: session.user.id,
        },
      });

      return {
        success: true,
        image: generatedImage,
        metadata: {
          provider: result.provider,
          enhancedPrompt: result.enhancedPrompt,
          fallbackUsed: result.fallbackUsed,
        },
      };
    }

    // Download and upload to UploadThing for permanent storage
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image");
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    const filename = `${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

    const uploadResult = await utapi.uploadFiles([utFile]);

    if (!uploadResult[0]?.data?.ufsUrl) {
      console.error("Upload error:", uploadResult[0]?.error);
      // Fallback to direct URL if upload fails
      console.log("Falling back to direct URL");
      const generatedImage = await db.generatedImage.create({
        data: {
          url: imageUrl,
          prompt: prompt,
          userId: session.user.id,
        },
      });

      return {
        success: true,
        image: generatedImage,
        metadata: {
          provider: result.provider,
          enhancedPrompt: result.enhancedPrompt,
          fallbackUsed: result.fallbackUsed,
          uploadFailed: true,
        },
      };
    }

    console.log(uploadResult);
    const permanentUrl = uploadResult[0].data.ufsUrl;
    console.log(`Uploaded to UploadThing URL: ${permanentUrl}`);

    const generatedImage = await db.generatedImage.create({
      data: {
        url: permanentUrl,
        prompt: prompt,
        userId: session.user.id,
      },
    });

    return {
      success: true,
      image: generatedImage,
      metadata: {
        provider: result.provider,
        enhancedPrompt: result.enhancedPrompt,
        fallbackUsed: result.fallbackUsed,
        uploaded: true,
      },
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}

/**
 * Generate multiple images in parallel (optimized for batch operations)
 * Uses caching and parallel processing for maximum efficiency
 */
export async function generateImagesAction(
  prompts: string[],
  model: ImageModelList = "unsplash",
  options: Omit<EnhancedImageOptions, 'skipUpload'> = {}
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to generate images");
  }

  const provider: ImageProvider = mapLegacyModel(model);
  
  const results = await generateImagesBatch(prompts, {
    provider,
    enhancePrompt: options.enhancePrompt ?? true,
    fallbackEnabled: options.fallbackEnabled ?? true,
    quality: options.quality ?? "medium",
  });

  // Log batch stats
  const cached = results.filter(r => r.fromCache).length;
  const successful = results.filter(r => r.success).length;
  console.log(`Batch complete: ${successful}/${prompts.length} successful, ${cached} from cache`);

  return {
    success: true,
    results: results.map(r => ({
      url: r.url,
      provider: r.provider,
      fromCache: r.fromCache,
      success: r.success,
    })),
  };
}

/**
 * Preload images in background (fire-and-forget)
 * Call this early to warm up the cache before images are needed
 */
export async function preloadImagesAction(
  prompts: string[],
  model: ImageModelList = "unsplash"
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to preload images");
  }

  const provider: ImageProvider = mapLegacyModel(model);
  
  // Fire and forget - preloading happens in background
  preloadImages(prompts, { provider, enhancePrompt: true });

  return { success: true, message: `Preloading ${prompts.length} images in background` };
}

/**
 * Get image cache statistics (for debugging/monitoring)
 */
export async function getImageCacheStatsAction() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in");
  }

  return getCacheStats();
}
