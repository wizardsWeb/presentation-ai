"use client";

import { GripVertical, Plus, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { type PlateSlide, type SectionType } from "../utils/parser";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SlideEditPopover } from "./SlideEditPopover";
import { nanoid } from "nanoid";
import { PresentModeHeader } from "./PresentModeHeader";
import { motion } from "framer-motion";
import { usePresentationAnimations } from "@/hooks/presentation/usePresentationAnimations";
import { getSlideTransition } from "@/lib/presentation/animations";

// Section type configuration for badges - clean, minimal styling
const sectionConfig: Record<SectionType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  introduction: { label: "Introduction", color: "text-white dark:text-white", bgColor: "bg-white/10 dark:bg-white/10", borderColor: "border-white/20 dark:border-white/20" },
  content: { label: "Content", color: "text-slate-700 dark:text-slate-300", bgColor: "bg-slate-50 dark:bg-slate-900/40", borderColor: "border-slate-200 dark:border-slate-700" },
  example: { label: "Example", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50 dark:bg-emerald-950/40", borderColor: "border-emerald-200 dark:border-emerald-800" },
  activity: { label: "Activity", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50 dark:bg-amber-950/40", borderColor: "border-amber-200 dark:border-amber-800" },
  summary: { label: "Summary", color: "text-violet-700 dark:text-violet-300", bgColor: "bg-violet-50 dark:bg-violet-950/40", borderColor: "border-violet-200 dark:border-violet-800" },
  conclusion: { label: "Conclusion", color: "text-violet-700 dark:text-violet-300", bgColor: "bg-violet-50 dark:bg-violet-950/40", borderColor: "border-violet-200 dark:border-violet-800" },
};

interface SlideContainerProps {
  children: React.ReactNode;
  index: number;
  id: string;
  className?: string;
}

export function SlideContainer({
  children,
  index,
  id,
  className,
}: SlideContainerProps) {
  const {
    slides,
    setSlides,
    isPresenting,
    currentPresentationTitle,
    currentSlideIndex,
    shouldShowExitHeader,
    setCurrentSlideIndex,
    slideTransition,
  } = usePresentationState();

  const { reducedMotion } = usePresentationAnimations();
  
  // Get the premium slide transition based on user selection
  const _slideTransitionVariants = getSlideTransition(slideTransition);

  const currentSlide = slides[index];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const addNewSlide = (position: "before" | "after") => {
    const newSlide: PlateSlide = {
      content: [
        {
          type: "h1",
          children: [{ text: "New Slide" }],
        },
      ],
      id: nanoid(),
      alignment: "center",
    };

    const updatedSlides = [...slides];
    const insertIndex = position === "before" ? index : index + 1;
    updatedSlides.splice(insertIndex, 0, newSlide);
    setSlides(updatedSlides);
  };

  const deleteSlide = () => {
    const updatedSlides = [...slides];
    updatedSlides.splice(index, 1);
    setSlides(updatedSlides);
  };

  // Only show slide if it's the current one in presentation mode
  const shouldShow = !isPresenting || index === currentSlideIndex;
  if (!shouldShow) return null;

  return (
    <motion.div
      key={id}
      initial={isPresenting && !reducedMotion ? { opacity: 0 } : false}
      animate={isPresenting ? { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } } : "visible"}
      exit={isPresenting ? { opacity: 0, transition: { duration: 0.2 } } : undefined}
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/card-container relative z-10 grid w-full place-items-center pb-6",
        isDragging && "z-50 opacity-50",
        isPresenting && "fixed inset-0 overflow-hidden pb-0",
        index === currentSlideIndex && isPresenting && "z-[999]"
      )}
      {...attributes}
    >
      <PresentModeHeader
        presentationTitle={currentPresentationTitle}
        showHeader={isPresenting && shouldShowExitHeader}
      />
      <div
        className={cn(
          "relative w-full",
          !isPresenting && currentSlide?.width !== "M" && "max-w-5xl",
          !isPresenting && currentSlide?.width !== "L" && "max-w-6xl",
          isPresenting && "h-full w-full",
          className
        )}
      >
        {!isPresenting && (
          <div className="absolute left-4 top-2 z-[100] flex opacity-0 transition-opacity duration-200 group-hover/card-container:opacity-100 no-print">
            <Button
              variant="ghost"
              size="icon"
              className="!size-8 cursor-grab rounded-full"
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </Button>

            <SlideEditPopover index={index} />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="!size-8 rounded-full shadow-sm hover:text-destructive"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Slide</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete slide {index + 1}? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button variant="destructive" onClick={deleteSlide}>
                      Delete
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Section type badge - visible on hover in editor mode, completely hidden in presentation mode */}
        {!isPresenting && currentSlide?.sectionType && sectionConfig[currentSlide.sectionType] && (
          <div className="absolute right-4 top-2 z-[100] opacity-0 transition-all duration-200 group-hover/card-container:opacity-100">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm",
              sectionConfig[currentSlide.sectionType].bgColor,
              sectionConfig[currentSlide.sectionType].color,
              sectionConfig[currentSlide.sectionType].borderColor
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                currentSlide.sectionType === "introduction" && "bg-white text-black",
                currentSlide.sectionType === "content" && "bg-slate-500",
                currentSlide.sectionType === "example" && "bg-emerald-500",
                currentSlide.sectionType === "activity" && "bg-amber-500",
                (currentSlide.sectionType === "summary" || currentSlide.sectionType === "conclusion") && "bg-violet-500"
              )} />
              {sectionConfig[currentSlide.sectionType].label}
            </span>
          </div>
        )}

        {children}
      </div>

      {!isPresenting && (
        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover/card-container:opacity-100">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full bg-background shadow-md"
            onClick={() => addNewSlide("after")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isPresenting && (
        <div className="absolute bottom-0.5 left-1 right-1 z-[1001]">
          <div className="flex h-1.5 w-full gap-1">
            {slides.map((_, slideIndex) => (
              <button
                key={slideIndex}
                className={`h-full flex-1 rounded-full transition-all ${
                  slideIndex === currentSlideIndex
                    ? "bg-white text-black shadow-sm"
                    : "bg-white/20 hover:bg-white/40"
                }`}
                onClick={() => setCurrentSlideIndex(slideIndex)}
                aria-label={`Go to slide ${slideIndex + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
