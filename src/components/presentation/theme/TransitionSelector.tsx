"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { usePresentationState } from "@/states/presentation-state";
import { cn } from "@/lib/utils";
import {
  getAvailableTransitions,
  type SlideTransitionType,
} from "@/lib/presentation/animations";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// Group transitions by category for better UX
const transitionCategories: Record<string, { label: string; description: string }> = {
  Basic: {
    label: "Basic",
    description: "Simple, clean transitions",
  },
  Zoom: {
    label: "Zoom",
    description: "Scale-based transitions",
  },
  "3D Effects": {
    label: "3D Effects",
    description: "Perspective transforms",
  },
  Reveal: {
    label: "Reveal",
    description: "Dramatic reveal effects",
  },
  Luxury: {
    label: "Luxury",
    description: "Premium, refined transitions",
  },
  "Push & Cover": {
    label: "Push & Cover",
    description: "Directional movements",
  },
};

interface TransitionItemProps {
  transition: {
    id: SlideTransitionType;
    name: string;
    category: string;
  };
  isSelected: boolean;
  onSelect: (type: SlideTransitionType) => void;
}

function TransitionItem({
  transition,
  isSelected,
  onSelect,
}: TransitionItemProps) {
  return (
    <button
      onClick={() => onSelect(transition.id)}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-white/10 text-white"
      )}
    >
      <span className="font-medium">{transition.name}</span>
      {isSelected && <Check className="h-4 w-4" />}
    </button>
  );
}

export function TransitionSelector() {
  const { slideTransition, setSlideTransition } = usePresentationState();
  const [isOpen, setIsOpen] = useState(false);

  const allTransitions = getAvailableTransitions();

  // Group transitions by category
  const groupedTransitions = allTransitions.reduce(
    (acc, transition) => {
      const category = transition.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(transition);
      return acc;
    },
    {} as Record<
      string,
      Array<{ id: SlideTransitionType; name: string; category: string }>
    >
  );

  const handleSelect = (type: SlideTransitionType) => {
    setSlideTransition(type);
    setIsOpen(false);
  };

  // Find current transition label
  const currentTransition = allTransitions.find(
    (t) => t.id === slideTransition
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <Sparkles className="mr-1 h-4 w-4" />
          Transitions
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h4 className="font-medium">Slide Transitions</h4>
          <p className="text-xs text-muted-foreground">
            Choose transition effect between slides
          </p>
        </div>
        <ScrollArea className="h-80">
          <div className="p-2">
            {Object.entries(transitionCategories).map(([category, info]) => {
              const transitions = groupedTransitions[category];
              if (!transitions?.length) return null;

              return (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="mb-1 px-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {info.label}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {transitions.map((transition) => (
                      <TransitionItem
                        key={transition.id}
                        transition={transition}
                        isSelected={slideTransition === transition.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="border-t bg-muted/50 px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Current:{" "}
            <span className="font-medium text-foreground">
              {currentTransition?.name ?? "Luxury"}
            </span>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
