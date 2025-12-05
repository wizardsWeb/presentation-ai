"use server";

import { env } from "@/env";
import Together from "together-ai";
import { db } from "@/server/db";
import { auth } from "@/server/auth";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";

const together = new Together({ apiKey: env.TOGETHER_AI_API_KEY });

export type ImageModelList =
  | "black-forest-labs/FLUX1.1-pro"
  | "black-forest-labs/FLUX.1-schnell"
  | "black-forest-labs/FLUX.1-schnell-Free"
  | "black-forest-labs/FLUX.1-pro"
  | "black-forest-labs/FLUX.1-dev"
  | "pollinations"
  | "unsplash"; // Fast stock photos

/**
 * Search for images on Unsplash (fast, high-quality stock photos)
 * Free tier: 50 requests/hour
 */
async function searchUnsplash(query: string): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  // Extract keywords from the prompt for better search
  const keywords = extractKeywords(query);
  
  if (!accessKey) {
    // Fallback to Unsplash Source (no API key needed, but less control)
    const encodedQuery = encodeURIComponent(keywords);
    return `https://source.unsplash.com/1024x768/?${encodedQuery}`;
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Unsplash API error");
    }

    const data = await response.json() as {
      results: Array<{
        urls: {
          regular: string;
          full: string;
        };
      }>;
    };

    if (data.results && data.results.length > 0) {
      // Use regular size (1080px width) for good quality without being too large
      return data.results[0]?.urls?.regular ?? data.results[0]?.urls?.full ?? "";
    }

    // Fallback if no results
    const encodedQuery = encodeURIComponent(keywords);
    return `https://source.unsplash.com/1024x768/?${encodedQuery}`;
  } catch {
    // Fallback to Unsplash Source
    const encodedQuery = encodeURIComponent(keywords);
    return `https://source.unsplash.com/1024x768/?${encodedQuery}`;
  }
}

/**
 * Extract meaningful keywords from a prompt for image search
 */
function extractKeywords(prompt: string): string {
  // Remove common filler words and keep meaningful terms
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'dare', 'ought', 'used', 'image', 'photo', 'picture', 'showing',
    'depicting', 'illustration', 'graphic', 'visual', 'style', 'like',
    'such', 'very', 'really', 'just', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'over',
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Take first 3-5 meaningful words for better search results
  return words.slice(0, 5).join(' ');
}

/**
 * Generate image using Pollinations.ai (free, no API key needed)
 * Returns a direct URL that can be used immediately
 */
async function generateWithPollinations(prompt: string): Promise<string> {
  // Pollinations generates images on-demand via URL
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  // URL format: https://image.pollinations.ai/prompt/{prompt}?width=1024&height=768&seed={seed}
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&seed=${seed}&nologo=true`;
  
  // Verify the URL works by making a HEAD request
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('Pollinations image generation failed');
    }
  } catch {
    // If HEAD fails, the URL might still work (some servers don't support HEAD)
    console.log('HEAD request failed, but URL may still work');
  }
  
  return imageUrl;
}

/**
 * Generate image using Together AI
 */
async function generateWithTogetherAI(
  prompt: string,
  model: Exclude<ImageModelList, "pollinations">
): Promise<string> {
  const response = (await together.images.create({
    model: model,
    prompt: prompt,
    width: 1024,
    height: 768,
    steps: model.includes("schnell") ? 4 : 28,
    n: 1,
  })) as unknown as {
    id: string;
    model: string;
    object: string;
    data: {
      url: string;
    }[];
  };

  const imageUrl = response.data[0]?.url;
  if (!imageUrl) {
    throw new Error("Failed to generate image with Together AI");
  }
  
  return imageUrl;
}

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "unsplash", // Default to Unsplash for speed
  skipUpload: boolean = false // Set to true to skip UploadThing and return direct URL
) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to generate images");
  }

  try {
    let imageUrl: string;

    // Generate/search image based on selected model
    if (model === "unsplash") {
      imageUrl = await searchUnsplash(prompt);
      // Unsplash URLs are permanent, no need to upload
      skipUpload = true;
    } else if (model === "pollinations") {
      imageUrl = await generateWithPollinations(prompt);
      // Pollinations URLs are permanent, no need to upload
      skipUpload = true;
    } else {
      imageUrl = await generateWithTogetherAI(prompt, model);
    }

    // If skipping upload, return the direct URL
    if (skipUpload) {
      // Store in database with the direct URL
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
