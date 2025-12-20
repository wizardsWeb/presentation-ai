"use client";

import React from "react";
import { cn, withRef } from "@udecode/cn";
import { type TElement } from "@udecode/plate-common";
import { createPlatePlugin } from "@udecode/plate-core/react";
import { PlateElement } from "@/components/text-editor/plate-ui/plate-element";
import { motion } from "framer-motion";
import { usePresentationAnimations } from "@/hooks/presentation/usePresentationAnimations";
import { usePresentationState } from "@/states/presentation-state";
import { Play, ExternalLink } from "lucide-react";
import { YOUTUBE_ELEMENT } from "../lib";

export interface YouTubeElementType extends TElement {
  type: typeof YOUTUBE_ELEMENT;
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
}

/**
 * YouTube Video Embed Component
 * Renders a responsive YouTube video player with privacy-enhanced mode
 */
export const YouTubeElement = withRef<typeof PlateElement>(
  ({ element, children, className, ...props }, ref) => {
    const { variants, animationProps } = usePresentationAnimations();
    const { isPresenting } = usePresentationState();
    
    const youtubeElement = element as YouTubeElementType;
    const { videoId, title, channelTitle, thumbnail } = youtubeElement;

    // Generate URLs
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // Different render for presenting vs editing mode
    const [isPlaying, setIsPlaying] = React.useState(false);

    return (
      <PlateElement
        ref={ref}
        element={element}
        className={cn("my-4", className)}
        {...props}
      >
        <motion.div
          className={cn(
            "w-full",
            isPresenting && "flex flex-col items-center justify-center"
          )}
          variants={variants.fadeUp}
          {...animationProps}
        >
          {/* Video Container with 16:9 aspect ratio */}
          <div className={cn(
            "relative w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/5",
            isPresenting && "max-h-[60vh] max-w-[80vw]"
          )}>
            {/* Aspect ratio container */}
            <div 
              className="relative w-full" 
              style={{ 
                paddingBottom: isPresenting ? "min(56.25%, 50vh)" : "56.25%"
              }}
            >
              {isPlaying ? (
                // Embedded YouTube Player
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={embedUrl}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                // Thumbnail with play button overlay
                <div 
                  className="absolute inset-0 cursor-pointer group"
                  onClick={() => setIsPlaying(true)}
                >
                  {/* Thumbnail Image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl}
                    alt={title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/40" />
                  
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="h-10 w-10 fill-current pl-1" />
                    </motion.div>
                  </div>

                  {/* Video info overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <h3 className="text-lg font-semibold text-white line-clamp-2">
                      {title}
                    </h3>
                    {channelTitle && (
                      <p className="mt-1 text-sm text-white/80">
                        {channelTitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Video info bar (only in editor mode) */}
          {!isPresenting && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 items-center rounded bg-red-600 px-1.5 text-xs font-medium text-white">
                  YouTube
                </span>
                <span className="truncate max-w-[300px]">{title}</span>
              </span>
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-white hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Open on YouTube
              </a>
            </div>
          )}

          {/* Hidden children for Plate compatibility */}
          <div className="hidden">{children}</div>
        </motion.div>
      </PlateElement>
    );
  }
);

// Plugin for YouTube element
export const YouTubePlugin = createPlatePlugin({
  key: YOUTUBE_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    component: YouTubeElement,
  },
});
