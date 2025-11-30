"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { usePresentationState } from "@/states/presentation-state";
import { SlideParser, type PlateSlide } from "@/components/presentation/utils/parser";
import { updatePresentation } from "@/app/_actions/presentation/presentationActions";

interface StreamEvent {
  type: "start" | "slide" | "done" | "error";
  total?: number;
  index?: number;
  content?: string;
  message?: string;
}

/**
 * Hook for parallel slide generation with progressive streaming.
 * Generates slides in parallel batches and updates UI as each completes.
 */
export function useParallelGeneration() {
  const parserRef = useRef<SlideParser>(new SlideParser());
  const slidesMapRef = useRef<Map<number, PlateSlide>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    setSlides,
    setIsGeneratingPresentation,
    setShouldStartPresentationGeneration,
    resetGeneration,
  } = usePresentationState();

  const generatePresentation = useCallback(async () => {
    const {
      outline,
      presentationInput,
      language,
      presentationStyle,
      currentPresentationTitle,
      currentPresentationId,
      theme,
    } = usePresentationState.getState();

    if (!outline.length) {
      toast.error("No outline to generate from");
      return;
    }

    // Reset state
    parserRef.current.reset();
    slidesMapRef.current.clear();
    setSlides([]);
    setIsGeneratingPresentation(true);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/presentation/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: presentationInput ?? currentPresentationTitle ?? "",
          outline,
          language,
          tone: presentationStyle,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete events from buffer
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event: StreamEvent = JSON.parse(line.slice(6)) as StreamEvent;

            switch (event.type) {
              case "start":
                // Initialize with placeholder slides for smooth UX
                break;

              case "slide":
                if (event.index !== undefined && event.content) {
                  // Parse the single slide
                  const tempParser = new SlideParser();
                  tempParser.parseChunk(
                    `<PRESENTATION>${event.content}</PRESENTATION>`
                  );
                  tempParser.finalize();
                  const parsedSlides = tempParser.getAllSlides();

                  if (parsedSlides[0]) {
                    slidesMapRef.current.set(event.index, parsedSlides[0]);

                    // Convert map to sorted array and update state
                    const slidesArray = Array.from(slidesMapRef.current.entries())
                      .sort(([a], [b]) => a - b)
                      .map(([, slide]) => slide);

                    setSlides(slidesArray);
                  }
                }
                break;

              case "done":
                // Final update and save
                const finalSlides = Array.from(slidesMapRef.current.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([, slide]) => slide);

                setSlides(finalSlides);

                if (currentPresentationId && finalSlides.length > 0) {
                  void updatePresentation({
                    id: currentPresentationId,
                    content: { slides: finalSlides },
                    title: currentPresentationTitle ?? "",
                    theme,
                  });
                }

                toast.success(
                  `Generated ${finalSlides.length} slides successfully!`
                );
                break;

              case "error":
                if (event.index !== undefined) {
                  console.warn(`Slide ${event.index} failed to generate`);
                } else {
                  throw new Error(event.message ?? "Generation failed");
                }
                break;
            }
          } catch (parseError) {
            console.error("Error parsing stream event:", parseError);
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        toast.info("Generation cancelled");
      } else {
        console.error("Generation error:", error);
        toast.error(
          `Failed to generate presentation: ${(error as Error).message}`
        );
      }
      resetGeneration();
    } finally {
      setIsGeneratingPresentation(false);
      setShouldStartPresentationGeneration(false);
      abortControllerRef.current = null;
    }
  }, [
    setSlides,
    setIsGeneratingPresentation,
    setShouldStartPresentationGeneration,
    resetGeneration,
  ]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    generatePresentation,
    cancelGeneration,
  };
}
