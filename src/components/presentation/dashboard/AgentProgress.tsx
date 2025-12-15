"use client";

import { cn } from "@/lib/utils";
import { Search, Sparkles, CheckCircle, RefreshCw, AlertCircle, Loader2, Play, Youtube } from "lucide-react";
import { useMemo } from "react";

export interface AgentStep {
  type: string;
  slideIndex?: number;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface AgentProgressProps {
  steps: AgentStep[];
  isActive: boolean;
}

const stepIcons: Record<string, React.ReactNode> = {
  agent_start: <Sparkles className="h-4 w-4" />,
  slide_start: <Play className="h-4 w-4" />,
  researching: <Search className="h-4 w-4 animate-pulse" />,
  research_complete: <CheckCircle className="h-4 w-4 text-green-500" />,
  youtube_search: <Youtube className="h-4 w-4 animate-pulse text-red-500" />,
  youtube_found: <Youtube className="h-4 w-4 text-red-500" />,
  video_slide: <Youtube className="h-4 w-4 text-red-500" />,
  generating: <Loader2 className="h-4 w-4 animate-spin" />,
  validating: <CheckCircle className="h-4 w-4 animate-pulse" />,
  refining: <RefreshCw className="h-4 w-4 animate-spin" />,
  slide_complete: <CheckCircle className="h-4 w-4 text-green-500" />,
  agent_done: <Sparkles className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
};

const stepColors: Record<string, string> = {
  agent_start: "text-purple-500",
  slide_start: "text-blue-400",
  researching: "text-blue-500",
  research_complete: "text-green-500",
  youtube_search: "text-red-500",
  youtube_found: "text-red-500",
  video_slide: "text-red-500",
  generating: "text-yellow-500",
  validating: "text-cyan-500",
  refining: "text-orange-500",
  slide_complete: "text-green-500",
  agent_done: "text-green-500",
  error: "text-red-500",
};

export function AgentProgress({ steps, isActive }: AgentProgressProps) {
  // Calculate stats from steps
  const { completedSlides, totalSlides, recentSteps } = useMemo(() => {
    const completed = steps.filter((s) => s.type === "slide_complete").length;
    
    // Get total from agent_start event or count unique slide indices
    const startEvent = steps.find((s) => s.type === "agent_start");
    const total = (startEvent?.data?.totalSlides as number) ?? 
      Math.max(...steps.filter(s => s.slideIndex !== undefined).map(s => (s.slideIndex ?? 0) + 1), 0);
    
    // Get last 6 steps, filtered for relevance
    const relevant = steps.filter(s => 
      s.type !== "slide_start" || steps.length < 10
    ).slice(-6);
    
    return { 
      completedSlides: completed, 
      totalSlides: total || 1,
      recentSteps: relevant,
    };
  }, [steps]);

  if (!isActive && steps.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="font-medium">Research Mode</span>
          {isActive && (
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500"></span>
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {completedSlides}/{totalSlides} slides
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
          style={{ width: `${Math.min((completedSlides / totalSlides) * 100, 100)}%` }}
        />
      </div>

      {/* Recent steps */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {recentSteps.map((step, index) => (
          <div
            key={`${step.type}-${step.slideIndex ?? 'x'}-${step.timestamp}-${index}`}
            className={cn(
              "flex items-center gap-2 text-sm transition-opacity",
              index < recentSteps.length - 1 && "opacity-50"
            )}
          >
            <span className={stepColors[step.type] ?? "text-muted-foreground"}>
              {stepIcons[step.type] ?? <Loader2 className="h-4 w-4" />}
            </span>
            <span className="truncate">
              {step.slideIndex !== undefined && (
                <span className="font-medium text-muted-foreground">
                  [{step.slideIndex + 1}]{" "}
                </span>
              )}
              {step.message}
            </span>
          </div>
        ))}

        {isActive && recentSteps.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Initializing agent...</span>
          </div>
        )}
      </div>

      {/* Stats (shown when complete) */}
      {!isActive && steps.some((s) => s.type === "agent_done") && (
        <div className="mt-3 flex gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span>
            🔍 Research: {steps.filter((s) => s.type === "research_complete" && s.data?.resultCount).length} queries
          </span>
          <span>
            ✅ Completed: {completedSlides}/{totalSlides}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function AgentProgressInline({
  currentStep,
  slideIndex,
  totalSlides,
}: {
  currentStep?: AgentStep;
  slideIndex: number;
  totalSlides: number;
}) {
  if (!currentStep) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={stepColors[currentStep.type] ?? ""}>
        {stepIcons[currentStep.type]}
      </span>
      <span>
        Slide {slideIndex + 1}/{totalSlides}: {currentStep.message}
      </span>
    </div>
  );
}
