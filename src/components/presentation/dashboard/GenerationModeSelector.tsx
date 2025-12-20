"use client";

import { usePresentationState } from "@/states/presentation-state";
import { Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function GenerationModeSelector() {
  const { generationMode, setGenerationMode, isGeneratingPresentation, isGeneratingOutline } = usePresentationState();
  
  const isDisabled = isGeneratingPresentation || isGeneratingOutline;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400">Mode:</span>
      <div className="flex rounded-lg border border-white/20 bg-white/5 p-1">
        <button
          onClick={() => setGenerationMode("quick")}
          disabled={isDisabled}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            generationMode === "quick"
              ? "bg-white/10 text-white shadow-sm"
              : "text-gray-400 hover:text-white",
            isDisabled && "cursor-not-allowed opacity-50"
          )}
          title="Fast parallel generation without web research"
        >
          <Zap className="h-3.5 w-3.5" />
          Quick
        </button>
        <button
          onClick={() => setGenerationMode("research")}
          disabled={isDisabled}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            generationMode === "research"
              ? "bg-white/10 text-white shadow-sm"
              : "text-gray-400 hover:text-white",
            isDisabled && "cursor-not-allowed opacity-50"
          )}
          title="Agent-powered generation with web research and validation"
        >
          <Search className="h-3.5 w-3.5" />
          Research
        </button>
      </div>
    </div>
  );
}
