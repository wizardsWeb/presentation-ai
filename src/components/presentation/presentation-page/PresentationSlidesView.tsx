"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useSlideChangeWatcher } from "@/hooks/presentation/useSlideChangeWatcher";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SlidePreviewRenderer } from "./SlidePreviewRenderer";
import { usePresentationSlides } from "@/hooks/presentation/usePresentationSlides";
import { type TElement } from "@udecode/plate-common";
import { usePresentationState } from "@/states/presentation-state";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { SlideContainer } from "./SlideContainer";
import PresentationEditor from "../editor/presentation-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentProgress } from "../dashboard/AgentProgress";
import { AnimatePresence } from "framer-motion";

// Skeleton slide component for loading state
function SlideSkeleton({ index }: { index: number }) {
  return (
    <div className="slide-wrapper">
      <div className="relative">
        <div className="min-h-[300px] rounded-md border bg-background p-6">
          {/* Title skeleton */}
          <Skeleton className="mb-4 h-8 w-3/4" />
          {/* Content skeletons */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          {/* Image placeholder */}
          <Skeleton className="mt-6 h-32 w-full" />
          {/* More content */}
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        {/* Slide number */}
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          Generating slide {index + 1}...
        </div>
      </div>
    </div>
  );
}

interface PresentationSlidesViewProps {
  handleSlideChange: (value: TElement[], index: number) => void;
  isGeneratingPresentation: boolean;
}

export const PresentationSlidesView = ({
  handleSlideChange,
  isGeneratingPresentation,
}: PresentationSlidesViewProps) => {
  const {
    currentSlideIndex,
    isPresenting,
    nextSlide,
    previousSlide,
    setShouldShowExitHeader,
    expectedSlideCount,
    isAgentActive,
    agentSteps,
    isSearchingYouTube,
    youtubeVideo,
  } = usePresentationState();
  const { items, sensors, handleDragEnd } = usePresentationSlides();
  // Use the slide change watcher to automatically save changes
  useSlideChangeWatcher({ debounceDelay: 600 });

  // Calculate how many skeleton slides to show
  const skeletonCount = isGeneratingPresentation
    ? Math.max(0, expectedSlideCount - items.length)
    : 0;

  // Handle keyboard navigation in presentation mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPresenting) return;
      if (event.key === "ArrowRight" || event.key === "Space") {
        nextSlide();
      } else if (event.key === "ArrowLeft") {
        previousSlide();
      } else if (event.key === "Escape") {
        usePresentationState.getState().setIsPresenting(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, previousSlide, isPresenting]);

  // Handle showing header on mouse move
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (event.clientY < 100) {
        setShouldShowExitHeader(true);
      } else {
        setShouldShowExitHeader(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <>
      {/* Agent Progress Panel - shown during research mode */}
      {isAgentActive && agentSteps.length > 0 && (
        <div className="mb-6">
          <AgentProgress steps={agentSteps} isActive={isAgentActive} />
        </div>
      )}
      
      {/* YouTube Search Status */}
      {(isSearchingYouTube || (isGeneratingPresentation && youtubeVideo)) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm">
          {isSearchingYouTube ? (
            <>
              <svg className="h-4 w-4 animate-spin text-red-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-muted-foreground">Searching for relevant YouTube video...</span>
            </>
          ) : youtubeVideo ? (
            <>
              <svg className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              <span className="text-muted-foreground">
                Video found: <span className="font-medium text-foreground">{youtubeVideo.title}</span>
              </span>
            </>
          ) : null}
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <DndProvider backend={HTML5Backend}>
          <AnimatePresence mode="popLayout">
            {items.map((slide, index) => (
              <div
                key={`slide-${slide.id}-${index}`}
                className={`slide-wrapper slide-wrapper-${index} print-slide`}
              >
                <SlideContainer index={index} id={slide.id}>
                  <div
                    className={cn(
                      `slide-container-${index}`,
                      isPresenting && "h-screen w-screen"
                    )}
                  >
                    <PresentationEditor
                      initialContent={slide}
                      className={cn(
                        "min-h-[300px] rounded-md border",
                        isPresenting && "h-screen w-screen"
                      )}
                      id={slide.id}
                      autoFocus={index === currentSlideIndex}
                      slideIndex={index}
                      onChange={(value) => handleSlideChange(value, index)}
                      isGenerating={isGeneratingPresentation}
                      readOnly={isPresenting}
                    />
                  </div>
                </SlideContainer>

                {/* Create preview directly in the markup */}
                <SlidePreviewRenderer slideIndex={index} slideId={slide.id}>
                  <PresentationEditor
                    initialContent={slide}
                    className="min-h-[300px] border"
                    id={`preview-${slide.id}`}
                    isPreview={true}
                    readOnly={true}
                    slideIndex={index}
                    onChange={() => {
                      // Test
                    }}
                    isGenerating={isGeneratingPresentation}
                  />
                </SlidePreviewRenderer>
              </div>
            ))}
          </AnimatePresence>

          {/* Skeleton slides for remaining expected slides */}
          {skeletonCount > 0 &&
            Array.from({ length: skeletonCount }).map((_, index) => (
              <SlideSkeleton key={`skeleton-${index}`} index={items.length + index} />
            ))}
        </DndProvider>
      </SortableContext>
    </DndContext>
    </>
  );
};
