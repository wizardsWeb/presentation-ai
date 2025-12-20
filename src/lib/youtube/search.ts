/**
 * YouTube Video Search Utilities
 * 
 * Searches YouTube for relevant educational/explanatory videos
 * based on the presentation topic.
 */

import { env } from "@/env";

export interface YouTubeVideoResult {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt: string;
  duration?: string;
}

export interface YouTubeSearchResponse {
  success: boolean;
  video?: YouTubeVideoResult;
  error?: string;
}

/**
 * Search YouTube for a relevant video based on the presentation topic
 * Optimized for educational/explanatory content
 */
export async function searchYouTubeVideo(
  topic: string,
  language = "en"
): Promise<YouTubeSearchResponse> {
  if (!env.YOUTUBE_API_KEY) {
    return {
      success: false,
      error: "YouTube API key not configured",
    };
  }

  try {
    // Build search query optimized for educational content
    const searchQuery = buildEducationalQuery(topic, language);
    
    // Search for videos
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", searchQuery);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "3"); // Reduced for faster response
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("videoEmbeddable", "true");
    searchUrl.searchParams.set("safeSearch", "strict");
    searchUrl.searchParams.set("relevanceLanguage", getLanguageCode(language));
    searchUrl.searchParams.set("key", env.YOUTUBE_API_KEY);
    
    // Add video duration filter - prefer medium length (4-20 mins)
    searchUrl.searchParams.set("videoDuration", "medium");

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        "Accept": "application/json",
      },
      // Reduced timeout for faster failure recovery (5 seconds)
      signal: AbortSignal.timeout(5000),
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error("YouTube API error:", errorData);
      return {
        success: false,
        error: `YouTube API error: ${searchResponse.status}`,
      };
    }

    const searchData = await searchResponse.json() as YouTubeSearchAPIResponse;

    if (!searchData.items || searchData.items.length === 0) {
      return {
        success: false,
        error: "No videos found for the topic",
      };
    }

    // Get the best matching video (first result after filtering)
    const bestVideo = selectBestVideo(searchData.items, topic);
    
    if (!bestVideo) {
      return {
        success: false,
        error: "No suitable video found",
      };
    }

    return {
      success: true,
      video: {
        videoId: bestVideo.id.videoId,
        title: bestVideo.snippet.title,
        description: bestVideo.snippet.description,
        channelTitle: bestVideo.snippet.channelTitle,
        thumbnail: bestVideo.snippet.thumbnails.high?.url ?? 
                   bestVideo.snippet.thumbnails.medium?.url ??
                   bestVideo.snippet.thumbnails.default?.url ?? "",
        publishedAt: bestVideo.snippet.publishedAt,
      },
    };
  } catch (error) {
    console.error("YouTube search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build an optimized search query for educational content
 */
function buildEducationalQuery(topic: string, language: string): string {
  // Clean and extract key terms from the topic
  const cleanTopic = topic
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Add educational modifiers based on language
  const langCode = getLanguageCode(language);
  
  const educationalTerms: Record<string, string[]> = {
    en: ["explained", "tutorial", "introduction", "overview"],
    hi: ["समझाया", "ट्यूटोरियल", "परिचय"],
    es: ["explicado", "tutorial", "introducción"],
    fr: ["expliqué", "tutoriel", "introduction"],
    de: ["erklärt", "Tutorial", "Einführung"],
    pt: ["explicado", "tutorial", "introdução"],
    ja: ["解説", "チュートリアル", "入門"],
    ko: ["설명", "튜토리얼", "소개"],
    zh: ["讲解", "教程", "介绍"],
  };

  const modifiers = educationalTerms[langCode] ?? educationalTerms.en ?? ["explained"];
  
  // Use the first modifier for the search
  return `${cleanTopic} ${modifiers[0]}`;
}

/**
 * Select the best video from search results
 * Prioritizes: relevance, channel authority, recency
 */
function selectBestVideo(
  items: YouTubeSearchItem[],
  topic: string
): YouTubeSearchItem | null {
  if (items.length === 0) return null;
  
  // Score each video
  const scoredVideos = items.map((item) => {
    let score = 0;
    const title = item.snippet.title.toLowerCase();
    const topicWords = topic.toLowerCase().split(/\s+/);
    
    // Title relevance (more topic words in title = better)
    topicWords.forEach((word) => {
      if (word.length > 3 && title.includes(word)) {
        score += 10;
      }
    });
    
    // Prefer videos with clear educational intent
    const educationalKeywords = [
      "explained", "tutorial", "guide", "introduction", "learn",
      "course", "lesson", "basics", "fundamentals", "how to",
      "what is", "understanding", "overview", "complete"
    ];
    
    educationalKeywords.forEach((keyword) => {
      if (title.includes(keyword)) {
        score += 5;
      }
    });
    
    // Penalize clickbait patterns
    const clickbaitPatterns = [
      "you won't believe", "shocking", "insane", "crazy",
      "!!!!", "????", "🔥🔥", "😱"
    ];
    
    clickbaitPatterns.forEach((pattern) => {
      if (title.includes(pattern)) {
        score -= 15;
      }
    });
    
    return { item, score };
  });
  
  // Sort by score (highest first)
  scoredVideos.sort((a, b) => b.score - a.score);
  
  return scoredVideos[0]?.item ?? null;
}

/**
 * Convert language code to YouTube API format
 */
function getLanguageCode(language: string): string {
  // Handle full locale codes like "en-US"
  const baseCode = language.split("-")[0]?.toLowerCase() ?? "en";
  return baseCode;
}

// YouTube API Types
interface YouTubeSearchAPIResponse {
  items: YouTubeSearchItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

interface YouTubeSearchItem {
  id: {
    kind: string;
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    title: string;
    description: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
  };
}

/**
 * Generate YouTube embed URL (privacy-enhanced)
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Generate YouTube watch URL
 */
export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Generate thumbnail URL for a video
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: "default" | "medium" | "high" | "maxres" = "high"
): string {
  const qualityMap = {
    default: "default",
    medium: "mqdefault",
    high: "hqdefault",
    maxres: "maxresdefault",
  };
  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}
