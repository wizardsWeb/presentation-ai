"use client";

import { Wand2, Plus, Sparkles, Layout, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePresentationState, SUPPORTED_LANGUAGES, type TeachingStyle, type AudienceType } from "@/states/presentation-state";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PresentationTemplates } from "@/components/presentation/dashboard/PresentationTemplates";
import { useEffect } from "react";
import { createEmptyPresentation } from "@/app/_actions/presentation/presentationActions";
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
    setShowTemplates,
    numSlides,
    setNumSlides,
    pageStyle,
    setPageStyle,
    setLanguage,
    teachingStyle,
    setTeachingStyle,
    audienceType,
    setAudienceType,
    generationMode,
    setGenerationMode,
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
        presentationInput.substring(0, 50) || "Untitled Presentation",
        "default",
        language
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
      const result = await createEmptyPresentation("Untitled Presentation", "default", language);
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
    <div className="flex h-full flex-col bg-[#101010]">
      {/* Main Content Area - Left Side Layout */}
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        {/* Title Section - Left aligned, large spacing */}
        <div className="mb-16">
          <h1 className="text-5xl font-bold text-white leading-tight">
            Create stunning presentations in seconds with AI
          </h1>
        </div>

        {/* Input Section */}
        <div className="mb-10 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">
              What would you like to present about?
            </label>
            <Button
              variant="outline"
              onClick={() => setShowTemplates(true)}
              className="gap-2 rounded-lg border border-[#555555] bg-[#101010] px-4 py-2 text-sm text-white hover:bg-[#3C3C3C] hover:border-[#666666]"
            >
              <Sparkles className="h-4 w-4" />
              Templates
            </Button>
          </div>
          <div className="relative">
            <textarea
              value={presentationInput}
              onChange={(e) => setPresentationInput(e.target.value)}
              placeholder="Describe your topic or paste your content here. Our AI will structure it into a compelling presentation."
              className="min-h-[150px] w-full resize-none rounded-lg border border-[#555555] bg-[#101010] p-4 text-base text-white placeholder:text-[#AAAAAA] focus:border-[#777777] focus:outline-none focus:ring-2 focus:ring-white/20"
              rows={6}
            />
            <div className="absolute bottom-3 right-3">
              <VoiceInputButton
                onTranscript={handleVoiceTranscript}
                language={language}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Settings Section - First Row: Three Dropdowns */}
        <div className="mb-6 grid grid-cols-3 gap-6">
          {/* Number of Slides */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Number of slides
            </label>
            <Select
              value={String(numSlides)}
              onValueChange={(v) => setNumSlides(Number(v))}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border border-[#555555] bg-[#101010] px-3 text-sm text-white hover:bg-[#3C3C3C] focus:border-[#777777] focus:outline-none focus:ring-2 focus:ring-white/20">
                <SelectValue placeholder="Select number of slides" />
              </SelectTrigger>
              <SelectContent className="border-[#555555] bg-[#1f1f1f] text-white">
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30].map((num) => (
                  <SelectItem 
                    key={num} 
                    value={String(num)} 
                    className="text-white focus:bg-white/10"
                  >
                    {num} slides
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Language
            </label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-10 w-full rounded-lg border border-[#555555] bg-[#101010] px-3 text-sm text-white hover:bg-[#3C3C3C] focus:border-[#777777] focus:outline-none focus:ring-2 focus:ring-white/20">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="border-[#555555] bg-[#1f1f1f] text-white">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem 
                    key={lang.code} 
                    value={lang.code} 
                    className="text-white focus:bg-white/10"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page Style */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Page style
            </label>
            <Select value={pageStyle} onValueChange={setPageStyle}>
              <SelectTrigger className="h-10 w-full rounded-lg border border-[#555555] bg-[#101010] px-3 text-sm text-white hover:bg-[#3C3C3C] focus:border-[#777777] focus:outline-none focus:ring-2 focus:ring-white/20">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  <SelectValue placeholder="Select page style" />
                </div>
              </SelectTrigger>
              <SelectContent className="border-[#555555] bg-[#1f1f1f] text-white">
                <SelectItem value="default" className="text-white focus:bg-white/10">
                  Default
                </SelectItem>
                <SelectItem value="traditional" className="text-white focus:bg-white/10">
                  Traditional
                </SelectItem>
                <SelectItem value="tall" className="text-white focus:bg-white/10">
                  Tall
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Settings Section - Second Row: Teaching Style and Target Audience */}
        <div className="mb-6 grid grid-cols-2 gap-6">
          {/* Teaching Style */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Teaching Style
            </label>
            <Select 
              value={teachingStyle} 
              onValueChange={(v) => setTeachingStyle(v as TeachingStyle)}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border border-[#555555] bg-[#101010] px-3 text-sm text-white hover:bg-[#3C3C3C] focus:border-[#777777] focus:outline-none focus:ring-2 focus:ring-white/20">
                <SelectValue placeholder="Select teaching style" />
              </SelectTrigger>
              <SelectContent className="border-[#555555] bg-[#1f1f1f] text-white">
                <SelectItem value="concept-first" className="text-white focus:bg-white/10">
                  Concept First
                </SelectItem>
                <SelectItem value="example-first" className="text-white focus:bg-white/10">
                  Example First
                </SelectItem>
                <SelectItem value="storytelling" className="text-white focus:bg-white/10">
                  Storytelling
                </SelectItem>
                <SelectItem value="data-driven" className="text-white focus:bg-white/10">
                  Data Driven
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">
              Target Audience
            </label>
            <Select 
              value={audienceType} 
              onValueChange={(v) => setAudienceType(v as AudienceType)}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border border-[#555555] bg-[#101010] px-3 text-sm text-white hover:bg-[#3C3C3C] focus:border-[#777777] focus:outline-none focus:ring-2 focus:ring-white/20">
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent className="border-[#555555] bg-[#1f1f1f] text-white">
                <SelectItem value="school" className="text-white focus:bg-white/10">
                  School (K-12)
                </SelectItem>
                <SelectItem value="college" className="text-white focus:bg-white/10">
                  College
                </SelectItem>
                <SelectItem value="training" className="text-white focus:bg-white/10">
                  Corporate Training
                </SelectItem>
                <SelectItem value="professional" className="text-white focus:bg-white/10">
                  Professional
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons and Generation Mode in one line */}
        <div className="mb-10 flex items-center justify-between gap-6">
          {/* Generation Mode */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-white whitespace-nowrap">
              Generation Mode
            </label>
            <div className="flex rounded-lg border border-[#555555] bg-[#101010] p-1">
              <button
                onClick={() => setGenerationMode("quick")}
                className={`flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
                  generationMode === "quick"
                    ? "bg-[#3C3C3C] text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-[#2C2C2C]"
                }`}
                title="Fast parallel generation without web research"
              >
                <Zap className="h-4 w-4" />
                Quick
              </button>
              <button
                onClick={() => setGenerationMode("research")}
                className={`flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
                  generationMode === "research"
                    ? "bg-[#3C3C3C] text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-[#2C2C2C]"
                }`}
                title="Agent-powered generation with web research and validation"
              >
                <Search className="h-4 w-4" />
                Research
              </button>
            </div>
          </div>

          <div>
            <Button 
              variant="outline"
              onClick={() => router.push("/offline/presentation")}
              className="gap-2 border-[#555555] bg-[#101010] px-6 py-3 text-base font-medium text-white hover:bg-[#3C3C3C] hover:border-[#666666]"
            >
              Offline
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
          <Button
            onClick={handleGenerate}
            disabled={!presentationInput.trim() || isGeneratingOutline}
            className="gap-2 bg-white px-6 py-3 text-base font-medium text-black hover:bg-[#555555] disabled:opacity-50"
          >
            <Wand2 className="h-5 w-5" />
            Generate Presentation
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateBlank}
            className="gap-2 border-[#555555] bg-[#101010] px-6 py-3 text-base font-medium text-white hover:bg-[#3C3C3C] hover:border-[#666666]"
          >
            <Plus className="h-5 w-5" />
            Create Blank
          </Button>
          </div>
        </div>

      {/* Templates Modal */}
      <PresentationTemplates />
    </div>
    </div>
  );
}
