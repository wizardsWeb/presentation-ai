"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCompletion } from "ai/react";
import { toast } from "sonner";
import { usePresentationState } from "@/states/presentation-state";
import { SlideParser, parseSingleSlide, type PlateSlide } from "../utils/parser";
import { updatePresentation } from "@/app/_actions/presentation/presentationActions";

// Feature flag: Set to true to use parallel generation (faster)
const USE_PARALLEL_GENERATION = true;

interface StreamEvent {
  type: "start" | "slide" | "done" | "error";
  total?: number;
  index?: number;
  content?: string;
  message?: string;
}

export function PresentationGenerationManager() {
  const {
    numSlides,
    language,
    presentationInput,
    shouldStartOutlineGeneration,
    shouldStartPresentationGeneration,
    setIsGeneratingOutline,
    setShouldStartOutlineGeneration,
    setShouldStartPresentationGeneration,
    resetGeneration,
    setOutline,
    setSlides,
    setIsGeneratingPresentation,
    setExpectedSlideCount,
  } = usePresentationState();

  // Create a ref for the streaming parser to persist between renders
  const streamingParserRef = useRef<SlideParser>(new SlideParser());

  // Add refs to track the animation frame IDs
  const slidesRafIdRef = useRef<number | null>(null);
  const outlineRafIdRef = useRef<number | null>(null);

  // Create buffer refs to store the latest content
  const slidesBufferRef = useRef<ReturnType<
    SlideParser["getAllSlides"]
  > | null>(null);
  const outlineBufferRef = useRef<string[] | null>(null);

  // Refs for parallel generation
  const slidesMapRef = useRef<Map<number, PlateSlide>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to update slides using requestAnimationFrame
  const updateSlidesWithRAF = (): void => {
    if (slidesBufferRef.current !== null) {
      setSlides(slidesBufferRef.current);
      slidesBufferRef.current = null;
    }
    slidesRafIdRef.current = null;
  };

  // Function to update outline using requestAnimationFrame
  const updateOutlineWithRAF = (): void => {
    if (outlineBufferRef.current !== null) {
      setOutline(outlineBufferRef.current);
      outlineBufferRef.current = null;
    }
    outlineRafIdRef.current = null;
  };

  // Parallel generation function
  const generatePresentationParallel = useCallback(async () => {
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
      resetGeneration();
      return;
    }

    // Set expected slide count for skeleton loading
    setExpectedSlideCount(outline.length);

    // Reset state
    streamingParserRef.current.reset();
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
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const jsonStr = line.slice(6);
            const event: StreamEvent = JSON.parse(jsonStr) as StreamEvent;

            switch (event.type) {
              case "start":
                break;

              case "slide":
                if (event.index !== undefined && event.content) {
                  // Parse the single slide using optimized parser
                  const parsedSlide = parseSingleSlide(event.content);

                  if (parsedSlide) {
                    slidesMapRef.current.set(event.index, parsedSlide);

                    // Convert map to sorted array and update state
                    const slidesArray = Array.from(slidesMapRef.current.entries())
                      .sort(([a], [b]) => a - b)
                      .map(([, slide]) => slide);

                    slidesBufferRef.current = slidesArray;
                    if (slidesRafIdRef.current === null) {
                      slidesRafIdRef.current = requestAnimationFrame(updateSlidesWithRAF);
                    }
                  }
                }
                break;

              case "done": {
                // Final update and save
                const finalSlides = Array.from(slidesMapRef.current.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([, slide]) => slide);

                slidesBufferRef.current = finalSlides;
                requestAnimationFrame(updateSlidesWithRAF);

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
              }

              case "error":
                if (event.index === undefined) {
                  throw new Error(event.message ?? "Generation failed");
                }
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        toast.info("Generation cancelled");
      } else {
        toast.error(
          `Failed to generate presentation: ${(error as Error).message}`
        );
      }
      resetGeneration();
    } finally {
      setIsGeneratingPresentation(false);
      setShouldStartPresentationGeneration(false);
      setExpectedSlideCount(0); // Reset skeleton count
      abortControllerRef.current = null;
    }
  }, [resetGeneration, setIsGeneratingPresentation, setSlides, setShouldStartPresentationGeneration, setExpectedSlideCount]);

  // Outline generation
  const { completion: outlineCompletion, complete: generateOutline } =
    useCompletion({
      api: "/api/presentation/outline",
      body: {
        prompt: presentationInput,
        numberOfCards: numSlides,
        language,
      },
      onFinish: () => {
        setIsGeneratingOutline(false);
        setShouldStartOutlineGeneration(false);
        setShouldStartPresentationGeneration(false);

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

        if (outlineRafIdRef.current !== null) {
          cancelAnimationFrame(outlineRafIdRef.current);
          outlineRafIdRef.current = null;
        }
      },
      onError: (error) => {
        toast.error("Failed to generate outline: " + error.message);
        resetGeneration();

        if (outlineRafIdRef.current !== null) {
          cancelAnimationFrame(outlineRafIdRef.current);
          outlineRafIdRef.current = null;
        }
      },
    });

  useEffect(() => {
    if (outlineCompletion && typeof outlineCompletion === "string") {
      const sections = outlineCompletion.split(/^# /gm).filter(Boolean);
      const outlineItems: string[] =
        sections.length > 0
          ? sections.map((section) => `# ${section}`.trim())
          : [outlineCompletion];

      outlineBufferRef.current = outlineItems;

      if (outlineRafIdRef.current === null) {
        outlineRafIdRef.current = requestAnimationFrame(updateOutlineWithRAF);
      }
    }
  }, [outlineCompletion]);

  // Watch for outline generation start
  useEffect(() => {
    const startOutlineGeneration = async (): Promise<void> => {
      const { presentationInput, numSlides, language } =
        usePresentationState.getState();
      if (shouldStartOutlineGeneration) {
        try {
          setIsGeneratingOutline(true);

          if (outlineRafIdRef.current === null) {
            outlineRafIdRef.current =
              requestAnimationFrame(updateOutlineWithRAF);
          }

          await generateOutline(presentationInput ?? "", {
            body: {
              prompt: presentationInput ?? "",
              numberOfCards: numSlides,
              language,
            },
          });
        } catch (error) {
          console.log(error);
        } finally {
          setIsGeneratingOutline(false);
          setShouldStartOutlineGeneration(false);
        }
      }
    };

    void startOutlineGeneration();
  }, [shouldStartOutlineGeneration]);

  // Sequential generation (original approach)
  const { completion: presentationCompletion, complete: generatePresentationSequential } =
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
        if (slidesRafIdRef.current !== null) {
          cancelAnimationFrame(slidesRafIdRef.current);
          slidesRafIdRef.current = null;
        }
      },
      onError: (error) => {
        toast.error("Failed to generate presentation: " + error.message);
        resetGeneration();
        streamingParserRef.current.reset();

        if (slidesRafIdRef.current !== null) {
          cancelAnimationFrame(slidesRafIdRef.current);
          slidesRafIdRef.current = null;
        }
      },
    });

  useEffect(() => {
    if (!USE_PARALLEL_GENERATION && presentationCompletion) {
      try {
        streamingParserRef.current.reset();
        streamingParserRef.current.parseChunk(presentationCompletion);
        streamingParserRef.current.finalize();
        const allSlides = streamingParserRef.current.getAllSlides();

        slidesBufferRef.current = allSlides;

        if (slidesRafIdRef.current === null) {
          slidesRafIdRef.current = requestAnimationFrame(updateSlidesWithRAF);
        }
      } catch (error) {
        console.error("Error processing presentation XML:", error);
        toast.error("Error processing presentation content");
      }
    }
  }, [presentationCompletion]);

  // Watch for presentation generation start
  useEffect(() => {
    if (shouldStartPresentationGeneration) {
      if (USE_PARALLEL_GENERATION) {
        // Use parallel generation (faster)
        void generatePresentationParallel();
      } else {
        // Use sequential generation (original)
        const {
          outline,
          presentationInput,
          language,
          presentationStyle,
          currentPresentationTitle,
        } = usePresentationState.getState();

        streamingParserRef.current.reset();
        setIsGeneratingPresentation(true);

        if (slidesRafIdRef.current === null) {
          slidesRafIdRef.current = requestAnimationFrame(updateSlidesWithRAF);
        }

        void generatePresentationSequential(presentationInput ?? "", {
          body: {
            title: presentationInput ?? currentPresentationTitle ?? "",
            outline,
            language,
            tone: presentationStyle,
          },
        });
      }
    }
  }, [shouldStartPresentationGeneration, generatePresentationParallel]);

  // Clean up RAF and abort controller on unmount
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

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return null;
}

