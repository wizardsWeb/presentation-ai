"use client";

import React from "react";

import { withRef } from "@udecode/cn";
import { AIChatPlugin } from "@udecode/plate-ai/react";
import { useEditorPlugin } from "@udecode/plate-common/react";

import { ToolbarButton } from "./toolbar";

export const AIToolbarButton = withRef<typeof ToolbarButton>(
  ({ children, ...rest }, ref) => {
    try {
      const pluginResult = useEditorPlugin(AIChatPlugin);
      
      // Check if the plugin is available and has the aiChat API
      if (!pluginResult?.api?.aiChat?.show) {
        // Plugin is not configured, don't render the button
        console.log("AIChatPlugin not available:", {
          hasPluginResult: !!pluginResult,
          hasApi: !!pluginResult?.api,
          hasAiChat: !!pluginResult?.api?.aiChat,
          hasShow: !!pluginResult?.api?.aiChat?.show,
        });
        return null;
      }

      const { api } = pluginResult;

      return (
        <ToolbarButton
          ref={ref}
          {...rest}
          onClick={() => {
            api.aiChat.show();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          {children}
        </ToolbarButton>
      );
    } catch (error) {
      // Plugin is not available in this editor instance
      console.warn("AIChatPlugin error:", error);
      return null;
    }
  },
);
