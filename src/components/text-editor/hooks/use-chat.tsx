"use client";

import { useChat as useBaseChat } from "@ai-sdk/react";

export const useChat = () => {
  return useBaseChat({
    id: "editor",
    api: "/api/ai/command",
  });
};
