"use client";

import { useState, useEffect } from "react";
import { usePresentationState } from "@/states/presentation-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronLeft } from "lucide-react";
import { extractSlideText } from "@/lib/presentation/extract-slide-text";

interface PresenterNote {
  summary: string;
  fullNotes: string;
}

export function PresenterNotes() {
  const { isSheetOpen, setIsSheetOpen, slides, language, currentPresentationTitle, currentPresentationId } =
    usePresentationState();
  const [notes, setNotes] = useState<PresenterNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset notes when slides change
  useEffect(() => {
    setNotes([]);
    setSelectedSlideIndex(null);
  }, [slides.length]);

  // Check if we're in offline mode (presentation ID starts with "offline-")
  const isOfflineMode = currentPresentationId?.startsWith("offline-") ?? false;

  // Load existing presenter notes from database when presentation loads
  useEffect(() => {
    // Skip API calls in offline mode
    if (isOfflineMode) return;
    
    if (currentPresentationId && slides.length > 0 && notes.length === 0 && !loading) {
      void loadExistingNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPresentationId, slides.length, isOfflineMode]);

  // Generate presenter notes when sheet opens (if not already loaded)
  useEffect(() => {
    // Skip API calls in offline mode
    if (isOfflineMode) return;
    
    if (isSheetOpen && slides.length > 0 && notes.length === 0 && !loading) {
      void generateNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSheetOpen, isOfflineMode]);

  const loadExistingNotes = async () => {
    // Skip in offline mode
    if (isOfflineMode) return false;
    
    if (!currentPresentationId || slides.length === 0) return false;

    try {
      const response = await fetch(`/api/presentation/presenter-notes?presentationId=${currentPresentationId}`);
      if (response.ok) {
        const data = (await response.json()) as { notes?: PresenterNote[] };
        if (data.notes && Array.isArray(data.notes) && data.notes.length === slides.length) {
          setNotes(data.notes);
          return true; // Notes loaded successfully
        }
      }
    } catch (err) {
      // Silently fail in offline mode
      if (!isOfflineMode) {
        console.error("Error loading existing presenter notes:", err);
      }
    }
    return false; // No existing notes found
  };

  const generateNotes = async () => {
    // Skip in offline mode
    if (isOfflineMode) {
      setError("Presenter notes are not available in offline mode.");
      return;
    }
    
    if (slides.length === 0) return;

    // First try to load existing notes
    const existingNotesLoaded = await loadExistingNotes();
    if (existingNotesLoaded) {
      return; // Notes already loaded from database
    }

    setLoading(true);
    setError(null);

    try {
      // Extract text from each slide
      const slideTexts = slides.map((slide, index) => ({
        content: extractSlideText(slide),
        slideNumber: index + 1,
      }));

      if (!currentPresentationId) {
        throw new Error("No presentation ID available");
      }

      const response = await fetch("/api/presentation/presenter-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationId: currentPresentationId,
          slides: slideTexts,
          language,
          presentationTitle: currentPresentationTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate presenter notes");
      }

      const data = (await response.json()) as { notes?: PresenterNote[] };
      setNotes(data.notes ?? []);
    } catch (err) {
      console.error("Error generating presenter notes:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate presenter notes. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSlideClick = (index: number) => {
    setSelectedSlideIndex(index);
  };

  const handleBackClick = () => {
    setSelectedSlideIndex(null);
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        container={
          typeof window === "undefined"
            ? undefined
            : typeof document !== "undefined"
            ? document.querySelector<HTMLElement>(".sheet-container") ??
              undefined
            : undefined
        }
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Presenter Notes
          </SheetTitle>
          <SheetDescription>
            AI-powered notes explaining why content is structured this way and
            how to present it effectively
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            // Loading skeletons
            <div className="space-y-4">
              {Array.from({ length: slides.length }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={generateNotes} variant="outline">
                Try Again
              </Button>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No presenter notes available.</p>
              <Button onClick={generateNotes} variant="outline">
                Generate Notes
              </Button>
            </div>
          ) : selectedSlideIndex !== null ? (
            // Detail View - Show selected slide's detailed notes
            <div className="space-y-4">
              {/* Back Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackClick}
                className="mb-4"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to All Slides
              </Button>

              {/* Slide Detail */}
              {notes[selectedSlideIndex] && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                      Slide {selectedSlideIndex + 1}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {notes[selectedSlideIndex].summary}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                      Detailed Notes
                    </h3>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {notes[selectedSlideIndex].fullNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // List View - Show all slide summaries
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-3 pr-4">
                {notes.map((note, index) => (
                  <div
                    key={`note-${index}`}
                    className="rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-sm cursor-pointer"
                    onClick={() => handleSlideClick(index)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Slide {index + 1}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {note.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
