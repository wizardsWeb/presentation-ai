/**
 * Animation Configuration for Presentation Components
 *
 * This file defines animation variants and configurations for each component type
 * to bring presentations to life with meaningful, semantic animations.
 */

import { type Variants, type Transition, type TargetAndTransition } from "framer-motion";
import { type ThemeName } from "./themes";

// ============================================================================
// ANIMATION INTENSITY BY THEME
// ============================================================================

/**
 * Each theme has an associated animation intensity:
 * - subtle: Fast, professional (business themes)
 * - medium: Balanced, versatile (general themes)
 * - playful: Bouncy, creative (creative themes)
 */
export type AnimationIntensity = "subtle" | "medium" | "playful";

export const themeAnimationIntensity: Record<ThemeName, AnimationIntensity> = {
  daktilo: "medium",
  cornflower: "subtle",
  orbit: "playful",
  piano: "subtle",
  mystique: "medium",
  gammaDark: "subtle",
  crimson: "medium",
  sunset: "playful",
  forest: "medium",
};

// ============================================================================
// TRANSITION PRESETS BY INTENSITY
// ============================================================================

export const transitionPresets: Record<AnimationIntensity, {
  default: Transition;
  stagger: number;
  spring: Transition;
}> = {
  subtle: {
    default: { duration: 0.25, ease: "easeOut" },
    stagger: 0.08,
    spring: { type: "spring", stiffness: 400, damping: 30 },
  },
  medium: {
    default: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
    stagger: 0.1,
    spring: { type: "spring", stiffness: 300, damping: 25 },
  },
  playful: {
    default: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
    stagger: 0.12,
    spring: { type: "spring", stiffness: 200, damping: 15, mass: 0.8 },
  },
};

// ============================================================================
// COMPONENT ANIMATION VARIANTS
// ============================================================================

/**
 * Get animation variants for a specific intensity level
 */
export function getAnimationVariants(intensity: AnimationIntensity = "medium") {
  const presets = transitionPresets[intensity];

  return {
    // -------------------------------------------------------------------------
    // CONTAINER VARIANTS (for parent elements that orchestrate stagger)
    // -------------------------------------------------------------------------
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger,
          delayChildren: 0.1,
        },
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // BULLETS - Staggered fade from left with numbered badge pop
    // -------------------------------------------------------------------------
    bulletContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger,
          delayChildren: 0.15,
        },
      },
    } satisfies Variants,

    bulletItem: {
      hidden: {
        opacity: 0,
        x: -30,
        scale: 0.95,
      },
      visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: presets.default,
      },
    } satisfies Variants,

    bulletBadge: {
      hidden: {
        scale: 0,
        rotate: -180,
      },
      visible: {
        scale: 1,
        rotate: 0,
        transition: presets.spring,
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // ICONS - Pop-in with subtle bounce effect
    // -------------------------------------------------------------------------
    iconsContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger * 1.2,
          delayChildren: 0.1,
        },
      },
    } satisfies Variants,

    iconItem: {
      hidden: {
        opacity: 0,
        scale: 0.5,
        y: 20,
      },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: presets.spring,
      },
    } satisfies Variants,

    iconSymbol: {
      hidden: {
        scale: 0,
        rotate: -45,
      },
      visible: {
        scale: 1,
        rotate: 0,
        transition: {
          ...presets.spring,
          delay: 0.1,
        },
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // CYCLE - Circular reveal with rotating center wheel
    // -------------------------------------------------------------------------
    cycleContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger * 1.5,
          delayChildren: 0.3, // Wait for wheel animation
        },
      },
    } satisfies Variants,

    cycleWheel: {
      hidden: {
        scale: 0,
        rotate: -180,
        opacity: 0,
      },
      visible: {
        scale: 1,
        rotate: 0,
        opacity: 1,
        transition: {
          ...presets.spring,
          duration: 0.6,
        },
      },
    } satisfies Variants,

    cycleItem: {
      hidden: {
        opacity: 0,
        scale: 0.8,
      },
      visible: {
        opacity: 1,
        scale: 1,
        transition: presets.default,
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // STAIRCASE - Step-by-step ascending reveal
    // -------------------------------------------------------------------------
    staircaseContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger * 1.3,
          delayChildren: 0.1,
        },
      },
    } satisfies Variants,

    stairItem: {
      hidden: {
        opacity: 0,
        x: -50,
        y: 30,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: presets.default,
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // TIMELINE - Sequential reveal along timeline
    // -------------------------------------------------------------------------
    timelineContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger * 1.5,
          delayChildren: 0.2,
        },
      },
    } satisfies Variants,

    timelineLine: {
      hidden: {
        scaleX: 0,
        originX: 0,
      },
      visible: {
        scaleX: 1,
        transition: {
          duration: 0.5,
          ease: "easeOut",
        },
      },
    } satisfies Variants,

    timelineItem: {
      hidden: {
        opacity: 0,
        y: 30,
        scale: 0.9,
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: presets.default,
      },
    } satisfies Variants,

    timelineDot: {
      hidden: {
        scale: 0,
      },
      visible: {
        scale: 1,
        transition: presets.spring,
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // PYRAMID - Bottom to top build animation
    // -------------------------------------------------------------------------
    pyramidContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger * 1.2,
          staggerDirection: -1, // Reverse order (bottom to top)
          delayChildren: 0.1,
        },
      },
    } satisfies Variants,

    pyramidItem: {
      hidden: {
        opacity: 0,
        y: 40,
        scaleX: 0.8,
      },
      visible: {
        opacity: 1,
        y: 0,
        scaleX: 1,
        transition: presets.default,
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // ARROWS - Flow animation
    // -------------------------------------------------------------------------
    arrowsContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger,
          delayChildren: 0.1,
        },
      },
    } satisfies Variants,

    arrowItem: {
      hidden: {
        opacity: 0,
        x: -30,
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: presets.default,
      },
    } satisfies Variants,

    arrowConnector: {
      hidden: {
        scaleX: 0,
        originX: 0,
      },
      visible: {
        scaleX: 1,
        transition: {
          duration: 0.3,
          ease: "easeOut",
        },
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // COLUMNS - Simultaneous fade up
    // -------------------------------------------------------------------------
    columnsContainer: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          when: "beforeChildren",
          staggerChildren: presets.stagger * 0.8,
          delayChildren: 0.1,
        },
      },
    } satisfies Variants,

    columnItem: {
      hidden: {
        opacity: 0,
        y: 40,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: presets.default,
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // SLIDE TRANSITIONS - Premium Collection
    // -------------------------------------------------------------------------
    
    // Classic slide from right
    slideEnter: {
      hidden: {
        opacity: 0,
        x: 100,
      },
      visible: {
        opacity: 1,
        x: 0,
        transition: presets.default,
      },
      exit: {
        opacity: 0,
        x: -100,
        transition: { duration: 0.2 },
      },
    } satisfies Variants,

    // Simple fade
    slideFade: {
      hidden: {
        opacity: 0,
      },
      visible: {
        opacity: 1,
        transition: { duration: 0.3 },
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.2 },
      },
    } satisfies Variants,

    // -------------------------------------------------------------------------
    // GENERIC / UTILITY VARIANTS
    // -------------------------------------------------------------------------
    fadeIn: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: presets.default,
      },
    } satisfies Variants,

    fadeUp: {
      hidden: {
        opacity: 0,
        y: 20,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: presets.default,
      },
    } satisfies Variants,

    scaleIn: {
      hidden: {
        opacity: 0,
        scale: 0.9,
      },
      visible: {
        opacity: 1,
        scale: 1,
        transition: presets.spring,
      },
    } satisfies Variants,

    popIn: {
      hidden: {
        opacity: 0,
        scale: 0,
      },
      visible: {
        opacity: 1,
        scale: 1,
        transition: presets.spring,
      },
    } satisfies Variants,
  };
}

// Default variants (medium intensity)
export const animationVariants = getAnimationVariants("medium");

// ============================================================================
// HELPER HOOKS & UTILITIES
// ============================================================================

/**
 * Get animation variants based on theme
 */
export function getThemeAnimationVariants(themeName: ThemeName) {
  const intensity = themeAnimationIntensity[themeName];
  return getAnimationVariants(intensity);
}

/**
 * Animation delay calculator for staggered items
 */
export function getStaggerDelay(index: number, intensity: AnimationIntensity = "medium"): number {
  return index * transitionPresets[intensity].stagger;
}

/**
 * Check if animations should be reduced (for accessibility)
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get reduced motion variants (instant transitions)
 */
export function getReducedMotionVariants(): {
  hidden: { opacity: number };
  visible: { opacity: number };
} {
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };
}

// ============================================================================
// PREMIUM SLIDE TRANSITIONS
// ============================================================================

export type SlideTransitionType = 
  | "fade"
  | "slide"
  | "slideUp"
  | "slideDown"
  | "zoom"
  | "zoomRotate"
  | "flip"
  | "cube"
  | "reveal"
  | "blur"
  | "morph"
  | "glide"
  | "push"
  | "cover"
  | "uncover"
  | "split"
  | "blinds"
  | "curtain"
  | "dissolve"
  | "luxury";

/**
 * Slide transition variant type for proper Framer Motion compatibility
 */
export interface SlideTransitionVariant {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}

/**
 * Premium slide transition variants with luxury effects
 * All transitions optimized for smoothness and ease on the eyes:
 * - Longer durations (0.7-1.2s) for graceful movement
 * - Gentle easing curves for natural feel
 * - Subtle movements to avoid jarring effects
 * - Soft opacity fades for seamless blending
 */
export const slideTransitions: Record<SlideTransitionType, SlideTransitionVariant> = {
  // -------------------------------------------------------------------------
  // BASIC TRANSITIONS - Smooth and elegant
  // -------------------------------------------------------------------------
  
  fade: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    },
  },

  slide: {
    initial: { x: "40%", opacity: 0 },
    animate: { 
      x: 0, 
      opacity: 1,
      transition: { 
        duration: 0.9, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.6 }
      }
    },
    exit: { 
      x: "-20%", 
      opacity: 0,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  slideUp: {
    initial: { y: "30%", opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: { 
        duration: 0.9, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.6 }
      }
    },
    exit: { 
      y: "-15%", 
      opacity: 0,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  slideDown: {
    initial: { y: "-30%", opacity: 0 },
    animate: { 
      y: 0, 
      opacity: 1,
      transition: { 
        duration: 0.9, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.6 }
      }
    },
    exit: { 
      y: "15%", 
      opacity: 0,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  // -------------------------------------------------------------------------
  // PREMIUM ZOOM TRANSITIONS - Gentle scaling
  // -------------------------------------------------------------------------
  
  zoom: {
    initial: { scale: 0.92, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.9, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.6 }
      }
    },
    exit: { 
      scale: 1.05, 
      opacity: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    },
  },

  zoomRotate: {
    initial: { scale: 0.9, rotate: -3, opacity: 0 },
    animate: { 
      scale: 1, 
      rotate: 0,
      opacity: 1,
      transition: { 
        duration: 1, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.7 }
      }
    },
    exit: { 
      scale: 0.95, 
      rotate: 2, 
      opacity: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    },
  },

  // -------------------------------------------------------------------------
  // 3D TRANSFORMS - Smooth perspective shifts
  // -------------------------------------------------------------------------
  
  flip: {
    initial: { 
      rotateY: 45, 
      opacity: 0,
      transformPerspective: 1500
    },
    animate: { 
      rotateY: 0, 
      opacity: 1,
      transformPerspective: 1500,
      transition: { 
        duration: 1, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.7 }
      }
    },
    exit: { 
      rotateY: -30, 
      opacity: 0,
      transformPerspective: 1500,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  cube: {
    initial: { 
      rotateY: -45, 
      x: "25%",
      opacity: 0,
      transformPerspective: 1500,
      transformOrigin: "left center"
    },
    animate: { 
      rotateY: 0, 
      x: 0,
      opacity: 1,
      transformPerspective: 1500,
      transformOrigin: "left center",
      transition: { 
        duration: 1.1, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.8 }
      }
    },
    exit: { 
      rotateY: 30, 
      x: "-15%",
      opacity: 0,
      transformPerspective: 1500,
      transformOrigin: "right center",
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    },
  },

  // -------------------------------------------------------------------------
  // REVEAL & MASK TRANSITIONS - Graceful reveals
  // -------------------------------------------------------------------------
  
  reveal: {
    initial: { 
      clipPath: "circle(0% at 50% 50%)",
      opacity: 0.5
    },
    animate: { 
      clipPath: "circle(150% at 50% 50%)",
      opacity: 1,
      transition: { 
        duration: 1.2, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.4 }
      }
    },
    exit: { 
      clipPath: "circle(0% at 50% 50%)",
      opacity: 0,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    },
  },

  curtain: {
    initial: { 
      clipPath: "inset(0 50% 0 50%)",
      opacity: 0.5
    },
    animate: { 
      clipPath: "inset(0 0% 0 0%)",
      opacity: 1,
      transition: { 
        duration: 1, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.5 }
      }
    },
    exit: { 
      clipPath: "inset(0 50% 0 50%)",
      opacity: 0,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  blinds: {
    initial: { 
      clipPath: "inset(0 0 100% 0)",
      opacity: 0.5
    },
    animate: { 
      clipPath: "inset(0 0 0% 0)",
      opacity: 1,
      transition: { 
        duration: 1, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.5 }
      }
    },
    exit: { 
      clipPath: "inset(100% 0 0 0)",
      opacity: 0,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  split: {
    initial: { 
      clipPath: "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)",
      opacity: 0.5
    },
    animate: { 
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      opacity: 1,
      transition: { 
        duration: 1.1, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.5 }
      }
    },
    exit: { 
      clipPath: "polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)",
      opacity: 0,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  // -------------------------------------------------------------------------
  // LUXURY EFFECTS - Ultra-smooth premium feel
  // -------------------------------------------------------------------------
  
  blur: {
    initial: { 
      opacity: 0, 
      filter: "blur(12px)",
      scale: 1.03
    },
    animate: { 
      opacity: 1, 
      filter: "blur(0px)",
      scale: 1,
      transition: { 
        duration: 1, 
        ease: [0.4, 0, 0.2, 1],
        filter: { duration: 0.8 }
      }
    },
    exit: { 
      opacity: 0, 
      filter: "blur(8px)",
      scale: 0.98,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    },
  },

  dissolve: {
    initial: { 
      opacity: 0,
      filter: "blur(6px) saturate(0.8)",
      scale: 1.01
    },
    animate: { 
      opacity: 1,
      filter: "blur(0px) saturate(1)",
      scale: 1,
      transition: { 
        duration: 1.2, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.9 }
      }
    },
    exit: { 
      opacity: 0,
      filter: "blur(4px) saturate(0.8)",
      scale: 0.99,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  morph: {
    initial: { 
      opacity: 0, 
      scale: 0.95,
      borderRadius: "16px",
      filter: "blur(6px)"
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      borderRadius: "0%",
      filter: "blur(0px)",
      transition: { 
        duration: 1, 
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 1.02,
      borderRadius: "8px",
      filter: "blur(4px)",
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    },
  },

  glide: {
    initial: { 
      x: 30, 
      opacity: 0,
      skewX: -2
    },
    animate: { 
      x: 0, 
      opacity: 1,
      skewX: 0,
      transition: { 
        duration: 1, 
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.7 }
      }
    },
    exit: { 
      x: -20, 
      opacity: 0,
      skewX: 1,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    },
  },

  // -------------------------------------------------------------------------
  // PUSH/COVER TRANSITIONS - Gentle directional movements
  // -------------------------------------------------------------------------
  
  push: {
    initial: { 
      x: "50%",
      opacity: 0.8,
      boxShadow: "-10px 0 30px rgba(0,0,0,0.15)"
    },
    animate: { 
      x: 0,
      opacity: 1,
      boxShadow: "0 0 0 rgba(0,0,0,0)",
      transition: { 
        duration: 0.9, 
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      x: "-20%",
      opacity: 0.5,
      boxShadow: "10px 0 20px rgba(0,0,0,0.1)",
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    },
  },

  cover: {
    initial: { 
      x: "50%",
      opacity: 0.8,
      zIndex: 10
    },
    animate: { 
      x: 0,
      opacity: 1,
      zIndex: 10,
      transition: { 
        duration: 0.9, 
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      x: 0,
      opacity: 0.5,
      zIndex: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
  },

  uncover: {
    initial: { 
      x: 0,
      opacity: 0.5,
      zIndex: 0
    },
    animate: { 
      x: 0,
      opacity: 1,
      zIndex: 10,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    },
    exit: { 
      x: "-50%",
      opacity: 0.8,
      zIndex: 10,
      transition: { 
        duration: 0.9, 
        ease: [0.4, 0, 0.2, 1]
      }
    },
  },

  // -------------------------------------------------------------------------
  // ULTIMATE LUXURY TRANSITION - Silky smooth elegance
  // -------------------------------------------------------------------------
  
  luxury: {
    initial: { 
      opacity: 0,
      scale: 0.96,
      y: 15,
      filter: "blur(8px) brightness(1.05)",
      transformPerspective: 1500
    },
    animate: { 
      opacity: 1,
      scale: 1,
      y: 0,
      filter: "blur(0px) brightness(1)",
      transformPerspective: 1500,
      transition: { 
        duration: 1.1,
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
        filter: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
        scale: { duration: 1, ease: [0.4, 0, 0.2, 1] },
        y: { duration: 1, ease: [0.4, 0, 0.2, 1] }
      }
    },
    exit: { 
      opacity: 0,
      scale: 1.02,
      y: -10,
      filter: "blur(6px) brightness(0.98)",
      transformPerspective: 1500,
      transition: { 
        duration: 0.7,
        ease: [0.4, 0, 0.2, 1]
      }
    },
  },
};

/**
 * Theme to default transition mapping for premium feel
 */
export const themeDefaultTransition: Record<ThemeName, SlideTransitionType> = {
  daktilo: "slide",
  cornflower: "fade",
  orbit: "zoomRotate",
  piano: "blur",
  mystique: "reveal",
  gammaDark: "luxury",
  crimson: "glide",
  sunset: "morph",
  forest: "dissolve",
};

/**
 * Get slide transition based on theme or explicit type
 */
export function getSlideTransition(
  transitionType?: SlideTransitionType,
  themeName?: ThemeName
): SlideTransitionVariant {
  if (transitionType) {
    return slideTransitions[transitionType];
  }
  if (themeName) {
    return slideTransitions[themeDefaultTransition[themeName]];
  }
  return slideTransitions.luxury;
}

/**
 * Get all available transition types for UI selection
 */
export function getAvailableTransitions(): { 
  id: SlideTransitionType; 
  name: string; 
  category: string;
}[] {
  return [
    // Basic
    { id: "fade", name: "Fade", category: "Basic" },
    { id: "slide", name: "Slide", category: "Basic" },
    { id: "slideUp", name: "Slide Up", category: "Basic" },
    { id: "slideDown", name: "Slide Down", category: "Basic" },
    // Zoom
    { id: "zoom", name: "Zoom", category: "Zoom" },
    { id: "zoomRotate", name: "Zoom & Rotate", category: "Zoom" },
    // 3D
    { id: "flip", name: "Flip", category: "3D Effects" },
    { id: "cube", name: "Cube", category: "3D Effects" },
    // Reveal
    { id: "reveal", name: "Circle Reveal", category: "Reveal" },
    { id: "curtain", name: "Curtain", category: "Reveal" },
    { id: "blinds", name: "Blinds", category: "Reveal" },
    { id: "split", name: "Split", category: "Reveal" },
    // Luxury
    { id: "blur", name: "Blur", category: "Luxury" },
    { id: "dissolve", name: "Dissolve", category: "Luxury" },
    { id: "morph", name: "Morph", category: "Luxury" },
    { id: "glide", name: "Glide", category: "Luxury" },
    { id: "luxury", name: "Premium", category: "Luxury" },
    // Push/Cover
    { id: "push", name: "Push", category: "Push & Cover" },
    { id: "cover", name: "Cover", category: "Push & Cover" },
    { id: "uncover", name: "Uncover", category: "Push & Cover" },
  ];
}
