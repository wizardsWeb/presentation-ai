"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import {
  type Themes,
  themes,
  type ThemeProperties,
} from "@/lib/presentation/themes";
import { Spinner } from "@/components/ui/spinner";
import { getCustomThemeById } from "@/app/_actions/presentation/theme-actions";
import { getPresentation } from "@/app/_actions/presentation/presentationActions";
import { type ImageModelList } from "@/app/_actions/image/generate";
import { ThemeBackground } from "@/components/presentation/theme/ThemeBackground";
import { ThemeSettings } from "@/components/presentation/theme/ThemeSettings";
import { Header } from "@/components/presentation/outline/Header";
import { PromptInput } from "@/components/presentation/outline/PromptInput";
import { OutlineList } from "@/components/presentation/outline/OutlineList";

export default function PresentationGenerateWithIdPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const {
    setCurrentPresentation,
    setPresentationInput,
    startPresentationGeneration,
    isGeneratingPresentation,
    isGeneratingOutline,
    setOutline,
    setShouldStartOutlineGeneration,
    setTheme,
    setImageModel,
    setPresentationStyle,
    setLanguage,
  } = usePresentationState();

  // Track if this is a fresh navigation or a revisit
  const initialLoadComplete = useRef(false);
  const generationStarted = useRef(false);

  // Use React Query to fetch presentation data
  const { data: presentationData, isLoading: isLoadingPresentation } = useQuery(
    {
      queryKey: ["presentation", id],
      queryFn: async () => {
        const result = await getPresentation(id);
        if (!result.success) {
          throw new Error(result.message ?? "Failed to load presentation");
        }
        return result.presentation;
      },
      enabled: !!id,
    }
  );

  // This effect handles the immediate startup of generation upon first mount
  // only if we're coming fresh from the dashboard (isGeneratingOutline === true)
  // and the presentation doesn't already have an outline
  useEffect(() => {
    // Wait for presentation data to finish loading
    if (isLoadingPresentation) return;
    
    // Only run once after data has loaded
    if (initialLoadComplete.current) return;
    initialLoadComplete.current = true;

    // If presentation already has an outline, don't generate a new one
    if (presentationData?.presentation?.outline && presentationData.presentation.outline.length > 0) {
      console.log("Presentation already has an outline, skipping generation");
      return;
    }

    // Check if isGeneratingOutline is true (set by dashboard before navigation)
    // OR if we have presentation input but no outline yet
    const { presentationInput } = usePresentationState.getState();
    const shouldAutoGenerate = isGeneratingOutline || (presentationInput && presentationInput.trim().length > 0);
    
    if (shouldAutoGenerate && !generationStarted.current) {
      console.log("Starting outline generation after navigation", { isGeneratingOutline, presentationInput });
      generationStarted.current = true;

      // Give the component time to fully mount and establish connections
      // before starting the generation process
      setTimeout(() => {
        setShouldStartOutlineGeneration(true);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingPresentation, presentationData]); // Re-check when data finishes loading

  // Update presentation state when data is fetched
  useEffect(() => {
    if (presentationData && !isLoadingPresentation) {
      setCurrentPresentation(presentationData.id, presentationData.title);
      setPresentationInput(presentationData.title);

      if (presentationData.presentation?.outline) {
        setOutline(presentationData.presentation.outline);
      }

      // Set theme if available
      if (presentationData?.presentation?.theme) {
        const themeId = presentationData.presentation.theme;

        // Check if this is a predefined theme
        if (themeId in themes) {
          // Use predefined theme
          setTheme(themeId as Themes);
        } else {
          // If not in predefined themes, treat as custom theme
          void getCustomThemeById(themeId)
            .then((result) => {
              if (result.success && result.theme) {
                // Set the theme with the custom theme data
                const themeData = result.theme
                  .themeData as unknown as ThemeProperties;
                setTheme(themeId, themeData);
              } else {
                // Fallback to default theme if custom theme not found
                console.warn("Custom theme not found:", themeId);
                setTheme("mystique");
              }
            })
            .catch((error) => {
              console.error("Failed to load custom theme:", error);
              // Fallback to default theme on error
              setTheme("mystique");
            });
        }
      }

      // Set imageModel if available
      if (presentationData?.presentation?.imageModel) {
        setImageModel(
          presentationData?.presentation?.imageModel as ImageModelList
        );
      }

      // Set presentationStyle if available
      if (presentationData?.presentation?.presentationStyle) {
        setPresentationStyle(presentationData.presentation.presentationStyle);
      }

      // Set language if available in presentation
      // If not in presentation, Zustand state should already have it from first page
      if (presentationData.presentation?.language) {
        setLanguage(presentationData.presentation.language);
      }
      // Note: If presentation doesn't have language, Zustand state from first page should persist
    }
  }, [
    presentationData,
    isLoadingPresentation,
    setCurrentPresentation,
    setPresentationInput,
    setOutline,
    setTheme,
    setImageModel,
    setPresentationStyle,
    setLanguage,
  ]);

  const handleGenerate = () => {
    // Start generation FIRST, then navigate
    // This ensures isGeneratingPresentation is true when the presentation page loads
    startPresentationGeneration();
    // Small delay to ensure state is set before navigation
    setTimeout(() => {
      router.push(`/presentation/${id}`);
    }, 50);
  };

  if (isLoadingPresentation) {
    return (
      <ThemeBackground>
        <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center">
          <div className="relative">
            <Spinner className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">Loading Presentation Outline</h2>
            <p className="text-muted-foreground">Please wait a moment...</p>
          </div>
        </div>
      </ThemeBackground>
    );
  }
  return (
    <ThemeBackground>
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <div className="space-y-10">
          {/* Header Section */}
          <div className="space-y-6">
            <Header />
            <PromptInput />
          </div>

          {/* Outline Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Outline</h2>
            <OutlineList />
          </div>

          {/* Theme & Configuration Section */}
          <div className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-semibold text-white">Customize Presentation</h2>
            <ThemeSettings />
          </div>

          {/* Generate Button at End of Form */}
          <div className="flex justify-center pt-4 pb-8">
            <Button
              size="lg"
              className="gap-2 bg-white px-12 py-6 text-base font-medium text-black hover:bg-white/90 disabled:opacity-50"
              onClick={handleGenerate}
              disabled={isGeneratingPresentation}
            >
              <Wand2 className="h-5 w-5" />
              {isGeneratingPresentation ? "Generating Presentation..." : "Generate Presentation"}
            </Button>
          </div>
        </div>
      </div>
    </ThemeBackground>
  );
}
