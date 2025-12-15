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
  } = usePresentationState();

  // Create a ref for the streaming parser to persist between renders
  const streamingParserRef = useRef<SlideParser>(new SlideParser());

  // Add refs to track the animation frame IDs
  const slidesRafIdRef = useRef<number | null>(null);
  const outlineRafIdRef = useRef<number | null>(null);

  // Track YouTube search state
  const youtubeVideoRef = useRef<YouTubeSearchResult["video"] | null>(null);
  const videoSlideInserted = useRef(false);

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

      // Split by newline followed by # (heading marker)
      // This handles both complete and partial sections
      const lines = text.split("\n");
      const outlineItems: string[] = [];
      let currentSection: string[] = [];

      for (const line of lines) {
        // If line starts with #, it's a new section
        if (line.trim().startsWith("# ")) {
          // Save previous section if it exists
          if (currentSection.length > 0) {
            outlineItems.push(currentSection.join("\n").trim());
          }
          // Start new section
          currentSection = [line.trim()];
        } else if (currentSection.length > 0) {
          // Continue current section
          currentSection.push(line);
        } else if (line.trim().length > 0) {
          // If we have content but no section started yet, create one
          currentSection = [`# ${line.trim()}`];
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
      const { presentationInput, numSlides, language } =
        usePresentationState.getState();
      
      // Guard against multiple simultaneous generations
      if (!shouldStartOutlineGeneration || outlineGenerationInProgressRef.current) {
        return;
      }

      // Mark generation as in progress
      outlineGenerationInProgressRef.current = true;

      try {
        console.log("Starting outline generation", {
          prompt: presentationInput,
          numberOfCards: numSlides,
          language,
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
  }, [shouldStartOutlineGeneration, setIsGeneratingOutline, setShouldStartOutlineGeneration]);

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
      } = usePresentationState.getState();

      // Reset the parser and YouTube state before starting a new generation
      streamingParserRef.current.reset();
      youtubeVideoRef.current = null;
      videoSlideInserted.current = false;
      setYoutubeVideo(null);

      setIsGeneratingPresentation(true);

      // Start YouTube search in parallel with presentation generation
      // This runs concurrently, not blocking the main generation
      const searchTopic = presentationInput ?? currentPresentationTitle ?? "";
      if (searchTopic) {
        void searchYouTubeVideo(searchTopic, language);
      }

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
        },
      });
    }
  }, [shouldStartPresentationGeneration, searchYouTubeVideo, setYoutubeVideo]);

  // Clean up RAF on unmount
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
    };
  }, []);

  return null;
}
