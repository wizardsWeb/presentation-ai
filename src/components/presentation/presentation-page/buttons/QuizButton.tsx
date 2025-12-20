"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { usePresentationState, type QuizState } from "@/states/presentation-state";
import { Brain, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper to extract text content from slide content
function extractTextFromSlide(content: unknown[]): string {
  const texts: string[] = [];
  
  function traverse(node: unknown): void {
    if (!node || typeof node !== "object") return;
    
    const n = node as Record<string, unknown>;
    
    // Extract text from leaf nodes
    if (typeof n.text === "string" && n.text.trim()) {
      texts.push(n.text.trim());
    }
    
    // Traverse children
    if (Array.isArray(n.children)) {
      n.children.forEach(traverse);
    }
  }
  
  content.forEach(traverse);
  return texts.join(" ");
}

export function QuizButton() {
  const {
    slides,
    language,
    audienceType,
    currentPresentationTitle,
    isGeneratingQuiz,
    setIsGeneratingQuiz,
    setQuiz,
    setIsQuizModalOpen,
  } = usePresentationState();

  const handleGenerateQuiz = async () => {
    if (slides.length === 0) return;
    
    setIsGeneratingQuiz(true);
    setIsQuizModalOpen(true);
    
    try {
      // Extract text content from each slide
      const slideContents = slides.map((slide) => {
        return extractTextFromSlide(slide.content);
      }).filter(Boolean);

      const response = await fetch("/api/presentation/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideContents,
          presentationTitle: currentPresentationTitle ?? "Presentation",
          numberOfQuestions: Math.min(Math.max(slides.length, 5), 10), // 5-10 questions
          language,
          audienceType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      const data = await response.json() as { success: boolean; quiz: QuizState };
      
      if (data.success && data.quiz) {
        setQuiz(data.quiz);
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      // Close modal on error
      setIsQuizModalOpen(false);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz || slides.length === 0}
            className="gap-2 border-white/20 text-white hover:bg-white/10"
          >
            {isGeneratingQuiz ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Quiz</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Generate a quiz from this presentation</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
