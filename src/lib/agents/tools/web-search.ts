"use server";

/**
 * Web Search Tool using Tavily API with free fallbacks
 * Searches the web for current information to enrich slide content
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
}

/**
 * Extract key search terms from a topic
 */
function extractSearchQuery(topic: string): string {
  // Remove markdown formatting
  const cleaned = topic
    .replace(/^#+\s*/, "") // Remove heading markers
    .replace(/[-*]\s*/g, "") // Remove bullet points
    .replace(/\*\*/g, "") // Remove bold
    .trim();

  // Take first 100 chars for search
  return cleaned.substring(0, 100);
}

/**
 * Search using Tavily API (best for AI) - optimized for speed
 */
async function searchWithTavily(query: string): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return { success: false, results: [], error: "Tavily API key not configured" };
  }

  try {
    // Tight timeout for batch operations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 2, // Minimal results for speed
        include_answer: true, // The answer is the most useful part
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      results: Array<{
        title: string;
        content: string;
        url: string;
      }>;
      answer?: string;
    };

    const results: SearchResult[] = data.results.map((r) => ({
      title: r.title,
      snippet: r.content.substring(0, 300),
      url: r.url,
    }));

    // Add the answer as first result if available
    if (data.answer) {
      results.unshift({
        title: "Summary",
        snippet: data.answer,
        url: "",
      });
    }

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

/**
 * Main web search function - optimized for speed
 * Only uses Tavily (fastest) - skips fallbacks for speed
 */
export async function webSearch(topic: string): Promise<WebSearchResponse> {
  const query = extractSearchQuery(topic);

  // Only use Tavily - it's the fastest and most reliable
  if (process.env.TAVILY_API_KEY) {
    const result = await searchWithTavily(query);
    if (result.success) {
      return result;
    }
  }

  // Skip DuckDuckGo fallback for speed - just return empty
  // The LLM will use its knowledge instead

  // Return empty result (agent will use LLM knowledge)
  return {
    success: true,
    results: [],
  };
}

/**
 * Format search results for LLM context
 */
export async function formatSearchResultsForContext(results: SearchResult[]): Promise<string> {
  if (results.length === 0) {
    return "";
  }

  return results
    .slice(0, 4) // Limit to avoid token bloat
    .map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`)
    .join("\n\n");
}
