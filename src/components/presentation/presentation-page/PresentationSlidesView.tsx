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
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <DndProvider backend={HTML5Backend}>
          {items.map((slide, index) => (
            <div
              key={`slide-${slide.id}-${index}`}
              className={`slide-wrapper slide-wrapper-${index}`}
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
