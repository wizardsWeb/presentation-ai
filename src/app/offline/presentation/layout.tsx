import React from "react";
// Removed PresentationGenerationManager and ChatGPTSidebar for offline mode
// These components have database dependencies

export default function OfflinePresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen flex-col supports-[(height:100dvh)]:h-[100dvh] bg-[#0f0f0f]">
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#0f0f0f]">
          <div className="sheet-container min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
