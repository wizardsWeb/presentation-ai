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
import { searchYouTubeVideo, type YouTubeVideoResult } from "@/lib/youtube/search";
import { 
  type TeachingStyle, 
  type AudienceType 
} from "@/states/presentation-state";
import { generateFullSlideImage } from "@/lib/image/nano-banana-service";

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
    | "youtube_search"     // NEW: YouTube search started
    | "youtube_found"      // NEW: YouTube video found
    | "generating"
    | "token"           // NEW: Token streaming event
    | "validating"
    | "refining"
    | "slide_complete"
    | "video_slide"        // NEW: Video slide generated
    | "agent_done"
    | "error";
  slideIndex?: number;
  totalSlides?: number;
  message?: string;
  data?: unknown;
  chunk?: string;       // NEW: For token streaming
  partial?: string;     // NEW: Accumulated content so far
  content?: string;     // NEW: Final content
  video?: YouTubeVideoResult; // NEW: YouTube video data
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
  enableYouTubeSearch: boolean;  // NEW: Enable YouTube video search
  maxRefinements: number;
  minValidationScore: number;
}

// Pedagogy configuration for personalized content
export interface PedagogyConfig {
  teachingStyle: TeachingStyle;
  audienceType: AudienceType;
}

const DEFAULT_CONFIG: AgentConfig = {
  enableResearch: true,
  enableValidation: false,
  enableYouTubeSearch: true,     // NEW: Enabled by default
  maxRefinements: 0,
  minValidationScore: 7,
};

const DEFAULT_PEDAGOGY: PedagogyConfig = {
  teachingStyle: "concept-first",
  audienceType: "professional",
};

// Section types for slide categorization
type SectionType = "introduction" | "content" | "example" | "activity" | "summary";

// Determine section type based on slide position and total
const getSectionType = (slideIndex: number, totalSlides: number): SectionType => {
  // First slide is always introduction
  if (slideIndex === 0) return "introduction";
  
  // Last slide is always summary
  if (slideIndex === totalSlides - 1) return "summary";
  
  // For presentations with more than 3 slides, second-to-last can also be summary
  if (totalSlides > 3 && slideIndex === totalSlides - 2) return "summary";
  
  // Content slides - use a mix of content, example, and activity
  const contentPosition = slideIndex % 4;
  if (contentPosition === 0 || contentPosition === 1) return "content";
  if (contentPosition === 2) return "example";
  return "activity";
};

// Get teaching style content instructions for agents
const getTeachingStyleContent = (style: TeachingStyle): string => {
  const styleMap: Record<TeachingStyle, string> = {
    "concept-first": "Structure: definition/concept → explanation → examples. Build from fundamentals.",
    "example-first": "Structure: real-world example → identify patterns → reveal concept.",
    "storytelling": "Use narrative elements: hook, challenge, journey, resolution.",
    "data-driven": "Lead with data/statistics, include analysis, support claims with evidence.",
  };
  return styleMap[style];
};

// Get audience-specific content adjustments for agents
const getAudienceContent = (audience: AudienceType): string => {
  const audienceMap: Record<AudienceType, string> = {
    "school": "Simple language, fun relatable examples, engaging visuals, no jargon.",
    "college": "Academic depth, theoretical frameworks, research references, critical analysis.",
    "training": "Practical skills focus, exercises, workplace scenarios, actionable takeaways.",
    "professional": "Concise, executive-friendly, strategic focus, business value, respect time.",
  };
  return audienceMap[audience];
};

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

TEACHING APPROACH: {TEACHING_STYLE}
AUDIENCE: {AUDIENCE_TYPE}

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

CHART - Data visualization (use when slide contains statistics/data):
<CHART charttype="vertical-bar">
  <TABLE>
    <TR><TD type="label"><VALUE>Category 1</VALUE></TD><TD type="data"><VALUE>45</VALUE></TD></TR>
    <TR><TD type="label"><VALUE>Category 2</VALUE></TD><TD type="data"><VALUE>72</VALUE></TD></TR>
    <TR><TD type="label"><VALUE>Category 3</VALUE></TD><TD type="data"><VALUE>89</VALUE></TD></TR>
  </TABLE>
</CHART>
Chart types: "vertical-bar", "horizontal-bar", "line", "pie", "area"
Use charts when slide topic contains statistics, comparisons, or data trends.

OUTPUT (only this, no explanations):
<SECTION layout="{SUGGESTED_LAYOUT}" section="{SECTION_TYPE}">
  <H1>Compelling Title</H1>
  [ONE component with 3-4 rich items]
  {CHART_HINT}
  <IMG query="professional photo: specific subject, mood, setting - 10 words"/>
</SECTION>`;

// Helper to determine if this slide should include a chart (approximately 1 in 10)
function shouldIncludeChart(slideIndex: number, totalSlides: number, topic: string): boolean {
  // Check if topic contains data-related keywords
  const dataKeywords = [
    "statistic", "data", "percentage", "growth", "trend", "comparison",
    "survey", "research", "analysis", "metric", "rate", "increase", "decrease",
    "market share", "revenue", "sales", "performance", "results", "outcome"
  ];
  
  const topicLower = topic.toLowerCase();
  const hasDataKeywords = dataKeywords.some(keyword => topicLower.includes(keyword));
  
  // Include chart if:
  // 1. Topic has data keywords AND (slide index is divisible by ~10 OR it's a middle slide)
  // 2. Approximately 1 in 10 slides should have charts
  const isDataSlide = hasDataKeywords;
  const isChartPosition = (slideIndex + 1) % 10 === 0 || 
                          (totalSlides > 5 && slideIndex === Math.floor(totalSlides / 2));
  
  return isDataSlide && (isChartPosition || Math.random() < 0.15); // 15% chance for data slides
}

// Fallback prompt without research - concise
const slidePromptBasic = `Expert presentation writer. Create ONE compelling slide.

CONTEXT:
- Topic: {SLIDE_TOPIC}
- Language: {LANGUAGE} | Tone: {TONE}  
- Slide {SLIDE_NUMBER}/{TOTAL_SLIDES} | Layout: {SUGGESTED_LAYOUT}

TEACHING APPROACH: {TEACHING_STYLE}
AUDIENCE: {AUDIENCE_TYPE}

RULES:
✓ Title: Punchy, specific (use numbers). Bad: "Overview" Good: "5 Key Trends"
✓ Content: Specific stats/examples, not vague claims
✓ Tailor content for specified audience and teaching approach
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

CHART: <CHART charttype="vertical-bar"><TABLE><TR><TD type="label"><VALUE>Label</VALUE></TD><TD type="data"><VALUE>45</VALUE></TD></TR>...</TABLE></CHART>
Use charts when topic contains statistics, data comparisons, or trends. Chart types: "vertical-bar", "horizontal-bar", "line", "pie", "area"

OUTPUT ONLY:
<SECTION layout="{SUGGESTED_LAYOUT}" section="{SECTION_TYPE}">
  <H1>Compelling Title</H1>
  [ONE component, 3-4 items]
  <IMG query="professional photo: subject, mood, setting - 10 words"/>
</SECTION>`;

const layouts = ["left", "right", "vertical"] as const;

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
 * Generate a full slide as an image using nano-banana
 */
async function generateFullSlideImageWithNanoBanana(
  topic: string,
  index: number,
  total: number,
  language: string,
  tone: string,
  prefetchedResearch: string | undefined,
  pedagogy: PedagogyConfig,
  onEvent?: (event: AgentEvent) => void
): Promise<SlideGenerationResult> {
  const emit = (event: AgentEvent) => {
    if (onEvent) {
      onEvent({ ...event, slideIndex: index, totalSlides: total });
    }
  };

  try {
    emit({ type: "generating", message: "Generating full slide image..." });

    // Generate the full slide image
    console.log(`[Nano Banana] Generating slide ${index + 1} for topic: ${topic}`);
    const result = await generateFullSlideImage({
      slideTopic: topic,
      slideNumber: index + 1,
      totalSlides: total,
      language,
      tone,
      teachingStyle: pedagogy.teachingStyle,
      audienceType: pedagogy.audienceType,
      researchContext: prefetchedResearch,
    });

    console.log(`[Nano Banana] Generation result:`, { success: result.success, hasUrl: !!result.url, error: result.error });

    if (!result.success || !result.url) {
      const errorMsg = result.error ?? "Failed to generate slide image";
      console.error(`[Nano Banana] Generation failed:`, errorMsg);
      emit({ type: "error", message: errorMsg });
      return {
        index,
        content: "",
        success: false,
        researchUsed: !!prefetchedResearch,
        refinementCount: 0,
      };
    }

    console.log(`[Nano Banana] Image generated successfully, URL: ${result.url}`);

    // Create XML structure for full slide image - NO TEXT, just the image
    const slideXml = `<SECTION layout="vertical" section="${getSectionType(index, total)}">
  <FULL_SLIDE_IMAGE url="${escapeXml(result.url)}" />
</SECTION>`;

    emit({
      type: "slide_complete",
      message: "Full slide image generated",
      content: slideXml,
      data: { isFullSlideImage: true },
    });

    return {
      index,
      content: slideXml,
      success: true,
      researchUsed: !!prefetchedResearch,
      validationScore: 10,
      refinementCount: 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Generation failed";
    emit({ type: "error", message: errorMessage });

    return {
      index,
      content: "",
      success: false,
      researchUsed: !!prefetchedResearch,
      refinementCount: 0,
    };
  }
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
  prefetchedResearch?: string, // Pre-fetched research context
  pedagogy: PedagogyConfig = DEFAULT_PEDAGOGY, // Pedagogy configuration
  imageModel?: string // For nano-banana full slide generation
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

    // Check if using nano-banana for full slide image generation
    if (imageModel === "nano-banana") {
      return await generateFullSlideImageWithNanoBanana(
        topic,
        index,
        total,
        language,
        tone,
        prefetchedResearch,
        pedagogy,
        onEvent
      );
    }

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

    // Determine if this slide should include a chart
    const includeChart = shouldIncludeChart(index, total, topic);
    const chartHint = includeChart 
      ? "\n\nIMPORTANT: This slide contains data/statistics. Include a CHART component with relevant data points extracted from the content. Use appropriate chart type (vertical-bar for comparisons, line for trends, pie for parts of whole)."
      : "";

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
        SECTION_TYPE: getSectionType(index, total),
        RESEARCH_CONTEXT: researchContext,
        TEACHING_STYLE: getTeachingStyleContent(pedagogy.teachingStyle),
        AUDIENCE_TYPE: getAudienceContent(pedagogy.audienceType),
        CHART_HINT: chartHint,
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
        SECTION_TYPE: getSectionType(index, total),
        RESEARCH_CONTEXT: researchContext,
        TEACHING_STYLE: getTeachingStyleContent(pedagogy.teachingStyle),
        AUDIENCE_TYPE: getAudienceContent(pedagogy.audienceType),
        CHART_HINT: chartHint,
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
 * 2. Search YouTube for a relevant video (in parallel with research)
 * 3. Then generate ALL slides in PARALLEL with streaming
 * 4. Insert video slide as slide #2
 * This gives maximum speed while still streaming tokens for each slide
 */
export async function generatePresentationWithAgent(
  outline: string[],
  language: string,
  tone: string,
  config: AgentConfig = DEFAULT_CONFIG,
  onEvent?: (event: AgentEvent) => void,
  pedagogy: PedagogyConfig = DEFAULT_PEDAGOGY,
  imageModel?: string // For nano-banana full slide generation
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

  // PHASE 1: Run research AND YouTube search in parallel
  const parallelTasks: Promise<unknown>[] = [];
  
  // Research task
  let researchResults = new Map<number, string>();
  if (config.enableResearch) {
    emit({ type: "researching", message: "Researching all topics..." });
    parallelTasks.push(
      batchResearchTopics(outline, (completed, total) => {
        emit({ 
          type: "research_complete", 
          message: `Research ${completed}/${total}`,
          data: { completed, total }
        });
      }).then(results => {
        researchResults = results;
        emit({ type: "research_complete", message: "Research complete" });
      })
    );
  }
  
  // YouTube search task - search based on presentation title (first topic)
  let youtubeVideo: YouTubeVideoResult | undefined;
  if (config.enableYouTubeSearch) {
    const presentationTopic = outline[0] ?? outline.join(" ");
    emit({ type: "youtube_search", message: "Finding relevant video..." });
    parallelTasks.push(
      searchYouTubeVideo(presentationTopic, language).then(result => {
        if (result.success && result.video) {
          youtubeVideo = result.video;
          emit({ 
            type: "youtube_found", 
            message: `Found: ${result.video.title}`,
            video: result.video
          });
        }
      }).catch(() => {
        // YouTube search failed, continue without video
      })
    );
  }
  
  // Wait for all parallel tasks to complete
  await Promise.all(parallelTasks);

  // PHASE 2: Generate ALL slides in PARALLEL with streaming
  emit({ type: "generating", message: "Creating slides..." });
  
  // Launch all slide generations in parallel
  const slidePromises = outline.map((topic, index) =>
    generateSlideWithAgent(
      topic ?? "",
      index,
      total,
      language,
      tone,
      { ...config, enableResearch: false, enableYouTubeSearch: false }, // Disable since we pre-fetched
      onEvent,
      preCalculatedLayouts.slice(0, index),
      researchResults.get(index), // Pass pre-fetched research
      pedagogy, // Pass pedagogy configuration
      imageModel // Pass imageModel for nano-banana support
    )
  );

  // Wait for all to complete
  const results = await Promise.all(slidePromises);

  // PHASE 3: If we found a YouTube video, emit the video slide event
  // This allows the client to inject the video slide at position 2
  if (youtubeVideo) {
    const videoSlideXml = generateVideoSlideXml(youtubeVideo, language);
    emit({
      type: "video_slide",
      message: "Video slide ready",
      content: videoSlideXml,
      video: youtubeVideo,
      slideIndex: 1, // Insert after first slide (index 1 = second position)
    });
  }

  const successCount = results.filter((r) => r.success).length;

  emit({
    type: "agent_done",
    message: `Done! ${successCount}/${total} slides`,
    totalSlides: total,
    data: { 
      successCount,
      hasVideo: !!youtubeVideo,
      video: youtubeVideo,
    },
  });

  return results;
}

/**
 * Generate XML for a video slide
 */
function generateVideoSlideXml(video: YouTubeVideoResult, language: string): string {
  // Generate appropriate text based on language
  const watchText = getLocalizedWatchText(language);
  
  return `<SECTION layout="vertical">
  <VIDEO videoId="${video.videoId}" title="${escapeXml(video.title)}" channel="${escapeXml(video.channelTitle)}" thumbnail="${video.thumbnail}" />
  <H2>${watchText}</H2>
  <P>${escapeXml(video.title)}</P>
</SECTION>`;
}

/**
 * Get localized "Watch" text
 */
function getLocalizedWatchText(language: string): string {
  const translations: Record<string, string> = {
    "en": "📺 Watch: Key Concepts Explained",
    "en-US": "📺 Watch: Key Concepts Explained",
    "hi": "📺 देखें: मुख्य अवधारणाएं",
    "es": "📺 Ver: Conceptos Clave",
    "fr": "📺 Regarder: Concepts Clés",
    "de": "📺 Ansehen: Wichtige Konzepte",
    "pt": "📺 Assistir: Conceitos Principais",
    "ja": "📺 視聴: 重要な概念",
    "ko": "📺 시청: 핵심 개념",
    "zh": "📺 观看：关键概念",
  };
  
  return translations[language] ?? translations.en ?? "📺 Watch: Key Concepts Explained";
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
