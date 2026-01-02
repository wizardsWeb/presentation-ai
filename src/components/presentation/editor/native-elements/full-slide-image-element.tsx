"use client";

import React from "react";
import { cn, withRef } from "@udecode/cn";
import { type TElement } from "@udecode/plate-common";
import { PlateElement } from "@/components/text-editor/plate-ui/plate-element";
import Image from "next/image";

export interface FullSlideImageElement extends TElement {
  type: "full-slide-image";
  url: string;
}

export const FullSlideImageElement = withRef<typeof PlateElement>(
  ({ className, children, element, ...props }, ref) => {
    const fullSlideElement = element as FullSlideImageElement;
    const { url } = fullSlideElement;

    if (!url || url === "generating...") {
      return (
        <PlateElement ref={ref} className={cn(className, "my-4")} element={element} {...props}>
          <div className="w-full h-[60vh] flex items-center justify-center border-2 border-dashed border-muted rounded-lg bg-muted/20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Generating full slide image...</p>
            </div>
          </div>
          {children}
        </PlateElement>
      );
    }

    return (
      <PlateElement ref={ref} className={cn(className, "my-4")} element={element} {...props}>
        <div className="w-full relative">
          <Image
            src={url}
            alt="Full slide image"
            width={1920}
            height={1080}
            className="w-full h-auto rounded-lg shadow-lg border border-border"
            style={{ aspectRatio: "16/9" }}
            unoptimized // Nano banana images are already optimized
          />
        </div>
        {children}
      </PlateElement>
    );
  }
);

