"use client";

import { createPlatePlugin } from "@udecode/plate-core/react";
import { FullSlideImageElement } from "./full-slide-image-element";

export const FullSlideImagePlugin = createPlatePlugin({
  key: "full-slide-image",
  node: {
    isElement: true,
    isVoid: true,
    component: FullSlideImageElement,
  },
});

