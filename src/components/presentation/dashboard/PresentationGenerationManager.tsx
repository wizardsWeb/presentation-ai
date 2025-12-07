"use client";

import { useEffect, useRef } from "react";
import { useCompletion } from "@ai-sdk/react";
import { toast } from "sonner";
import { usePresentationState } from "@/states/presentation-state";
import { SlideParser } from "../utils/parser";
import { updatePresentation } from "@/app/_actions/presentation/presentationActions";

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
  } = usePresentationState();

  // Create a ref for the streaming parser to persist between renders
  const streamingParserRef = useRef<SlideParser>(new SlideParser());

  // Add refs to track the animation frame IDs
  const slidesRafIdRef = useRef<number | null>(null);
  const outlineRafIdRef = useRef<number | null>(null);

  // Create buffer refs to store the latest content
  // Note: The types should match what setOutline and setSlides expect
  const slidesBufferRef = useRef<ReturnType<
    SlideParser["getAllSlides"]
  > | null>(null);
  const outlineBufferRef = useRef<string[] | null>(null);

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
        const { currentPresentationId, currentPresentationTitle, theme } =
          usePresentationState.getState();
        const parser = streamingParserRef.current;
        parser.reset();
        parser.parseChunk(_completion);
        parser.finalize();
        parser.clearAllGeneratingMarks();
        const slides = parser.getAllSlides();
        slidesBufferRef.current = slides;

        requestAnimationFrame(updateSlidesWithRAF);

        if (currentPresentationId) {
          void updatePresentation({
            id: currentPresentationId,
            content: { slides: slides },
            title: currentPresentationTitle ?? "",
            theme,
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

      // Reset the parser before starting a new generation
      streamingParserRef.current.reset();

      setIsGeneratingPresentation(true);

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
  }, [shouldStartPresentationGeneration]);

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
