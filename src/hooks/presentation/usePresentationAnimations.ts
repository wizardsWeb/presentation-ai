"use client";

import { useEffect, useState, useMemo } from "react";
import { usePresentationState } from "@/states/presentation-state";
import {
  getAnimationVariants,
  getThemeAnimationVariants,
  themeAnimationIntensity,
  getSlideTransition,
  themeDefaultTransition,
  type AnimationIntensity,
  type SlideTransitionType,
} from "@/lib/presentation/animations";
import type { ThemeName } from "@/lib/presentation/themes";

/**
 * Hook to get animation variants based on current theme and user preferences
 */
export function usePresentationAnimations() {
  const { theme, slideTransition } = usePresentationState();
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Get intensity based on theme
  const intensity: AnimationIntensity = theme
    ? themeAnimationIntensity[theme as ThemeName] ?? "medium"
    : "medium";

  // Get variants - always return full variants, handle reduced motion via animationProps
  const variants = useMemo(() => {
    return theme
      ? getThemeAnimationVariants(theme as ThemeName)
      : getAnimationVariants("medium");
  }, [theme]);

  // Get slide transition - use user selection, or theme default, or "luxury"
  const currentSlideTransition = useMemo(() => {
    if (slideTransition) return slideTransition;
    if (theme && themeDefaultTransition[theme as ThemeName]) {
      return themeDefaultTransition[theme as ThemeName];
    }
    return "luxury" as SlideTransitionType;
  }, [slideTransition, theme]);

  const slideTransitionVariants = useMemo(() => {
    return getSlideTransition(currentSlideTransition);
  }, [currentSlideTransition]);

  return {
    variants,
    intensity,
    reducedMotion,
    slideTransition: currentSlideTransition,
    slideTransitionVariants,
    // Animation props for motion components
    // When reduced motion is on, skip animation by not using initial/animate
    animationProps: reducedMotion
      ? { initial: false, animate: false }
      : { initial: "hidden", animate: "visible" },
  };
}

/**
 * Hook to create viewport-triggered animations
 * Animations only play when element comes into view
 */
export function useViewportAnimation() {
  const { animationProps, reducedMotion } = usePresentationAnimations();

  return {
    ...animationProps,
    whileInView: reducedMotion ? undefined : "visible",
    viewport: { once: true, margin: "-50px" },
  };
}
