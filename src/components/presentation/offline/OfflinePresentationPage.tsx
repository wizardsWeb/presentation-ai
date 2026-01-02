"use client";

import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { usePresentationState } from "@/states/presentation-state";
import {
  type Themes,
  themes,
  setThemeVariables,
} from "@/lib/presentation/themes";
import { useTheme } from "next-themes";
import { PresentationSlidesView } from "@/components/presentation/presentation-page/PresentationSlidesView";
import { PresentationLayout } from "@/components/presentation/presentation-page/PresentationLayout";
import { PresenterNotes } from "@/components/presentation/presentation-page/PresenterNotes";
import PresentationHeader from "@/components/presentation/presentation-page/PresentationHeader";
import { type TElement } from "@udecode/plate-common";
import { type PlateSlide } from "@/components/presentation/utils/parser";

export default function OfflinePresentationPage() {
  const params = useParams();
  const id = params.id as string;
  const { resolvedTheme } = useTheme();
  const {
    setCurrentPresentation,
    setSlides,
    isGeneratingPresentation,
    setTheme,
    theme,
    slides,
    currentPresentationId,
    currentPresentationTitle,
  } = usePresentationState();

  // Initialize presentation from state (no database fetch)
  useEffect(() => {
    if (id?.startsWith("offline-")) {
      // Presentation data is already in state from the generator
      // Just ensure the ID is set
      if (currentPresentationId !== id) {
        const title = currentPresentationTitle ?? "Untitled Presentation";
        setCurrentPresentation(id, title);
      }
    }
  }, [id, currentPresentationId, currentPresentationTitle, setCurrentPresentation]);

  // Handle slide content changes
  const handleSlideChange = useCallback((value: TElement[], slideIndex: number) => {
    const { slides: currentSlides, isGeneratingPresentation, isPresenting } =
      usePresentationState.getState();

    if (isGeneratingPresentation || isPresenting) return;

    const updatedSlides = [...currentSlides];
    // Make sure we have the slide at that index
    if (updatedSlides[slideIndex]) {
      // Update the content of the slide
      updatedSlides[slideIndex] = {
        ...updatedSlides[slideIndex],
        content: value as PlateSlide["content"],
      };

      // Update the global state
      setSlides(updatedSlides);
    }
  }, [setSlides]);

  // Set default theme if not set
  useEffect(() => {
    if (!theme) {
      setTheme("mystique");
    }
  }, [theme, setTheme]);

  // Apply theme variables
  useEffect(() => {
    if (theme) {
      const themeData = themes[theme as Themes];
      if (themeData) {
        setThemeVariables(themeData, resolvedTheme === "dark");
      }
    }
  }, [theme, resolvedTheme]);

  if (!slides || slides.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101010]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">No slides found</h2>
          <p className="text-gray-400">Please generate a presentation first</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen overflow-hidden">
        <PresentationHeader />
        <div className="flex-1 min-h-0 overflow-hidden">
          <PresentationLayout
            isLoading={false}
            themeData={undefined}
          >
            <div className="mx-auto max-w-[90%] space-y-8 p-8 pt-8">
              <div className="space-y-8">
                <PresentationSlidesView
                  handleSlideChange={handleSlideChange}
                  isGeneratingPresentation={isGeneratingPresentation}
                />
              </div>
            </div>
          </PresentationLayout>
        </div>
      </div>
      <PresenterNotes />
    </>
  );
}

