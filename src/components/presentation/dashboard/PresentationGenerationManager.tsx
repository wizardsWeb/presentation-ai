"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCompletion } from "@ai-sdk/react";
import { toast } from "sonner";
import { usePresentationState } from "@/states/presentation-state";
import { SlideParser, type PlateSlide } from "../utils/parser";
import { updatePresentation } from "@/app/_actions/presentation/presentationActions";
import { nanoid } from "nanoid";

// YouTube video search response type
interface YouTubeSearchResult {
  success: boolean;
  video?: {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
  };
}

export function PresentationGenerationManager() {
  const {
    shouldStartOutlineGeneration,
    shouldStartPresentationGeneration,
    setIsGeneratingOutline,
    setShouldStartOutlineGeneration,
    setShouldStartPresentationGeneration,
    resetGeneration,
    setOutline,
    setSlides,
    setIsGeneratingPresentation,
    setYoutubeVideo,
    setIsSearchingYouTube,
    generationMode,
    setExpectedSlideCount,
  } = usePresentationState();

  // Create a ref for the streaming parser to persist between renders
  const streamingParserRef = useRef<SlideParser>(new SlideParser());

  // Add refs to track the animation frame IDs
  const slidesRafIdRef = useRef<number | null>(null);
  const outlineRafIdRef = useRef<number | null>(null);

  // Track YouTube search state
  const youtubeVideoRef = useRef<YouTubeSearchResult["video"] | null>(null);
  const videoSlideInserted = useRef(false);
  const youtubeSearchInProgressRef = useRef(false); // Prevent duplicate searches
  const lastSearchTopicRef = useRef<string>(""); // Track last searched topic

  // Parallel generation refs
  const parallelAbortControllersRef = useRef<Map<number, AbortController>>(new Map());
  const parallelSlideParsersRef = useRef<Map<number, SlideParser>>(new Map());
  const isParallelGeneratingRef = useRef(false);

  // Create buffer refs to store the latest content
  // Note: The types should match what setOutline and setSlides expect
  const slidesBufferRef = useRef<ReturnType<
    SlideParser["getAllSlides"]
  > | null>(null);
  const outlineBufferRef = useRef<string[] | null>(null);

  // Create a YouTube video slide - defined first so it can be used by searchYouTubeVideo
  const createVideoSlide = useCallback((video: NonNullable<YouTubeSearchResult["video"]>): PlateSlide => {
    return {
      id: nanoid(),
      layoutType: "vertical",
      content: [
        {
          id: nanoid(),
          type: "h1",
          children: [{ text: "Video Overview" }],
        },
        {
          id: nanoid(),
          type: "p",
          children: [{ text: `Watch this video to learn more about the topic:` }],
        },
        {
          id: nanoid(),
          type: "youtube",
          videoId: video.videoId,
          title: video.title,
          channelTitle: video.channelTitle,
          thumbnail: video.thumbnail,
          children: [{ text: "" }],
        },
        {
          id: nanoid(),
          type: "p",
          children: [{ text: `Source: ${video.channelTitle}` }],
        },
      ],
    };
  }, []);

  // Search YouTube for a relevant video - runs completely independently
  // When video is found, it will be inserted into slides via a separate effect
  const searchYouTubeVideo = useCallback(async (topic: string, language: string) => {
    // Prevent duplicate searches for the same topic
    if (youtubeSearchInProgressRef.current) {
      console.log("YouTube search already in progress, skipping duplicate request");
      return youtubeVideoRef.current;
    }
    
    // Skip if we already searched for this exact topic and found a video
    if (lastSearchTopicRef.current === topic && youtubeVideoRef.current) {
      console.log("Using cached YouTube video for topic:", topic);
      return youtubeVideoRef.current;
    }
    
    youtubeSearchInProgressRef.current = true;
    lastSearchTopicRef.current = topic;
    
    try {
      setIsSearchingYouTube(true);
      const response = await fetch("/api/youtube/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language }),
      });
      
      if (!response.ok) {
        console.warn("YouTube search failed:", response.status);
        return null;
      }
      
      const result = await response.json() as YouTubeSearchResult;
      if (result.success && result.video) {
        youtubeVideoRef.current = result.video;
        setYoutubeVideo(result.video);
        console.log("Found YouTube video:", result.video.title);
        
        // Immediately insert video slide if we already have slides
        const currentSlides = usePresentationState.getState().slides;
        if (currentSlides.length >= 1 && !videoSlideInserted.current) {
          const videoSlide = createVideoSlide(result.video);
          videoSlideInserted.current = true;
          
          // Insert at position 1 (after the first/title slide)
          const newSlides = [...currentSlides];
          newSlides.splice(1, 0, videoSlide);
          setSlides(newSlides);
          console.log("Inserted YouTube video slide at position 2 (async)");
        }
        
        return result.video;
      }
      return null;
    } catch (error) {
      console.error("YouTube search error:", error);
      return null;
    } finally {
      setIsSearchingYouTube(false);
      youtubeSearchInProgressRef.current = false;
    }
  }, [setYoutubeVideo, setIsSearchingYouTube, createVideoSlide, setSlides]);

  // Insert video slide at position 2 (after title slide)
  const insertVideoSlideIfAvailable = useCallback((slides: PlateSlide[]): PlateSlide[] => {
    if (!youtubeVideoRef.current || videoSlideInserted.current || slides.length < 1) {
      return slides;
    }
    
    const videoSlide = createVideoSlide(youtubeVideoRef.current);
    videoSlideInserted.current = true;
    
    // Insert at position 1 (after the first/title slide)
    const newSlides = [...slides];
    newSlides.splice(1, 0, videoSlide);
    
    console.log("Inserted YouTube video slide at position 2");
    return newSlides;
  }, [createVideoSlide]);

  // Function to update slides using requestAnimationFrame
  const updateSlidesWithRAF = (): void => {
    // Always check for the latest slides in the buffer
    if (slidesBufferRef.current !== null) {
      setSlides(slidesBufferRef.current);
      slidesBufferRef.current = null;
    }

    // Clear the current frame ID
    slidesRafIdRef.current = null;

    // We don't recursively schedule new frames
    // New frames will be scheduled only when new content arrives
  };

  // Function to update outline using requestAnimationFrame
  const updateOutlineWithRAF = (): void => {
    // Always check for the latest outline in the buffer
    if (outlineBufferRef.current !== null) {
      const items = outlineBufferRef.current;
      // Only update if we have items to show
      if (items.length > 0) {
        setOutline(items);
        console.log(`Updated outline with ${items.length} items`);
      }
    }

    // Clear the current frame ID
    outlineRafIdRef.current = null;

    // We don't recursively schedule new frames
    // New frames will be scheduled only when new content arrives
  };

  // Outline generation
  const { completion: outlineCompletion, complete: generateOutline } =
    useCompletion({
      api: "/api/presentation/outline",
      onFinish: () => {
        setIsGeneratingOutline(false);
        setShouldStartOutlineGeneration(false);
        setShouldStartPresentationGeneration(false);
        outlineGenerationInProgressRef.current = false;

        const {
          currentPresentationId,
          outline,
          currentPresentationTitle,
          theme,
        } = usePresentationState.getState();

        if (currentPresentationId) {
          void updatePresentation({
            id: currentPresentationId,
            outline,
            title: currentPresentationTitle ?? "",
            theme,
          });
        }

        // Cancel any pending outline animation frame
        if (outlineRafIdRef.current !== null) {
          cancelAnimationFrame(outlineRafIdRef.current);
          outlineRafIdRef.current = null;
        }
      },
      onError: (error) => {
        toast.error("Failed to generate outline: " + error.message);
        resetGeneration();
        outlineGenerationInProgressRef.current = false;

        // Cancel any pending outline animation frame
        if (outlineRafIdRef.current !== null) {
          cancelAnimationFrame(outlineRafIdRef.current);
          outlineRafIdRef.current = null;
        }
      },
    });

  useEffect(() => {
    if (outlineCompletion && typeof outlineCompletion === "string") {
      // Parse the outline into sections, handling partial/streaming content
      const text = outlineCompletion;
      
      if (!text || text.trim().length === 0) {
        return;
      }

      // Split by newline followed by # (heading marker) or [section_type] marker
      // This handles both complete and partial sections
      const lines = text.split("\n");
      const outlineItems: string[] = [];
      let currentSection: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check for section marker format: [type] # Heading or just # Heading
        const sectionMatch = trimmedLine.match(/^\[(introduction|content|example|activity|summary)\]\s*#\s*/);
        const isHeading = trimmedLine.startsWith("# ") || sectionMatch;
        
        if (isHeading) {
          // Save previous section if it exists
          if (currentSection.length > 0) {
            outlineItems.push(currentSection.join("\n").trim());
          }
          // Start new section - keep the full line including section marker
          currentSection = [trimmedLine];
        } else if (currentSection.length > 0) {
          // Continue current section
          currentSection.push(line);
        } else if (trimmedLine.length > 0) {
          // If we have content but no section started yet, create one
          currentSection = [`# ${trimmedLine}`];
        }
      }

      // Add the last section if it exists
      if (currentSection.length > 0) {
        outlineItems.push(currentSection.join("\n").trim());
      }

      // If we still have no items but have text, create a single item
      if (outlineItems.length === 0 && text.trim().length > 0) {
        outlineItems.push(text.trim().startsWith("#") ? text.trim() : `# ${text.trim()}`);
      }

      // Store the latest outline in the buffer
      outlineBufferRef.current = outlineItems;

      // Always schedule an update when new content arrives
      // Cancel any pending frame and schedule a new one to ensure latest content is shown
      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
      }
      outlineRafIdRef.current = requestAnimationFrame(updateOutlineWithRAF);
    }
  }, [outlineCompletion]);

  // Track if outline generation is currently in progress
  const outlineGenerationInProgressRef = useRef(false);
  // Store the latest generateOutline function in a ref to avoid dependency issues
  const generateOutlineRef = useRef(generateOutline);
  
  // Update the ref whenever generateOutline changes
  useEffect(() => {
    generateOutlineRef.current = generateOutline;
  }, [generateOutline]);

  // Watch for outline generation start
  useEffect(() => {
    const startOutlineGeneration = async (): Promise<void> => {
      const { presentationInput, numSlides, language, teachingStyle, audienceType } =
        usePresentationState.getState();
      
      // Guard against multiple simultaneous generations
      if (!shouldStartOutlineGeneration || outlineGenerationInProgressRef.current) {
        return;
      }

      // Mark generation as in progress
      outlineGenerationInProgressRef.current = true;

      // Reset YouTube state and start searching EARLY (during outline generation)
      // This gives the YouTube search a head start while the user reviews the outline
      // BUT: Skip YouTube search in quick mode
      youtubeVideoRef.current = null;
      videoSlideInserted.current = false;
      youtubeSearchInProgressRef.current = false; // Reset search in progress flag
      lastSearchTopicRef.current = ""; // Reset last searched topic
      setYoutubeVideo(null);
      
      // Only search YouTube in research mode, not in quick mode
      if (generationMode === "research") {
        const searchTopic = presentationInput ?? "";
        if (searchTopic) {
          console.log("Starting YouTube search early (during outline generation)");
          void searchYouTubeVideo(searchTopic, language);
        }
      } else {
        console.log("Skipping YouTube search in quick mode");
      }

      try {
        console.log("Starting outline generation", {
          prompt: presentationInput,
          numberOfCards: numSlides,
          language,
          teachingStyle,
          audienceType,
        });
        setIsGeneratingOutline(true);

        // Start the RAF cycle for outline updates
        if (outlineRafIdRef.current === null) {
          outlineRafIdRef.current =
            requestAnimationFrame(updateOutlineWithRAF);
        }

        // Use the ref to get the latest generateOutline function
        await generateOutlineRef.current("", {
          body: {
            prompt: presentationInput ?? "",
            numberOfCards: numSlides,
            language,
            teachingStyle,
            audienceType,
          },
        });
      } catch (error) {
        console.error("Outline generation error:", error);
        // Error is handled by onError callback
      } finally {
        setIsGeneratingOutline(false);
        setShouldStartOutlineGeneration(false);
        outlineGenerationInProgressRef.current = false;
      }
    };

    void startOutlineGeneration();
  }, [shouldStartOutlineGeneration, setIsGeneratingOutline, setShouldStartOutlineGeneration, searchYouTubeVideo, setYoutubeVideo]);

  // ============================================
  // PARALLEL SLIDE GENERATION (Quick Mode)
  // ============================================
  
  // Generate a single slide with streaming
  const generateSingleSlideParallel = useCallback(async (
    slideIndex: number,
    outlineItem: string,
    title: string,
    language: string,
    tone: string,
    totalSlides: number,
    previousLayouts: string[],
    teachingStyle: string,
    audienceType: string,
    _slidesArray: PlateSlide[],
  ): Promise<PlateSlide | null> => {
    const abortController = new AbortController();
    parallelAbortControllersRef.current.set(slideIndex, abortController);
    
    // Initialize parser for this slide
    const parser = new SlideParser();
    parallelSlideParsersRef.current.set(slideIndex, parser);

    // Get imageModel from state
    const { imageModel } = usePresentationState.getState();

    try {
      const response = await fetch("/api/presentation/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex,
          totalSlides,
          outlineItem,
          title,
          language,
          tone,
          previousLayouts,
          teachingStyle,
          audienceType,
          imageModel, // Pass imageModel to skip text generation for nano-banana
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to generate slide ${slideIndex + 1}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Parse the AI SDK stream format
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              // Extract the text content from the stream format
              const jsonStr = line.slice(2);
              const text = JSON.parse(jsonStr) as string;
              accumulatedContent += text;
              
              // Try to parse partial slide for live preview
              try {
                parser.reset();
                parser.parseChunk(accumulatedContent);
                const slides = parser.getAllSlides();
                if (slides.length > 0 && slides[0]) {
                  const slide = { ...slides[0], isGenerating: true };
                  // Update this specific slide - get fresh state to avoid stale data
                  const currentSlides = usePresentationState.getState().slides;
                  if (currentSlides.length > slideIndex) {
                    const updatedSlides = [...currentSlides];
                    updatedSlides[slideIndex] = slide;
                    setSlides(updatedSlides);
                  }
                }
              } catch {
                // Ignore parsing errors during streaming
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }

      // Final parse
      parser.reset();
      
      // Wrap in PRESENTATION tag if not already wrapped (required by parser)
      const wrappedContent = accumulatedContent.trim().startsWith("<PRESENTATION>")
        ? accumulatedContent
        : `<PRESENTATION>${accumulatedContent}</PRESENTATION>`;
      
      console.log(`[Slide ${slideIndex + 1}] Parsing content:`, wrappedContent.substring(0, 200));
      
      parser.parseChunk(wrappedContent);
      parser.finalize();
      const slides = parser.getAllSlides();
      
      console.log(`[Slide ${slideIndex + 1}] Parsed ${slides.length} slide(s)`);
      
      if (slides.length > 0 && slides[0]) {
        const finalSlide = { ...slides[0], isGenerating: false };
        console.log(`[Slide ${slideIndex + 1}] Final slide parsed successfully`);
        console.log(`[Slide ${slideIndex + 1}] Slide content length:`, finalSlide.content?.length ?? 0);
        console.log(`[Slide ${slideIndex + 1}] Slide content preview:`, JSON.stringify(finalSlide.content?.slice(0, 3), null, 2));
        
        // Verify the slide has content
        if (!finalSlide.content || finalSlide.content.length === 0) {
          console.error(`[Slide ${slideIndex + 1}] WARNING: Slide has no content!`);
          console.error(`[Slide ${slideIndex + 1}] Original XML:`, accumulatedContent);
        }
        
        return finalSlide;
      }
      
      console.error(`[Slide ${slideIndex + 1}] No slide parsed. Content was:`, accumulatedContent);
      throw new Error("No slide parsed from response");
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return null;
      }
      
      console.error(`Error generating slide ${slideIndex}:`, error);
      
      // Create a placeholder slide on error
      const placeholderSlide: PlateSlide = {
        id: nanoid(),
        layoutType: "vertical",
        isGenerating: false,
        content: [
          {
            id: nanoid(),
            type: "h2",
            children: [{ text: `Slide ${slideIndex + 1}` }],
          },
          {
            id: nanoid(),
            type: "p",
            children: [{ text: "Content generation failed. Please try regenerating." }],
          },
        ],
      };
      
      return placeholderSlide;
    } finally {
      parallelAbortControllersRef.current.delete(slideIndex);
      parallelSlideParsersRef.current.delete(slideIndex);
    }
  }, [setSlides]);

  // Generate all slides in parallel with concurrency limit
  const generateSlidesParallel = useCallback(async (
    outline: string[],
    title: string,
    language: string,
    tone: string,
    teachingStyle: string,
    audienceType: string,
  ) => {
    isParallelGeneratingRef.current = true;
    
    // Set expected slide count IMMEDIATELY for UI feedback
    setExpectedSlideCount(outline.length);
    
    // Get imageModel from state to determine placeholder type
    const { imageModel } = usePresentationState.getState();
    const isNanoBanana = imageModel === "nano-banana";
    
    // Initialize placeholder slides for IMMEDIATE UI feedback
    const placeholderSlides: PlateSlide[] = outline.map((item, index) => {
      // For nano-banana: NO TEXT placeholders, just image placeholder
      if (isNanoBanana) {
        return {
          id: nanoid(),
          layoutType: "vertical" as const,
          isGenerating: true,
          content: [
            {
              id: nanoid(),
              type: "full-slide-image" as const,
              url: "generating...",
              children: [{ text: "" }],
            } as const,
          ],
        };
      }
      
      // For regular slides: show text placeholders
      // Extract title from outline item (handles [section] # Title format)
      const titleMatch = item.match(/(?:\[[\w-]+\]\s*)?#\s*(.+?)(?:\n|$)/);
      const slideTitle = titleMatch?.[1]?.trim() ?? `Slide ${index + 1}`;
      
      // Extract bullet points from outline for preview
      const bulletMatches = item.match(/^[-•]\s*(.+)$/gm);
      const bulletPoints = bulletMatches ? bulletMatches.slice(0, 2).map(b => b.replace(/^[-•]\s*/, '')) : [];
      
      const content: PlateSlide["content"] = [
        {
          id: nanoid(),
          type: "h1" as const,
          children: [{ text: slideTitle }],
        },
        {
          id: nanoid(),
          type: "p" as const,
          children: [{ text: bulletPoints[0] ?? "Generating content...", generating: true }],
        },
      ];
      
      // Add second bullet point if available
      if (bulletPoints[1]) {
        content.push({
          id: nanoid(),
          type: "p" as const,
          children: [{ text: bulletPoints[1], generating: true }],
        });
      }
      
      return {
        id: nanoid(),
        layoutType: "vertical" as const,
        isGenerating: true,
        content,
      };
    });
    
    // Show placeholders IMMEDIATELY - don't wait for any API call
    setSlides(placeholderSlides);
    
    // Use a mutable ref to track slides array for real-time updates
    const slidesArrayRef = { current: [...placeholderSlides] };
    
    // Start ALL slides immediately for maximum perceived speed
    // Browser will handle connection pooling (typically 6 concurrent connections)
    const slidePromises = outline.map(async (outlineItem, index) => {
      if (!outlineItem) return null;
      
      console.log(`Starting generation for slide ${index + 1}/${outline.length}`);
      
      const slide = await generateSingleSlideParallel(
        index,
        outlineItem,
        title,
        language,
        tone,
        outline.length,
        [], // Don't wait for previous layouts - let each slide be independent
        teachingStyle,
        audienceType,
        slidesArrayRef.current,
      );
      
      if (slide) {
        slidesArrayRef.current[index] = slide;
        setSlides([...slidesArrayRef.current]);
      }
      
      return slide;
    });
    
    // Wait for all slides to complete
    await Promise.all(slidePromises);
    
    // Return final slides (filter out any nulls)
    const finalSlides = slidesArrayRef.current.filter((s): s is PlateSlide => s !== null && !s.isGenerating);
    isParallelGeneratingRef.current = false;
    
    return finalSlides;
  }, [generateSingleSlideParallel, setSlides, setExpectedSlideCount]);

  // Cancel parallel generation
  const cancelParallelGeneration = useCallback(() => {
    isParallelGeneratingRef.current = false;
    parallelAbortControllersRef.current.forEach(controller => controller.abort());
    parallelAbortControllersRef.current.clear();
    parallelSlideParsersRef.current.clear();
  }, []);

  // ============================================
  // SEQUENTIAL SLIDE GENERATION (Original)
  // ============================================

  const { completion: presentationCompletion, complete: generatePresentation } =
    useCompletion({
      api: "/api/presentation/generate",
      onFinish: (_prompt, _completion) => {
        const { currentPresentationId, currentPresentationTitle, theme, youtubeVideo, slides: currentSlides } =
          usePresentationState.getState();
        const parser = streamingParserRef.current;
        parser.reset();
        parser.parseChunk(_completion);
        parser.finalize();
        parser.clearAllGeneratingMarks();
        let slides = parser.getAllSlides();
        
        // If video was already inserted asynchronously, use current slides 
        // but update the non-video slides with final parsed content
        if (videoSlideInserted.current && currentSlides.length > 0) {
          // Find video slide in current slides (it's at position 1)
          const videoSlide = currentSlides.find(s => 
            s.content?.some((c: { type?: string }) => c.type === "youtube")
          );
          
          if (videoSlide) {
            // Insert video slide at position 1 in the final slides
            slides.splice(1, 0, videoSlide);
          }
        } else if (youtubeVideo && !videoSlideInserted.current && slides.length >= 1) {
          // Insert YouTube video slide at position 2 if not already done
          slides = insertVideoSlideIfAvailable(slides);
        }
        
        slidesBufferRef.current = slides;

        requestAnimationFrame(updateSlidesWithRAF);

        if (currentPresentationId) {
          void updatePresentation({
            id: currentPresentationId,
            content: { slides: slides },
            title: currentPresentationTitle ?? "",
            theme,
            youtubeVideoId: youtubeVideo?.videoId,
            youtubeVideoTitle: youtubeVideo?.title,
            youtubeVideoChannel: youtubeVideo?.channelTitle,
          });
        }

        setIsGeneratingPresentation(false);
        setShouldStartPresentationGeneration(false);
        // Cancel any pending animation frame
        if (slidesRafIdRef.current !== null) {
          cancelAnimationFrame(slidesRafIdRef.current);
          slidesRafIdRef.current = null;
        }
      },
      onError: (error) => {
        toast.error("Failed to generate presentation: " + error.message);
        resetGeneration();
        streamingParserRef.current.reset();

        // Cancel any pending animation frame
        if (slidesRafIdRef.current !== null) {
          cancelAnimationFrame(slidesRafIdRef.current);
          slidesRafIdRef.current = null;
        }
      },
    });

  useEffect(() => {
    if (presentationCompletion) {
      try {
        streamingParserRef.current.reset();
        streamingParserRef.current.parseChunk(presentationCompletion);
        streamingParserRef.current.finalize();
        const allSlides = streamingParserRef.current.getAllSlides();

        // Store the latest slides in the buffer
        slidesBufferRef.current = allSlides;

        // Only schedule a new frame if one isn't already pending
        if (slidesRafIdRef.current === null) {
          slidesRafIdRef.current = requestAnimationFrame(updateSlidesWithRAF);
        }
      } catch (error) {
        console.error("Error processing presentation XML:", error);
        toast.error("Error processing presentation content");
      }
    }
  }, [presentationCompletion]);

  useEffect(() => {
    if (shouldStartPresentationGeneration) {
      const {
        outline,
        presentationInput,
        language,
        presentationStyle,
        currentPresentationTitle,
        teachingStyle,
        audienceType,
        currentPresentationId,
        theme,
        generationMode: currentGenerationMode,
      } = usePresentationState.getState();
      
      // Type guard to ensure currentGenerationMode is valid
      const isResearchMode = currentGenerationMode === "research";

      // Reset the parser before starting a new generation
      streamingParserRef.current.reset();
      
      // Only reset video insertion flag, NOT the video itself
      // The YouTube search may have already completed during outline generation
      videoSlideInserted.current = false;

      setIsGeneratingPresentation(true);

      // Only start YouTube search if we don't already have a video from outline generation
      // This prevents duplicate searches and makes generation faster
      // BUT: Skip YouTube search entirely in quick mode
      if (isResearchMode) {
        if (!youtubeVideoRef.current) {
          const searchTopic = presentationInput ?? currentPresentationTitle ?? "";
          if (searchTopic) {
            console.log("Starting YouTube search (no video from outline phase)");
            void searchYouTubeVideo(searchTopic, language);
          }
        } else {
          console.log("Using YouTube video found during outline generation:", youtubeVideoRef.current.title);
        }
      } else {
        console.log("Skipping YouTube search in quick mode");
      }

      // Use parallel generation for "quick" mode, sequential for "research"
      if (currentGenerationMode === "quick") {
        console.log("Using PARALLEL slide generation (quick mode)");
        
        // Parallel generation - each slide generates independently
        void (async () => {
          try {
            const slides = await generateSlidesParallel(
              outline,
              presentationInput ?? currentPresentationTitle ?? "",
              language,
              presentationStyle,
              teachingStyle ?? "concept-first",
              audienceType ?? "professional",
            );

            // Insert YouTube video slide if available (only in research mode)
            let finalSlides = slides;
            const state = usePresentationState.getState();
            const youtubeVideo = state.youtubeVideo;
            if (isResearchMode && youtubeVideo && !videoSlideInserted.current && slides.length >= 1) {
              finalSlides = insertVideoSlideIfAvailable(slides);
            }

            setSlides(finalSlides);

            // Save to database
            if (currentPresentationId) {
              void updatePresentation({
                id: currentPresentationId,
                content: { slides: finalSlides },
                title: currentPresentationTitle ?? "",
                theme,
                youtubeVideoId: youtubeVideo?.videoId,
                youtubeVideoTitle: youtubeVideo?.title,
                youtubeVideoChannel: youtubeVideo?.channelTitle,
              });
            }

            toast.success("Presentation generated!");
          } catch (error) {
            console.error("Parallel generation error:", error);
            toast.error("Failed to generate presentation");
          } finally {
            setIsGeneratingPresentation(false);
            setShouldStartPresentationGeneration(false);
          }
        })();
      } else {
        console.log("Using SEQUENTIAL slide generation (research mode)");
        
        // Sequential generation - all slides in one stream (original behavior)
        // Start the RAF cycle for slide updates
        if (slidesRafIdRef.current === null) {
          slidesRafIdRef.current = requestAnimationFrame(updateSlidesWithRAF);
        }

        void generatePresentation(presentationInput ?? "", {
          body: {
            title: presentationInput ?? currentPresentationTitle ?? "",
            outline,
            language,
            tone: presentationStyle,
            teachingStyle,
            audienceType,
          },
        });
      }
    }
  }, [shouldStartPresentationGeneration, searchYouTubeVideo, setYoutubeVideo, generateSlidesParallel, insertVideoSlideIfAvailable, setSlides, setIsGeneratingPresentation, setShouldStartPresentationGeneration]);

  // Clean up RAF and parallel generation on unmount
  useEffect(() => {
    return () => {
      if (slidesRafIdRef.current !== null) {
        cancelAnimationFrame(slidesRafIdRef.current);
        slidesRafIdRef.current = null;
      }

      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
        outlineRafIdRef.current = null;
      }

      // Cancel any ongoing parallel generation
      cancelParallelGeneration();
    };
  }, [cancelParallelGeneration]);

  return null;
}
