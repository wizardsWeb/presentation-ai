"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePresentationState } from "@/states/presentation-state";
import { usePathname } from "next/navigation";

// Import our new components
import { ThemeSelector } from "../theme/ThemeSelector";
import { TransitionSelector } from "../theme/TransitionSelector";
import { ShareButton } from "./buttons/ShareButton";
import { PresentButton } from "./buttons/PresentButton";
import { DownloadButton } from "./buttons/DownloadButton";
import { SaveStatus } from "./buttons/SaveStatus";
import { QuizButton } from "./buttons/QuizButton";
import { QuizModal } from "../quiz/QuizModal";
import { Brain } from "@/components/ui/icons";
import SideBarDropdown from "@/components/auth/Dropdown";

interface PresentationHeaderProps {
  title?: string;
}

export default function PresentationHeader({ title }: PresentationHeaderProps) {
  const { currentPresentationTitle, isPresenting } = usePresentationState();
  const [presentationTitle, setPresentationTitle] =
    useState<string>("Presentation");
  const pathname = usePathname();

  // Check if we're on the generate/outline page
  const isPresentationPage = pathname?.includes("/presentation/");

  // Update title when it changes in the state
  useEffect(() => {
    if (currentPresentationTitle) {
      setPresentationTitle(currentPresentationTitle);
    } else if (title) {
      setPresentationTitle(title);
    }
  }, [currentPresentationTitle, title]);

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-white/10 bg-[#0f0f0f] px-4 no-print">
      {/* Left section with breadcrumb navigation */}
      <div className="flex items-center gap-2">
        <Link href="/presentation" className="text-gray-400 hover:text-white transition-colors">
          <Brain className="h-5 w-5"></Brain>
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-white">{presentationTitle}</span>
      </div>

      {/* Right section with actions */}
      <div className="flex items-center gap-2">
        {/* Save status indicator */}
        <SaveStatus />

        {/* Theme selector - Only in presentation page, not outline */}
        {isPresentationPage && <ThemeSelector />}

        {/* Transition selector - Only in presentation page, not outline */}
        {isPresentationPage && !isPresenting && <TransitionSelector />}

        {/* Quiz button - Only in presentation page, not outline */}
        {isPresentationPage && !isPresenting && <QuizButton />}

        {/* Download button - Only in presentation page, not outline */}
        {isPresentationPage && !isPresenting && <DownloadButton />}

        {/* Share button - Only in presentation page, not outline */}
        {isPresentationPage && !isPresenting && <ShareButton />}

        {/* Present button - Only in presentation page, not outline */}
        {isPresentationPage && <PresentButton />}

        {/* User profile dropdown - Keep this on all pages */}
        {!isPresenting && <SideBarDropdown />}
      </div>

      {/* Quiz Modal */}
      <QuizModal />
    </header>
  );
}
