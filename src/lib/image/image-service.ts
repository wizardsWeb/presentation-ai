/**
 * Enhanced Image Generation Service
 * 
 * Features:
 * - Gemini-powered prompt enhancement for better image quality
 * - Multi-provider fallback chain (ensures images always load)
 * - Image validation (checks if URL is accessible)
 * - Retry logic with exponential backoff
 * - Intelligent caching (prompts + URLs)
 * - Smart provider selection based on prompt type
 * - Parallel processing for batch operations
 * - Progressive loading support
 */

import { env } from "@/env";
import Together from "together-ai";

// ============================================================================
// TYPES
// ============================================================================

export type ImageProvider = 
  | "unsplash"
  | "pexels"
  | "pollinations"
  | "flux-schnell"
  | "flux-pro"
  | "flux-dev"
  | "nano-banana";

export type ImageCategory = 
  | "photo"      // Real photos (people, places, objects)
  | "abstract"   // Abstract concepts, patterns
  | "diagram"    // Technical diagrams, charts
  | "icon"       // Simple iconic representations
  | "scene"      // Complex scenes, illustrations

export interface ImageGenerationOptions {
  prompt: string;
  provider?: ImageProvider;
  width?: number;
  height?: number;
  enhancePrompt?: boolean; // Use Gemini to enhance the prompt
  fallbackEnabled?: boolean; // Enable fallback chain
  maxRetries?: number;
  category?: ImageCategory; // Hint for smart provider selection
  quality?: "low" | "medium" | "high"; // Quality tier
  generationMode?: "quick" | "research"; // Generation mode - quick mode skips Gemini enhancement
}

export interface ImageResult {
  success: boolean;
  url?: string;
  provider?: ImageProvider;
  originalPrompt: string;
  enhancedPrompt?: string;
  error?: string;
  fallbackUsed?: boolean;
  fromCache?: boolean;
  category?: ImageCategory;
}

// ============================================================================
// CACHING SYSTEM
// ============================================================================

interface CacheEntry {
  url: string;
  provider: ImageProvider;
  timestamp: number;
  enhancedPrompt?: string;
}

// In-memory cache for image URLs (TTL: 1 hour)
const imageCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Enhanced prompt cache (prompts don't change frequently)
const promptCache = new Map<string, string>();

/**
 * Generate a cache key from prompt and options
 */
function getCacheKey(prompt: string, provider?: ImageProvider): string {
  return `${prompt.toLowerCase().trim().substring(0, 100)}:${provider ?? "auto"}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Get cached image if available and valid
 */
function getCachedImage(prompt: string, provider?: ImageProvider): CacheEntry | null {
  const key = getCacheKey(prompt, provider);
  const entry = imageCache.get(key);
  
  if (entry && isCacheValid(entry)) {
    return entry;
  }
  
  // Clean up expired entry
  if (entry) {
    imageCache.delete(key);
  }
  
  return null;
}

/**
 * Cache an image result
 */
function cacheImage(prompt: string, result: ImageResult): void {
  if (!result.success || !result.url || !result.provider) return;
  
  const key = getCacheKey(prompt, result.provider);
  imageCache.set(key, {
    url: result.url,
    provider: result.provider,
    timestamp: Date.now(),
    enhancedPrompt: result.enhancedPrompt,
  });
}

// ============================================================================
// SMART PROVIDER SELECTION
// ============================================================================

/**
 * Analyze prompt to determine best image category
 */
function analyzePromptCategory(prompt: string): ImageCategory {
  const lowerPrompt = prompt.toLowerCase();
  
  // Photo indicators (real-world subjects)
  const photoKeywords = [
    "photo", "photograph", "person", "people", "team", "office", 
    "building", "city", "nature", "landscape", "portrait", "meeting",
    "workplace", "professional", "business", "conference"
  ];
  
  // Abstract indicators
  const abstractKeywords = [
    "abstract", "concept", "idea", "pattern", "background", "texture",
    "gradient", "wave", "flow", "network", "connection", "digital"
  ];
  
  // Diagram indicators
  const diagramKeywords = [
    "diagram", "chart", "graph", "flowchart", "process", "workflow",
    "architecture", "structure", "schema", "infographic"
  ];
  
  // Scene indicators (complex illustrations)
  const sceneKeywords = [
    "scene", "illustration", "scenario", "environment", "setting",
    "futuristic", "fantasy", "artistic", "creative"
  ];
  
  // Count matches
  const counts = {
    photo: photoKeywords.filter(k => lowerPrompt.includes(k)).length,
    abstract: abstractKeywords.filter(k => lowerPrompt.includes(k)).length,
    diagram: diagramKeywords.filter(k => lowerPrompt.includes(k)).length,
    scene: sceneKeywords.filter(k => lowerPrompt.includes(k)).length,
  };
  
  // Find highest match
  const maxCategory = Object.entries(counts).reduce((a, b) => 
    b[1] > a[1] ? b : a
  );
  
  if (maxCategory[1] > 0) {
    return maxCategory[0] as ImageCategory;
  }
  
  // Default to photo for most presentation content
  return "photo";
}

/**
 * Select optimal provider based on category and quality
 */
function selectOptimalProvider(
  category: ImageCategory, 
  quality: "low" | "medium" | "high" = "medium"
): ImageProvider {
  const providerMatrix: Record<ImageCategory, Record<string, ImageProvider>> = {
    photo: {
      low: "unsplash",
      medium: "unsplash",
      high: "pexels",
    },
    abstract: {
      low: "pollinations",
      medium: "pollinations",
      high: "flux-schnell",
    },
    diagram: {
      low: "pollinations",
      medium: "flux-schnell",
      high: "flux-dev",
    },
    icon: {
      low: "unsplash",
      medium: "unsplash",
      high: "unsplash",
    },
    scene: {
      low: "pollinations",
      medium: "flux-schnell",
      high: "flux-pro",
    },
  };
  
  return providerMatrix[category]?.[quality] ?? "unsplash";
}

// ============================================================================
// GEMINI PROMPT ENHANCEMENT
// ============================================================================

/**
 * Use Gemini to enhance an image prompt for better results
 * Makes prompts more descriptive and visually specific
 * Uses caching to avoid redundant API calls
 */
export async function enhancePromptWithGemini(
  prompt: string, 
  category?: ImageCategory
): Promise<string> {
  // Check prompt cache first
  const cacheKey = prompt.toLowerCase().trim();
  const cachedPrompt = promptCache.get(cacheKey);
  if (cachedPrompt) {
    console.log("Using cached enhanced prompt");
    return cachedPrompt;
  }

  const apiKey = env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    console.log("Gemini API key not available, using original prompt");
    return prompt;
  }

  // Detect category if not provided
  const detectedCategory = category ?? analyzePromptCategory(prompt);

  // Category-specific enhancement instructions
  const categoryInstructions: Record<ImageCategory, string> = {
    photo: "Focus on realistic photography style, natural lighting, professional composition",
    abstract: "Focus on modern abstract design, vibrant gradients, clean geometric shapes",
    diagram: "Focus on clear visual hierarchy, professional technical illustration style",
    icon: "Focus on simple, clean iconographic style with solid colors",
    scene: "Focus on rich detailed illustration, atmospheric lighting, cinematic composition",
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert at writing image generation prompts. Enhance this prompt to create a more vivid, professional image suitable for a business presentation.

Original prompt: "${prompt}"
Image style: ${detectedCategory}
Style guidance: ${categoryInstructions[detectedCategory]}

Requirements:
- Keep it concise (max 40 words)
- Add specific visual details (lighting, colors, composition)
- Make it professional and polished
- Include mood/atmosphere
- Be specific about subject matter
- Avoid generic terms like "beautiful" or "nice"

Return ONLY the enhanced prompt, nothing else.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 80,
          }
        }),
        signal: AbortSignal.timeout(4000), // 4 second timeout (faster)
      }
    );

    if (!response.ok) {
      console.warn("Gemini API error:", response.status);
      return prompt;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const enhancedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (enhancedPrompt && enhancedPrompt.length > 10) {
      // Cache the enhanced prompt
      promptCache.set(cacheKey, enhancedPrompt);
      console.log(`Enhanced prompt (${detectedCategory}):`, enhancedPrompt);
      return enhancedPrompt;
    }
    
    return prompt;
  } catch (error) {
    console.warn("Gemini prompt enhancement failed:", error);
    return prompt;
  }
}

/**
 * Enhance multiple prompts in parallel (batch operation)
 */
export async function enhancePromptsParallel(
  prompts: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Filter out already cached prompts
  const uncachedPrompts = prompts.filter(p => {
    const cached = promptCache.get(p.toLowerCase().trim());
    if (cached) {
      results.set(p, cached);
      return false;
    }
    return true;
  });
  
  // Enhance uncached prompts in parallel (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < uncachedPrompts.length; i += batchSize) {
    const batch = uncachedPrompts.slice(i, i + batchSize);
    const enhanced = await Promise.all(
      batch.map(async (prompt) => ({
        original: prompt,
        enhanced: await enhancePromptWithGemini(prompt),
      }))
    );
    
    enhanced.forEach(({ original, enhanced }) => {
      results.set(original, enhanced);
    });
  }
  
  return results;
}

// ============================================================================
// IMAGE PROVIDERS
// ============================================================================

/**
 * Search Unsplash for high-quality stock photos
 */
async function searchUnsplash(query: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const keywords = extractKeywords(query);
  
  if (!accessKey) {
    // Fallback to Unsplash Source (no API key needed)
    return `https://source.unsplash.com/1024x768/?${encodeURIComponent(keywords)}`;
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as {
      results: Array<{
        urls: { regular: string; full: string };
      }>;
    };

    // Return a random result from top 3 for variety
    const results = data.results;
    if (results && results.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(3, results.length));
      return results[randomIndex]?.urls?.regular ?? results[0]?.urls?.regular ?? null;
    }

    return null;
  } catch (error) {
    console.warn("Unsplash search failed:", error);
    return null;
  }
}

/**
 * Search Pexels for high-quality stock photos
 */
async function searchPexels(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    const keywords = extractKeywords(query);
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(keywords)}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as {
      photos: Array<{
        src: { large: string; original: string };
      }>;
    };

    const photos = data.photos;
    if (photos && photos.length > 0) {
      const randomIndex = Math.floor(Math.random() * Math.min(3, photos.length));
      return photos[randomIndex]?.src?.large ?? photos[0]?.src?.large ?? null;
    }

    return null;
  } catch (error) {
    console.warn("Pexels search failed:", error);
    return null;
  }
}

/**
 * Generate image using Pollinations.ai (free, AI-generated)
 */
async function generateWithPollinations(prompt: string): Promise<string | null> {
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&seed=${seed}&nologo=true`;
  
  // Validate the URL works
  const isValid = await validateImageUrl(imageUrl);
  return isValid ? imageUrl : null;
}

/**
 * Generate image using Together AI FLUX models
 */
async function generateWithFlux(
  prompt: string,
  model: "schnell" | "pro" | "dev" = "schnell"
): Promise<string | null> {
  if (!env.TOGETHER_AI_API_KEY) {
    return null;
  }

  const modelMap = {
    schnell: "black-forest-labs/FLUX.1-schnell",
    pro: "black-forest-labs/FLUX.1-pro",
    dev: "black-forest-labs/FLUX.1-dev",
  };

  try {
    const together = new Together({ apiKey: env.TOGETHER_AI_API_KEY });
    
    const response = await together.images.create({
      model: modelMap[model],
      prompt: prompt,
      width: 1024,
      height: 768,
      steps: model === "schnell" ? 4 : 28,
      n: 1,
    }) as unknown as {
      data: Array<{ url?: string }>;
    };

    return response.data[0]?.url ?? null;
  } catch (error) {
    console.warn(`FLUX ${model} generation failed:`, error);
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract meaningful keywords from a prompt for stock photo search
 */
function extractKeywords(prompt: string): string {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'image', 'photo', 'picture', 'showing', 'depicting', 'illustration',
    'graphic', 'visual', 'style', 'like', 'professional', 'modern',
    'high', 'quality', 'detailed', 'beautiful', 'stunning',
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return words.slice(0, 5).join(' ');
}

/**
 * Validate that an image URL is accessible and returns a valid image
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') ?? false;
  } catch {
    // Some servers don't support HEAD, try GET with range
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-1023' },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Delay utility for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// MAIN IMAGE GENERATION FUNCTION
// ============================================================================

/**
 * Generate an image with intelligent fallbacks and prompt enhancement
 * 
 * Optimized Flow:
 * 1. Check cache for existing result
 * 2. Analyze prompt category for smart provider selection
 * 3. Optionally enhance prompt with Gemini (cached)
 * 4. Try optimal provider based on category
 * 5. If fails, cascade through fallback providers
 * 6. Validate final URL
 * 7. Cache result and return with metadata
 */
export async function generateImage(options: ImageGenerationOptions): Promise<ImageResult> {
  const {
    prompt,
    provider,
    enhancePrompt = true,
    fallbackEnabled = true,
    maxRetries = 2,
    category,
    quality = "medium",
    generationMode,
  } = options;

  // Step 0: Check cache first
  const cached = getCachedImage(prompt, provider);
  if (cached) {
    console.log(`Cache hit for: "${prompt.substring(0, 30)}..."`);
    return {
      success: true,
      url: cached.url,
      provider: cached.provider,
      originalPrompt: prompt,
      enhancedPrompt: cached.enhancedPrompt,
      fromCache: true,
    };
  }

  // QUICK MODE OPTIMIZATION: Skip Gemini enhancement and use Unsplash directly
  const isQuickMode = generationMode === "quick";
  
  // Step 1: Analyze prompt category for smart selection (skip in quick mode for speed)
  const detectedCategory = isQuickMode ? "photo" : (category ?? analyzePromptCategory(prompt));
  
  // Step 2: Select optimal provider if not specified
  // CRITICAL: Never use nano-banana for regular image generation
  // In quick mode, force Unsplash for speed (no Gemini API call needed)
  let selectedProvider: ImageProvider;
  if (isQuickMode) {
    selectedProvider = "unsplash"; // Direct to Unsplash in quick mode
    console.log(`[Quick Mode] Using Unsplash directly (skipping Gemini enhancement)`);
  } else {
    selectedProvider = provider ?? selectOptimalProvider(detectedCategory, quality);
  }
  
  // If somehow nano-banana was selected, force fallback to unsplash
  if (selectedProvider === "nano-banana") {
    console.warn("[Image Service] nano-banana detected in regular image generation - forcing fallback to unsplash");
    selectedProvider = "unsplash";
  }
  
  console.log(`Image generation: category=${detectedCategory}, provider=${selectedProvider}, mode=${generationMode ?? "default"}`);

  // Step 3: Enhance prompt with Gemini (SKIP in quick mode for speed)
  let finalPrompt = prompt;
  let enhancedPrompt: string | undefined;
  
  if (enhancePrompt && !isQuickMode) {
    // Only enhance in research mode or when explicitly requested (not quick mode)
    enhancedPrompt = await enhancePromptWithGemini(prompt, detectedCategory);
    finalPrompt = enhancedPrompt;
  } else if (isQuickMode) {
    console.log(`[Quick Mode] Skipping Gemini prompt enhancement for speed`);
  }

  // Step 4: Define fallback chain based on selected provider
  const fallbackChain = getFallbackChain(selectedProvider);
  
  // Step 5: Try each provider in chain
  for (let i = 0; i < fallbackChain.length; i++) {
    const currentProvider = fallbackChain[i];
    if (!currentProvider) continue;
    
    const isFallback = i > 0;
    
    // Retry logic for each provider
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const url = await tryProvider(currentProvider, finalPrompt);
        
        if (url) {
          // Validate the URL (skip for known-good providers on first attempt)
          const skipValidation = retry === 0 && 
            (currentProvider === "unsplash" || currentProvider === "pexels");
          
          const isValid = skipValidation || await validateImageUrl(url);
          
          if (isValid) {
            const result: ImageResult = {
              success: true,
              url,
              provider: currentProvider,
              originalPrompt: prompt,
              enhancedPrompt: enhancedPrompt !== prompt ? enhancedPrompt : undefined,
              fallbackUsed: isFallback,
              category: detectedCategory,
            };
            
            // Cache the successful result
            cacheImage(prompt, result);
            
            return result;
          }
        }
      } catch (error) {
        console.warn(`Provider ${currentProvider} attempt ${retry + 1} failed:`, error);
      }
      
      // Exponential backoff between retries (faster: 300ms base)
      if (retry < maxRetries - 1) {
        await delay(Math.pow(2, retry) * 300);
      }
    }
    
    // If fallbacks disabled, stop after primary
    if (!fallbackEnabled && i === 0) {
      break;
    }
  }

  // All providers failed - return a guaranteed fallback
  const guaranteedFallback = `https://source.unsplash.com/1024x768/?${encodeURIComponent(extractKeywords(prompt))}`;
  
  return {
    success: true, // Unsplash Source always works
    url: guaranteedFallback,
    provider: "unsplash",
    originalPrompt: prompt,
    enhancedPrompt,
    fallbackUsed: true,
  };
}

/**
 * Get fallback chain based on primary provider
 */
function getFallbackChain(primary: ImageProvider): ImageProvider[] {
  // CRITICAL: nano-banana should NEVER be in the fallback chain
  // It's ONLY for full slide generation, not regular images
  if (primary === "nano-banana") {
    console.error("[Image Service] ERROR: nano-banana should never be used for regular image generation!");
    return ["unsplash", "pexels", "pollinations"]; // Force fallback
  }
  
  const chains: Record<Exclude<ImageProvider, "nano-banana">, ImageProvider[]> = {
    "unsplash": ["unsplash", "pexels", "pollinations"],
    "pexels": ["pexels", "unsplash", "pollinations"],
    "pollinations": ["pollinations", "unsplash", "pexels"],
    "flux-schnell": ["flux-schnell", "pollinations", "unsplash"],
    "flux-pro": ["flux-pro", "flux-schnell", "pollinations", "unsplash"],
    "flux-dev": ["flux-dev", "flux-schnell", "pollinations", "unsplash"],
  };
  
  return chains[primary] ?? ["unsplash", "pollinations"];
}

/**
 * Try a specific provider
 */
async function tryProvider(provider: ImageProvider, prompt: string): Promise<string | null> {
  switch (provider) {
    case "unsplash":
      return searchUnsplash(prompt);
    case "pexels":
      return searchPexels(prompt);
    case "pollinations":
      return generateWithPollinations(prompt);
    case "flux-schnell":
      return generateWithFlux(prompt, "schnell");
    case "flux-pro":
      return generateWithFlux(prompt, "pro");
    case "flux-dev":
      return generateWithFlux(prompt, "dev");
    case "nano-banana":
      // nano-banana should NEVER be used for regular image generation
      // It's ONLY for full slide generation via generateFullSlideImage()
      // This should never be called - if it is, return null immediately
      console.error("ERROR: nano-banana should not be used for regular image generation. Use generateFullSlideImage() instead.");
      return null;
    default:
      return null;
  }
}

// ============================================================================
// BATCH IMAGE GENERATION (for parallel processing)
// ============================================================================

/**
 * Generate multiple images in parallel with rate limiting
 */
export async function generateImagesBatch(
  prompts: string[],
  options: Omit<ImageGenerationOptions, 'prompt'> = {}
): Promise<ImageResult[]> {
  const concurrency = 5; // Increased from 3 for better throughput
  const results: ImageResult[] = [];
  
  // Pre-enhance all prompts in parallel first (uses cache)
  console.log(`Batch generating ${prompts.length} images...`);
  const startTime = Date.now();
  
  // Separate cached vs uncached prompts
  const uncachedPrompts: string[] = [];
  const cachedResults: { index: number; result: ImageResult }[] = [];
  
  prompts.forEach((prompt, index) => {
    const cached = getCachedImage(prompt, options.provider);
    if (cached) {
      cachedResults.push({
        index,
        result: {
          success: true,
          url: cached.url,
          provider: cached.provider,
          originalPrompt: prompt,
          enhancedPrompt: cached.enhancedPrompt,
          fromCache: true,
        },
      });
    } else {
      uncachedPrompts.push(prompt);
    }
  });
  
  console.log(`Cache hits: ${cachedResults.length}/${prompts.length}`);
  
  // Generate uncached images in parallel batches
  const uncachedResults: ImageResult[] = [];
  for (let i = 0; i < uncachedPrompts.length; i += concurrency) {
    const batch = uncachedPrompts.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(prompt => generateImage({ ...options, prompt }))
    );
    uncachedResults.push(...batchResults);
    
    // Small delay between batches to avoid rate limits
    if (i + concurrency < uncachedPrompts.length) {
      await delay(150); // Reduced from 200ms
    }
  }
  
  // Merge results in original order
  let uncachedIndex = 0;
  for (let i = 0; i < prompts.length; i++) {
    const cachedResult = cachedResults.find(c => c.index === i);
    if (cachedResult) {
      results.push(cachedResult.result);
    } else {
      results.push(uncachedResults[uncachedIndex]!);
      uncachedIndex++;
    }
  }
  
  console.log(`Batch complete in ${Date.now() - startTime}ms`);
  return results;
}

// ============================================================================
// PRELOADING & PROGRESSIVE LOADING
// ============================================================================

/**
 * Preload images in the background (fire-and-forget)
 * Use this to start loading images before they're needed
 */
export function preloadImages(prompts: string[], options: Omit<ImageGenerationOptions, 'prompt'> = {}): void {
  // Run in background without blocking
  void (async () => {
    console.log(`Preloading ${prompts.length} images in background...`);
    for (const prompt of prompts) {
      // Skip if already cached
      if (getCachedImage(prompt, options.provider)) continue;
      
      try {
        await generateImage({ ...options, prompt, enhancePrompt: true });
      } catch (error) {
        console.warn(`Preload failed for: ${prompt.substring(0, 30)}...`, error);
      }
      
      // Small delay to not overwhelm the system
      await delay(500);
    }
  })();
}

/**
 * Get a quick placeholder URL while the real image generates
 * Returns a gradient or simple placeholder instantly
 */
export function getPlaceholderUrl(prompt: string): string {
  const category = analyzePromptCategory(prompt);
  
  // Generate a consistent color based on prompt hash
  const hash = prompt.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hue = Math.abs(hash) % 360;
  
  // Return as a data URL with SVG placeholder
  // Color varies by category and prompt hash for visual variety
  const saturation = category === 'photo' ? 30 : category === 'abstract' ? 70 : 40;
  const lightness1 = category === 'photo' ? 85 : category === 'scene' ? 70 : 80;
  const lightness2 = lightness1 - 10;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:hsl(${hue},${saturation}%,${lightness1}%)"/><stop offset="100%" style="stop-color:hsl(${hue},${saturation + 10}%,${lightness2}%)"/></linearGradient></defs><rect fill="url(#g)" width="100%" height="100%"/></svg>`;
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  imageCount: number;
  promptCount: number;
  oldestEntry: number | null;
} {
  let oldestTimestamp: number | null = null;
  
  imageCache.forEach((entry) => {
    if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
    }
  });
  
  return {
    imageCount: imageCache.size,
    promptCount: promptCache.size,
    oldestEntry: oldestTimestamp,
  };
}

/**
 * Clear all caches
 */
export function clearCaches(): void {
  imageCache.clear();
  promptCache.clear();
  console.log("Image caches cleared");
}

/**
 * Clear expired cache entries
 */
export function cleanupExpiredCache(): number {
  let cleaned = 0;
  const now = Date.now();
  
  imageCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_TTL) {
      imageCache.delete(key);
      cleaned++;
    }
  });
  
  return cleaned;
}

// ============================================================================
// PROVIDER MAPPING FOR LEGACY COMPATIBILITY
// ============================================================================

/**
 * Map old ImageModelList to new ImageProvider
 */
export function mapLegacyModel(model: string): ImageProvider {
  const mapping: Record<string, ImageProvider> = {
    "unsplash": "unsplash",
    "pollinations": "pollinations",
    "black-forest-labs/FLUX.1-schnell": "flux-schnell",
    "black-forest-labs/FLUX.1-schnell-Free": "flux-schnell",
    "black-forest-labs/FLUX.1-pro": "flux-pro",
    "black-forest-labs/FLUX1.1-pro": "flux-pro",
    "black-forest-labs/FLUX.1-dev": "flux-dev",
    "nano-banana": "nano-banana",
  };
  
  return mapping[model] ?? "unsplash";
}

// ============================================================================
// EXPORTS FOR EXTERNAL USE
// ============================================================================

export {
  analyzePromptCategory,
  selectOptimalProvider,
  extractKeywords,
};
