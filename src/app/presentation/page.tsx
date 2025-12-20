"use client";

import { Wand2, Plus, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PresentationInput } from "@/components/presentation/dashboard/PresentationInput";
import { PresentationControls } from "@/components/presentation/dashboard/PresentationControls";
import { PresentationTemplates } from "@/components/presentation/dashboard/PresentationTemplates";
import { RecentPresentations } from "@/components/presentation/dashboard/RecentPresentations";
import { PresentationExamples } from "@/components/presentation/dashboard/PresentationExamples";
import { useEffect } from "react";
import { createEmptyPresentation } from "@/app/_actions/presentation/presentationActions";
import { GenerationModeSelector } from "@/components/presentation/dashboard/GenerationModeSelector";
import { VoiceInputButton } from "@/components/ui/voice-input";
import { useCallback } from "react";

export default function PresentationPage() {
  const router = useRouter();
  const {
    presentationInput,
    isGeneratingOutline,
    setCurrentPresentation,
    setIsGeneratingOutline,
    setShouldStartOutlineGeneration,
    language,
    setPresentationInput,
  } = usePresentationState();

  useEffect(() => {
    setCurrentPresentation("", "");
    setIsGeneratingOutline(false);
    setShouldStartOutlineGeneration(false);
  }, [setCurrentPresentation, setIsGeneratingOutline, setShouldStartOutlineGeneration]);

  const handleVoiceTranscript = useCallback((text: string) => {
    setPresentationInput(
      presentationInput ? `${presentationInput} ${text}` : text
    );
  }, [presentationInput, setPresentationInput]);

  const handleGenerate = async () => {
    if (!presentationInput.trim()) {
      toast.error("Please enter a topic for your presentation");
      return;
    }

    setIsGeneratingOutline(true);

    try {
      const result = await createEmptyPresentation(
        presentationInput.substring(0, 50) || "Untitled Presentation"
      );

      if (result.success && result.presentation) {
        setCurrentPresentation(
          result.presentation.id,
          result.presentation.title
        );
        router.push(`/presentation/generate/${result.presentation.id}`);
      } else {
        setIsGeneratingOutline(false);
        toast.error(result.message || "Failed to create presentation");
      }
    } catch (error) {
      setIsGeneratingOutline(false);
      console.error("Error creating presentation:", error);
      toast.error("Failed to create presentation");
    }
  };

  const handleCreateBlank = async () => {
    try {
      setIsGeneratingOutline(true);
      const result = await createEmptyPresentation("Untitled Presentation");
      if (result.success && result.presentation) {
        setCurrentPresentation(
          result.presentation.id,
          result.presentation.title
        );
        router.push(`/presentation/generate/${result.presentation.id}`);
      } else {
        setIsGeneratingOutline(false);
        toast.error(result.message || "Failed to create presentation");
      }
    } catch (error) {
      setIsGeneratingOutline(false);
      console.error("Error creating presentation:", error);
      toast.error("Failed to create presentation");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Main Content Area - ChatGPT Style */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Welcome Message */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-semibold text-white">
            Where should we begin?
          </h1>
        </div>

        {/* Input Area */}
        <div className="w-full max-w-3xl space-y-6">
          {/* Main Input Field */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 shadow-lg backdrop-blur-sm transition-all hover:border-white/30 focus-within:border-white/40">
              <Plus className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <textarea
                value={presentationInput}
                onChange={(e) => setPresentationInput(e.target.value)}
                placeholder="Ask anything"
                className="flex-1 resize-none bg-transparent text-white placeholder:text-gray-400 focus:outline-none text-base"
                rows={1}
                style={{ minHeight: "24px", maxHeight: "200px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (presentationInput.trim()) {
                      void handleGenerate();
                    }
                  }
                }}
              />
              <div className="flex items-center gap-2">
                <VoiceInputButton
                  onTranscript={handleVoiceTranscript}
                  language={language}
                  size="sm"
                />
                <Button
                  onClick={handleGenerate}
                  disabled={!presentationInput.trim() || isGeneratingOutline}
                  className="h-8 w-8 rounded-full bg-white p-0 hover:bg-white/90 text-black disabled:opacity-50"
                  size="sm"
                >
                  <Sparkles className="h-4 w-4 text-black" />
                </Button>
              </div>
            </div>
          </div>

          {/* Configuration Section - Collapsible */}
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
            <PresentationControls shouldShowLabel={true} />
            
            <div className="flex items-center justify-between pt-2">
              <GenerationModeSelector />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={!presentationInput.trim() || isGeneratingOutline}
                  className="gap-2 bg-white hover:bg-white/90 text-black"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate Presentation
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCreateBlank}
                  className="gap-2 border-white/20 text-white hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  Create Blank
                </Button>
              </div>
            </div>
          </div>

          {/* Tip */}
          <p className="text-center text-xs text-gray-400">
            💡 Tip: Click the microphone to speak your topic, e.g., &quot;Create slides on photosynthesis for Class 5&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
