"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { 
  Plus, 
  Search, 
  FileText, 
  Clock,
  ChevronRight,
  Menu,
  X,
  Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePresentationState } from "@/states/presentation-state";
import { useRouter } from "next/navigation";
import { PresentationItem } from "../PresentationItem";
import { fetchPresentations } from "@/app/_actions/presentation/fetchPresentations";
import { type Prisma } from "@prisma/client";
import { UserAvatar, getInitials } from "@/components/auth/Dropdown";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Brain } from "@/components/ui/icons";

type PresentationDocument = Prisma.BaseDocumentGetPayload<{
  include: {
    presentation: true;
  };
}>;

interface PresentationResponse {
  items: PresentationDocument[];
  hasMore: boolean;
}

export function ChatGPTSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { ref: loadMoreRef, inView } = useInView();
  const { setIsSheetOpen } = usePresentationState();
  const session = useSession();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<PresentationResponse>({
    queryKey: ["presentations-all"],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetchPresentations(pageParam as number);
      return response as PresentationResponse;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: PresentationResponse, allPages) => {
      if (lastPage?.hasMore) {
        return allPages.length;
      }
      return undefined;
    },
  });

  const allPresentations = data?.pages.flatMap((page) => page.items) ?? [];
  
  // Filter presentations based on search query
  const filteredPresentations = searchQuery
    ? allPresentations.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPresentations;

  const handleCreateNew = () => {
    setIsSheetOpen(false);
    router.push("/presentation");
  };

  const handlePresentationClick = (id: string) => {
    router.push(`/presentation/${id}`);
  };

  if (!isOpen) {
    return (
      <div className="flex h-screen w-16 flex-col items-center border-r border-white/10 bg-[#171717] py-3">
        {/* Logo/App Icon at Top */}
        <button
          onClick={() => setIsOpen(true)}
          className="mb-4 p-2.5 hover:bg-white/10 rounded-md transition-colors"
          aria-label="Open sidebar"
        >
          <Brain className="h-5 w-5 text-white" />
        </button>

        {/* Icons Stack - Evenly Spaced */}
        <div className="flex flex-col gap-3 flex-1">
          <button
            onClick={handleCreateNew}
            className="p-2.5 hover:bg-white/10 rounded-md transition-colors"
            aria-label="New presentation"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="p-2.5 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-white" />
          </button>
          <button
            className="p-2.5 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Images"
          >
            <ImageIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* User Avatar at Bottom */}
        {session.data?.user && (
          <div className="mt-auto mb-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.data.user.image ?? ""} />
              <AvatarFallback className="bg-white/10 text-white text-sm">
                {getInitials(session.data.user.name ?? "")}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-[260px] flex-col border-r border-border bg-[#171717] text-gray-100">
      {/* Header with menu button */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New Presentation Button */}
      <div className="p-3 border-b border-border">
        <Button
          onClick={handleCreateNew}
          className="w-full bg-transparent hover:bg-white/10 border border-white/20 text-white justify-start gap-2 h-9"
        >
          <Plus className="h-4 w-4" />
          New presentation
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 bg-white/5 border-white/10 text-white placeholder:text-gray-400 pl-8 focus-visible:ring-white/20"
          />
        </div>
      </div>

      {/* Your Presentations Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Your presentations
        </div>
        <ScrollArea className="flex-1">
          <div className="px-1.5">
            {isLoading ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md bg-white/5" />
                ))}
              </div>
            ) : filteredPresentations.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-gray-400">
                {searchQuery ? "No presentations found" : "No presentations yet"}
              </div>
            ) : (
              <>
                {filteredPresentations.map((presentation) => (
                  <button
                    key={presentation.id}
                    onClick={() => handlePresentationClick(presentation.id)}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-white/10 text-sm text-gray-200 transition-colors group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span 
                        className="truncate text-ellipsis overflow-hidden block max-w-[180px]" 
                        title={presentation.title}
                      >
                        {presentation.title}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="py-4 text-center">
                    {isFetchingNextPage && (
                      <Skeleton className="h-8 w-8 rounded-full mx-auto bg-white/5" />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* User Profile at Bottom */}
      <div className="border-t border-border p-3">
        {session.data?.user ? (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.data.user.image ?? ""} />
              <AvatarFallback className="bg-white/10 text-white text-xs">
                {getInitials(session.data.user.name ?? "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate text-ellipsis overflow-hidden" title={session.data.user.name ?? ""}>
                {session.data.user.name}
              </p>
              <p className="text-xs text-gray-400 truncate text-ellipsis overflow-hidden" title={session.data.user.email ?? ""}>
                {session.data.user.email && session.data.user.email.length > 25
                  ? `${session.data.user.email.substring(0, 25)}...`
                  : session.data.user.email}
              </p>
            </div>
          </div>
        ) : (
          <Skeleton className="h-12 w-full bg-white/5" />
        )}
      </div>
    </div>
  );
}
