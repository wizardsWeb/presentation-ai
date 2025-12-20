"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePresentationState } from "@/states/presentation-state";
import { QuizView } from "./QuizView";
import { Loader2, Brain, Sparkles } from "lucide-react";

export function QuizModal() {
  const { isQuizModalOpen, setIsQuizModalOpen, quiz, isGeneratingQuiz } = usePresentationState();

  return (
    <Dialog open={isQuizModalOpen} onOpenChange={setIsQuizModalOpen}>
      <DialogContent 
        className="max-h-[85vh] w-[95vw] max-w-2xl overflow-hidden rounded-xl border-0 p-0 shadow-2xl sm:w-full"
        style={{ zIndex: 9999 }}
      >
        {/* Header with gradient accent */}
        <DialogHeader className="relative border-b bg-gradient-to-r from-white/5 to-white/10 px-6 py-5">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Knowledge Quiz</span>
              {quiz && (
                <p className="text-xs font-normal text-muted-foreground">
                  {quiz.questions.length} questions
                </p>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Test your knowledge with this interactive quiz
          </DialogDescription>
        </DialogHeader>
        
        {/* Content area with proper scrolling */}
        <div className="max-h-[calc(85vh-80px)] overflow-y-auto overflow-x-hidden">
          {isGeneratingQuiz ? (
            <div className="flex h-[400px] flex-col items-center justify-center gap-6 p-8">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-white/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Generating Quiz...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creating intelligent questions from your presentation
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Powered by AI</span>
              </div>
            </div>
          ) : quiz ? (
            <QuizView onClose={() => setIsQuizModalOpen(false)} />
          ) : (
            <div className="flex h-[400px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
                <Brain className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="mt-6 text-lg font-medium">No Quiz Available</p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Click the &quot;Quiz&quot; button in the toolbar to generate questions from your presentation.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
