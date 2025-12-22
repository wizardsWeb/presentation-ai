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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/255e23dc-8bb2-49a0-9f55-4824de3b4341',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'full-slide-image-element.tsx:17',message:'FullSlideImageElement rendering',data:{hasUrl:!!url,url:url?.substring(0,50)??'MISSING',elementType:element.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/255e23dc-8bb2-49a0-9f55-4824de3b4341',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'full-slide-image-element.tsx:33',message:'Rendering image element',data:{url:url.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return (
      <PlateElement ref={ref} className={cn(className, "w-full my-4")} element={element} {...props}>
        <div 
          className="relative w-full overflow-hidden rounded-xl bg-black/5 dark:bg-white/5"
          style={{ 
            paddingBottom: "56.25%", // 16:9 aspect ratio
          }}
        >
          <div className="absolute inset-0">
            <Image
              src={url}
              alt="Full slide image"
              fill
              className="object-contain rounded-lg"
              unoptimized
              priority
              onLoad={()=>{fetch('http://127.0.0.1:7242/ingest/255e23dc-8bb2-49a0-9f55-4824de3b4341',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'full-slide-image-element.tsx:onLoad',message:'Image loaded successfully',data:{url:url.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});}}
              onError={(e)=>{fetch('http://127.0.0.1:7242/ingest/255e23dc-8bb2-49a0-9f55-4824de3b4341',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'full-slide-image-element.tsx:onError',message:'Image failed to load',data:{url:url.substring(0,50),error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});}}
            />
          </div>
        </div>
        {children}
      </PlateElement>
    );
  }
);

