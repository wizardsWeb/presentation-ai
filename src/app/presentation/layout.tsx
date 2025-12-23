import React from "react";
import { PresentationGenerationManager } from "@/components/presentation/dashboard/PresentationGenerationManager";
import { ChatGPTSidebar } from "@/components/presentation/dashboard/ChatGPTSidebar";

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PresentationGenerationManager />
      <div className="flex h-screen w-screen flex-col supports-[(height:100dvh)]:h-[100dvh] bg-[#0f0f0f]">
        <div className="flex flex-1 overflow-hidden">
          <ChatGPTSidebar />
          <main className="flex-1 overflow-y-auto bg-[#0f0f0f]">
            <div className="sheet-container min-h-full">
            {children}
          </div>
        </main>
        </div>
      </div>
    </>
  );
}
