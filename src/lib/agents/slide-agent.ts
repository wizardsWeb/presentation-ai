"use server";

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  webSearch,
  formatSearchResultsForContext,
  quickValidate,
} from "./tools";

/**
 * Slide Generation Agent
 * 
 * Generates high-quality, engaging slides with web research.
 * Produces richer content than basic generation.
 * Supports real-time token streaming for instant visual feedback.
 */

// Types for agent state and events
export interface AgentEvent {
  type: 
    | "agent_start"
    | "slide_start"
    | "researching"
    | "research_complete"
    | "generating"
    | "token"           // NEW: Token streaming event
    | "validating"
    | "refining"
    | "slide_complete"
    | "agent_done"
    | "error";
  slideIndex?: number;
  totalSlides?: number;
  message?: string;
  data?: unknown;
  chunk?: string;       // NEW: For token streaming
  partial?: string;     // NEW: Accumulated content so far
  content?: string;     // NEW: Final content
}

export interface SlideGenerationResult {
  index: number;
  content: string;
  success: boolean;
  researchUsed: boolean;
  validationScore?: number;
  refinementCount: number;
}

export interface AgentConfig {
  enableResearch: boolean;
  enableValidation: boolean;
  maxRefinements: number;
  minValidationScore: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  enableResearch: true,
  enableValidation: false,
  maxRefinements: 0,
  minValidationScore: 7,
};

// LLM for content generation - optimized for maximum speed
const contentModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.75,
  maxTokens: 1000, // Minimal tokens for speed
  timeout: 20000, // 20 second timeout
});

// Research cache to avoid duplicate searches
const researchCache = new Map<string, string>();

// Extract core topic for caching (first 50 chars normalized)
function getCacheKey(topic: string): string {
  return topic.toLowerCase().trim().substring(0, 50);
}

// Optimized slide prompt with research - concise but effective
const slidePromptWithResearch = `You are an expert presentation writer. Create ONE compelling slide.

CONTEXT:
- Topic: {SLIDE_TOPIC}
- Language: {LANGUAGE} | Tone: {TONE}
- Slide {SLIDE_NUMBER}/{TOTAL_SLIDES} | Layout: {SUGGESTED_LAYOUT}

RESEARCH DATA (use these facts!):
{RESEARCH_CONTEXT}

WRITING RULES:
✓ TITLE: Punchy, specific, memorable (use numbers/power words)
  Good: "5 Forces Reshaping Healthcare" | Bad: "Healthcare Overview"
✓ CONTENT: Lead with impact, be specific with data
  Bad: "Many use this" → Good: "85% of Fortune 500 adopted by 2023"
✓ Each H3 needs 1-2 sentences with real stats/examples

COMPONENTS (pick ONE that fits best):

BULLETS - Key insights:
<BULLETS>
  <DIV><H3>Bold Title</H3><P>Rich detail with specific stats or examples.</P></DIV>
  [3-4 items]
</BULLETS>

ICONS - Features/benefits:
<ICONS>
  <DIV><ICON query="rocket"/><H3>Feature</H3><P>Compelling benefit with data.</P></DIV>
  [3-4 items]
</ICONS>

CYCLE - Processes (3-4 steps):
<CYCLE><DIV><H3>Step</H3><P>What happens.</P></DIV>...</CYCLE>

ARROWS - Transformation (2-3):
<ARROWS><DIV><H3>Before</H3><P>Old reality.</P></DIV><DIV><H3>After</H3><P>New paradigm.</P></DIV></ARROWS>

TIMELINE - History/phases:
<TIMELINE><DIV><H3>2020: Event</H3><P>What happened.</P></DIV>...</TIMELINE>

COLUMNS - Comparison (2-3):
<COLUMNS><DIV><H3>Option A</H3><P>Details.</P></DIV><DIV><H3>Option B</H3><P>Details.</P></DIV></COLUMNS>

PYRAMID - Hierarchy (3-4):
<PYRAMID><DIV><H3>Level</H3><P>Description.</P></DIV>...</PYRAMID>

STAIRCASE - Progression:
<STAIRCASE><DIV><H3>Stage</H3><P>Description.</P></DIV>...</STAIRCASE>

OUTPUT (only this, no explanations):
<SECTION layout="{SUGGESTED_LAYOUT}">
  <H1>Compelling Title</H1>
  [ONE component with 3-4 rich items]
  <IMG query="professional photo: specific subject, mood, setting - 10 words"/>
</SECTION>`;

// Fallback prompt without research - concise
const slidePromptBasic = `Expert presentation writer. Create ONE compelling slide.

CONTEXT:
- Topic: {SLIDE_TOPIC}
- Language: {LANGUAGE} | Tone: {TONE}  
- Slide {SLIDE_NUMBER}/{TOTAL_SLIDES} | Layout: {SUGGESTED_LAYOUT}

RULES:
✓ Title: Punchy, specific (use numbers). Bad: "Overview" Good: "5 Key Trends"
✓ Content: Specific stats/examples, not vague claims
✓ 3-4 items per component

COMPONENTS (pick best fit):
BULLETS: <BULLETS><DIV><H3>Title</H3><P>Rich detail.</P></DIV>...</BULLETS>
ICONS: <ICONS><DIV><ICON query="icon"/><H3>Title</H3><P>Detail.</P></DIV>...</ICONS>
CYCLE: <CYCLE><DIV><H3>Step</H3><P>Detail.</P></DIV>...</CYCLE>
ARROWS: <ARROWS><DIV><H3>Before</H3><P>...</P></DIV><DIV><H3>After</H3><P>...</P></DIV></ARROWS>
TIMELINE: <TIMELINE><DIV><H3>Date</H3><P>Event.</P></DIV>...</TIMELINE>
COLUMNS: <COLUMNS><DIV><H3>A</H3><P>...</P></DIV><DIV><H3>B</H3><P>...</P></DIV></COLUMNS>
PYRAMID: <PYRAMID><DIV><H3>Level</H3><P>...</P></DIV>...</PYRAMID>
STAIRCASE: <STAIRCASE><DIV><H3>Stage</H3><P>...</P></DIV>...</STAIRCASE>

OUTPUT ONLY:
<SECTION layout="{SUGGESTED_LAYOUT}">
  <H1>Compelling Title</H1>
  [ONE component, 3-4 items]
  <IMG query="professional photo: subject, mood, setting - 10 words"/>
</SECTION>`;

const layouts = ["left", "right", "vertical"] as const;

function getLayout(index: number): string {
  return layouts[index % layouts.length] ?? "left";
}

function suggestLayout(slideIndex: number, previousLayouts: string[]): string {
  const lastLayout = previousLayouts[previousLayouts.length - 1];
  const availableLayouts = layouts.filter((l) => l !== lastLayout);
  return availableLayouts[slideIndex % availableLayouts.length] ?? "left";
}

/**
 * Batch research all topics in parallel BEFORE generation
 * This is faster than researching during generation
 */
export async function batchResearchTopics(
  topics: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  
  // Run all research in parallel with a concurrency limit
  const BATCH_SIZE = 5; // Max concurrent research requests
  
  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (topic, batchIndex) => {
      const index = i + batchIndex;
      const cacheKey = getCacheKey(topic);
      
      // Check cache first
      if (researchCache.has(cacheKey)) {
        return { index, context: researchCache.get(cacheKey)! };
      }
      
      try {
        const searchResult = await webSearch(topic);
        if (searchResult.success && searchResult.results.length > 0) {
          const context = await formatSearchResultsForContext(searchResult.results);
          researchCache.set(cacheKey, context);
          return { index, context };
        }
      } catch {
        // Research failed, will use LLM knowledge
      }
      return { index, context: "" };
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ index, context }) => {
      results.set(index, context);
    });
    
    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, topics.length), topics.length);
    }
  }
  
  return results;
}

/**
 * Retry wrapper for API calls - optimized for speed
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 1, // Reduced retries for speed
  delay: number = 300 // Shorter delay
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Generate a single slide with the agent pipeline
 * Now accepts pre-fetched research for faster generation
 */
export async function generateSlideWithAgent(
  topic: string,
  index: number,
  total: number,
  language: string,
  tone: string,
  config: AgentConfig = DEFAULT_CONFIG,
  onEvent?: (event: AgentEvent) => void,
  previousLayouts: string[] = [],
  prefetchedResearch?: string // NEW: Pre-fetched research context
): Promise<SlideGenerationResult> {
  const emit = (event: AgentEvent) => {
    if (onEvent) {
      onEvent({ ...event, slideIndex: index, totalSlides: total });
    }
  };

  let researchContext = prefetchedResearch ?? "";
  let researchUsed = !!prefetchedResearch;
  const suggestedLayout = suggestLayout(index, previousLayouts);

  try {
    emit({ type: "slide_start", message: `Slide ${index + 1}` });

    // Step 1: Web Research - only if not pre-fetched and enabled
    if (config.enableResearch && !prefetchedResearch) {
      emit({ type: "researching", message: `Researching...` });

      try {
        // No retry for search - just use timeout in the search function itself
        const searchResult = await webSearch(topic);
        
        if (searchResult.success && searchResult.results.length > 0) {
          researchContext = await formatSearchResultsForContext(searchResult.results);
          researchUsed = true;
          emit({
            type: "research_complete",
            message: `Found ${searchResult.results.length} sources`,
            data: { resultCount: searchResult.results.length },
          });
        } else {
          emit({ type: "research_complete", message: "Using AI knowledge" });
        }
      } catch {
        // Research failed/timed out, continue without it - don't slow down
        emit({ type: "research_complete", message: "Skipped (timeout)" });
      }
    }

    // Step 2: Generate Content with real-time streaming
    emit({ type: "generating", message: "Creating content..." });

    const promptTemplate = researchUsed ? slidePromptWithResearch : slidePromptBasic;
    const prompt = PromptTemplate.fromTemplate(promptTemplate);
    
    // Use streaming model for real-time token output
    const streamingModel = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.75,
      maxTokens: 1000,
      streaming: true, // Enable streaming for real-time feedback
    });
    
    const chain = RunnableSequence.from([
      prompt,
      streamingModel,
      new StringOutputParser(),
    ]);

    let content = "";
    
    try {
      // Stream tokens and emit them for real-time UI updates
      const stream = await chain.stream({
        SLIDE_TOPIC: topic,
        LANGUAGE: language,
        TONE: tone,
        SLIDE_NUMBER: index + 1,
        TOTAL_SLIDES: total,
        PREVIOUS_LAYOUTS: previousLayouts.slice(-2).join(", ") || "none",
        SUGGESTED_LAYOUT: suggestedLayout,
        RESEARCH_CONTEXT: researchContext,
      });

      let tokenBuffer = "";
      const FLUSH_INTERVAL = 3; // Flush every N tokens
      let tokenCount = 0;

      for await (const chunk of stream) {
        content += chunk;
        tokenBuffer += chunk;
        tokenCount++;

        // Emit tokens in batches for smooth streaming
        if (tokenCount % FLUSH_INTERVAL === 0 || chunk.includes(">") || chunk.includes("\n")) {
          emit({
            type: "token",
            chunk: tokenBuffer,
            partial: content,
          });
          tokenBuffer = "";
        }
      }

      // Flush remaining tokens
      if (tokenBuffer) {
        emit({
          type: "token",
          chunk: tokenBuffer,
          partial: content,
        });
      }
    } catch (error) {
      // Retry once with invoke fallback
      content = await chain.invoke({
        SLIDE_TOPIC: topic,
        LANGUAGE: language,
        TONE: tone,
        SLIDE_NUMBER: index + 1,
        TOTAL_SLIDES: total,
        PREVIOUS_LAYOUTS: previousLayouts.slice(-2).join(", ") || "none",
        SUGGESTED_LAYOUT: suggestedLayout,
        RESEARCH_CONTEXT: researchContext,
      });
    }

    // Extract just the SECTION tag if there's extra content
    const sectionMatch = content.match(/<SECTION[\s\S]*?<\/SECTION>/i);
    if (sectionMatch) {
      content = sectionMatch[0];
    }

    // Quick structural validation
    const quickCheck = await quickValidate(content);
    if (!quickCheck.valid) {
      // Try to fix common issues
      if (!content.includes("<SECTION")) {
        content = `<SECTION layout="${suggestedLayout}">\n<H1>${topic}</H1>\n${content}\n</SECTION>`;
      }
      
      // Recheck
      const recheck = await quickValidate(content);
      if (!recheck.valid) {
        emit({ type: "error", message: `Invalid: ${recheck.reason}` });
        return {
          index,
          content: "",
          success: false,
          researchUsed,
          refinementCount: 0,
        };
      }
    }

    emit({
      type: "slide_complete",
      message: researchUsed ? "Ready (researched)" : "Ready",
      content, // Include final content in the event
      data: { researchUsed },
    });

    return {
      index,
      content,
      success: true,
      researchUsed,
      validationScore: 8,
      refinementCount: 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Generation failed";
    emit({ type: "error", message: errorMessage });

    return {
      index,
      content: "",
      success: false,
      researchUsed,
      refinementCount: 0,
    };
  }
}

/**
 * Generate all slides with the agent - PARALLEL STREAMING VERSION
 * 1. Batch all research in parallel FIRST (fast)
 * 2. Then generate ALL slides in PARALLEL with streaming
 * This gives maximum speed while still streaming tokens for each slide
 */
export async function generatePresentationWithAgent(
  outline: string[],
  language: string,
  tone: string,
  config: AgentConfig = DEFAULT_CONFIG,
  onEvent?: (event: AgentEvent) => void
): Promise<SlideGenerationResult[]> {
  const emit = (event: AgentEvent) => {
    if (onEvent) onEvent(event);
  };

  const total = outline.length;
  emit({ 
    type: "agent_start", 
    message: `Generating ${total} slides`,
    totalSlides: total,
  });

  // Pre-calculate layouts
  const preCalculatedLayouts: string[] = [];
  for (let i = 0; i < total; i++) {
    preCalculatedLayouts.push(suggestLayout(i, preCalculatedLayouts));
  }

  // PHASE 1: Batch research ALL topics in parallel (much faster!)
  let researchResults = new Map<number, string>();
  if (config.enableResearch) {
    emit({ type: "researching", message: "Researching all topics..." });
    researchResults = await batchResearchTopics(outline, (completed, total) => {
      emit({ 
        type: "research_complete", 
        message: `Research ${completed}/${total}`,
        data: { completed, total }
      });
    });
    emit({ type: "research_complete", message: "Research complete" });
  }

  // PHASE 2: Generate ALL slides in PARALLEL with streaming
  // Each slide streams its own tokens as it generates
  emit({ type: "generating", message: "Creating slides..." });
  
  // Launch all slide generations in parallel
  const slidePromises = outline.map((topic, index) =>
    generateSlideWithAgent(
      topic ?? "",
      index,
      total,
      language,
      tone,
      { ...config, enableResearch: false }, // Disable research since we pre-fetched
      onEvent,
      preCalculatedLayouts.slice(0, index),
      researchResults.get(index) // Pass pre-fetched research
    )
  );

  // Wait for all to complete
  const results = await Promise.all(slidePromises);

  const successCount = results.filter((r) => r.success).length;

  emit({
    type: "agent_done",
    message: `Done! ${successCount}/${total} slides`,
    totalSlides: total,
    data: { successCount },
  });

  return results;
}
