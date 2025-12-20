"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePresentationState } from "@/states/presentation-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trophy,
  Target,
  Sparkles,
} from "lucide-react";

// Difficulty badge colors
const difficultyColors = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// Option labels
const optionLabels = ["A", "B", "C", "D"];

interface QuizViewProps {
  onClose?: () => void;
}

export function QuizView({ onClose }: QuizViewProps) {
  const {
    quiz,
    answerQuizQuestion,
    nextQuizQuestion,
    previousQuizQuestion,
    submitQuiz,
    resetQuiz,
  } = usePresentationState();

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">No quiz available. Generate a quiz first.</p>
      </div>
    );
  }

  const currentQuestion = quiz.questions[quiz.currentQuestionIndex];
  const selectedAnswer = quiz.userAnswers[quiz.currentQuestionIndex];
  const progress = ((quiz.currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const allAnswered = quiz.userAnswers.every((a) => a !== null);

  // Results view
  if (quiz.showResults) {
    const percentage = Math.round((quiz.score / quiz.questions.length) * 100);
    const emoji = percentage >= 80 ? "🎉" : percentage >= 60 ? "👍" : percentage >= 40 ? "📚" : "💪";
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col"
      >
        {/* Results header - fixed */}
        <div className="flex flex-col items-center gap-4 border-b bg-gradient-to-b from-background to-muted/20 p-6 text-center">
          <div className="text-5xl">{emoji}</div>
          <div>
            <h2 className="text-2xl font-bold">Quiz Complete!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You scored {quiz.score} out of {quiz.questions.length}
            </p>
          </div>
          
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
            <Trophy className="h-4 w-4 text-white" />
            <span className="text-xl font-bold text-white">{percentage}%</span>
          </div>
        </div>

        {/* Question Review - scrollable */}
        <div className="max-h-[300px] overflow-y-auto p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Review Answers</h3>
          <div className="space-y-2">
            {quiz.questions.map((q, idx) => {
              const userAnswer = quiz.userAnswers[idx];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div
                  key={q.id}
                  className={cn(
                    "rounded-lg border p-3 text-sm transition-colors",
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                      : "border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight">{q.question}</p>
                      {!isCorrect && (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            Correct: {optionLabels[q.correctAnswer]}.
                          </span>{" "}
                          {q.options[q.correctAnswer]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions - fixed footer */}
        <div className="flex justify-center gap-3 border-t p-4">
          <Button variant="outline" size="sm" onClick={resetQuiz}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          {onClose && (
            <Button size="sm" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-white" />
            <span className="font-medium">
              Question {quiz.currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              difficultyColors[currentQuestion?.difficulty ?? "medium"]
            )}
          >
            {currentQuestion?.difficulty ?? "medium"}
          </span>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </div>

      {/* Question */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={quiz.currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xl font-semibold leading-relaxed">
              {currentQuestion?.question}
            </h3>

            {/* Options */}
            <div className="mt-6 space-y-3">
              {currentQuestion?.options.map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => answerQuizQuestion(quiz.currentQuestionIndex, idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all hover:border-white/50",
                      isSelected
                        ? "border-white bg-white/5 ring-1 ring-white"
                        : "border-muted hover:bg-muted/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        isSelected
                          ? "bg-white text-black"
                          : "bg-muted"
                      )}
                    >
                      {optionLabels[idx]}
                    </span>
                    <span className="flex-1">{option}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Sparkles className="h-4 w-4 text-white" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t p-4">
        <Button
          variant="outline"
          onClick={previousQuizQuestion}
          disabled={quiz.currentQuestionIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-1">
          {quiz.questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => usePresentationState.setState((s) => ({
                quiz: s.quiz ? { ...s.quiz, currentQuestionIndex: idx } : null
              }))}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                idx === quiz.currentQuestionIndex
                  ? "w-4 bg-white"
                  : quiz.userAnswers[idx] !== null
                  ? "bg-white/50"
                  : "bg-muted"
              )}
              aria-label={`Go to question ${idx + 1}`}
            />
          ))}
        </div>

        {quiz.currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button
            onClick={submitQuiz}
            disabled={!allAnswered}
            className="min-w-[100px]"
          >
            {allAnswered ? "Submit" : "Answer All"}
          </Button>
        ) : (
          <Button onClick={nextQuizQuestion}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
