"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { usePresentationState } from "@/states/presentation-state";
// Using offline presentation page instead of database-dependent one
import { OfflinePresentationGenerator } from "@/components/presentation/offline/OfflinePresentationGenerator";
import OfflinePresentationPageComponent from "@/components/presentation/offline/OfflinePresentationPage";

export default function OfflinePresentationPage() {
  const params = useParams();
  const id = params.id as string;
  const {
    setCurrentPresentation,
    presentationInput,
    isGeneratingPresentation,
    slides,
  } = usePresentationState();
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  
  // Use ref to prevent duplicate generation triggers
  const generationTriggeredRef = useRef(false);

  useEffect(() => {
    // Set the presentation ID from URL
    if (id?.startsWith("offline-")) {
      const title = presentationInput || "Untitled Presentation";
      setCurrentPresentation(id, title);
    }
  }, [id, presentationInput, setCurrentPresentation]);

  // Start generation if we have input and haven't started yet
  useEffect(() => {
    // Prevent duplicate triggers
    if (generationTriggeredRef.current) {
      return;
    }

    if (
      presentationInput?.trim() &&
      !hasStartedGeneration &&
      !isGeneratingPresentation &&
      slides.length === 0
    ) {
      generationTriggeredRef.current = true;
      setHasStartedGeneration(true);
    }
  }, [presentationInput, hasStartedGeneration, isGeneratingPresentation, slides.length]);

  // Show generator component while generating, otherwise show the presentation page
  if (hasStartedGeneration && (isGeneratingPresentation || slides.length === 0)) {
    return <OfflinePresentationGenerator presentationId={id} />;
  }

  // Once slides are generated, show the offline presentation page
  return <OfflinePresentationPageComponent />;
}
