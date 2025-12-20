"use client";

import { useState } from "react";
import { Download, FileDown, Image as ImageIcon, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePresentationState } from "@/states/presentation-state";
import { toast } from "sonner";

export function DownloadButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  
  const {
    slides,
    currentPresentationTitle,
    theme,
    customThemeData,
  } = usePresentationState();

  const handleExportPptx = async () => {
    if (slides.length === 0) {
      toast.error("No slides to export", {
        description: "Generate some slides first before exporting.",
      });
      return;
    }

    setIsExporting(true);
    setExportType("pptx");

    try {
      // Call the server-side API to generate PPTX
      const response = await fetch("/api/presentation/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slides,
          title: currentPresentationTitle ?? "Presentation",
          theme,
          customThemeData,
          isDarkMode: true, // Use dark theme to match website
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const result = (await response.json()) as { data: string; fileName: string };
      
      // Convert base64 to blob and download
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length) as number[];
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { 
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PowerPoint exported!", {
        description: "Your presentation has been downloaded as a PPTX file.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed", {
        description: "There was an error exporting your presentation. Please try again.",
      });
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportPdf = () => {
    if (slides.length === 0) {
      toast.error("No slides to export", {
        description: "Generate some slides first before exporting.",
      });
      return;
    }

    // Add a class to body to indicate print mode
    document.body.classList.add("printing");
    
    // Use browser print to PDF - the print CSS will handle hiding UI elements
    window.print();
    
    // Remove the class after a delay
    setTimeout(() => {
      document.body.classList.remove("printing");
    }, 1000);

    toast.info("Print dialog opened", {
      description: "Select 'Save as PDF' in the print dialog. UI elements will be hidden automatically.",
    });
  };

  const handleExportImages = () => {
    toast.info("Coming soon!", {
      description: "Image export will be available in a future update.",
    });
  };

  const isDisabled = isExporting || slides.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-white/20 text-white hover:bg-white/10"
          disabled={isDisabled}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Download</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Presentation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleExportPptx}
          disabled={isExporting}
          className="gap-2 cursor-pointer"
        >
          {exportType === "pptx" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          <div className="flex flex-col">
            <span>PowerPoint (.pptx)</span>
            <span className="text-xs text-muted-foreground">
              Full presentation with formatting
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleExportPdf}
          disabled={isExporting}
          className="gap-2 cursor-pointer"
        >
          {exportType === "pdf" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <div className="flex flex-col">
            <span>PDF Document</span>
            <span className="text-xs text-muted-foreground">
              Print-ready format
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleExportImages}
          disabled={isExporting}
          className="gap-2 cursor-pointer"
        >
          <ImageIcon className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Images (.png)</span>
            <span className="text-xs text-muted-foreground">
              Individual slide images
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
