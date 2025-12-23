"use client";

import React from "react";
import { usePresentationState } from "@/states/presentation-state";
import { cn } from "@/lib/utils";
import type { SectionType } from "@/components/presentation/utils/parser";

// Section type configuration for badges - subtle, non-intrusive styling
const sectionConfig: Record<SectionType, { label: string; color: string }> = {
  introduction: { label: "Intro", color: "bg-white/70 shadow-white/20" },
  content: { label: "Content", color: "bg-slate-500/70 shadow-slate-500/20" },
  example: { label: "Example", color: "bg-emerald-500/70 shadow-emerald-500/20" },
  activity: { label: "Activity", color: "bg-amber-500/70 shadow-amber-500/20" },
  summary: { label: "Summary", color: "bg-violet-500/70 shadow-violet-500/20" },
  conclusion: { label: "Conclusion", color: "bg-violet-500/70 shadow-violet-500/20" },
};

interface SlidePreviewProps {
  onSlideClick: (index: number) => void;
  currentSlideIndex: number;
}

export function SlidePreview({
  onSlideClick,
  currentSlideIndex,
}: SlidePreviewProps) {
  const { slides } = usePresentationState();

  return (
    <div className="flex flex-col space-y-4 p-4">
      <h2 className="mb-2 text-sm font-semibold">Slides</h2>
      <div className="flex flex-col space-y-4">
        {slides.map((slide, index) => {
          const sectionType = slide.sectionType;
          const config = sectionType ? sectionConfig[sectionType] : null;
          
          return (
            <div
              key={`slide-preview-${slide.id}-${index}`}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-md border transition-all hover:border-white",
                currentSlideIndex === index
                  ? "border-white ring-1 ring-white"
                  : "border-muted",
              )}
              onClick={() => {
                console.log("clicked", index);
                onSlideClick(index);
              }}
            >
              <div className="absolute left-1.5 top-1 z-0 flex items-center gap-1">
                <span className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
                  {index + 1}
                </span>
                {config && (
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm",
                    config.color
                  )}>
                    {config.label}
                  </span>
                )}
              </div>
              <div
                id={`slide-preview-${index}`}
                className="pointer-events-none h-max min-h-9 w-full overflow-hidden bg-card"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
