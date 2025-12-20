import { RefreshCw } from "lucide-react";
import { usePresentationState } from "@/states/presentation-state";
import { toast } from "sonner";
import { VoiceInputButton } from "@/components/ui/voice-input";
import { useCallback } from "react";

export function PromptInput() {
  const {
    presentationInput,
    setPresentationInput,
    startOutlineGeneration,
    isGeneratingOutline,
    language,
  } = usePresentationState();

  // Handle voice transcript - append to existing input
  const handleVoiceTranscript = useCallback((text: string) => {
    setPresentationInput(
      presentationInput ? `${presentationInput} ${text}` : text
    );
  }, [presentationInput, setPresentationInput]);

  const handleGenerateOutline = () => {
    if (!presentationInput.trim()) {
      toast.error("Please enter a presentation topic");
      return;
    }

    startOutlineGeneration();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">Topic</label>
      <div className="relative">
        <input
          type="text"
          value={presentationInput}
          onChange={(e) => setPresentationInput(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3.5 pr-24 text-white placeholder:text-gray-400 outline-none transition-all focus:border-white/40 focus:bg-white/10 focus:ring-2 focus:ring-white/20"
          placeholder="Enter your presentation topic..."
          disabled={isGeneratingOutline}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            language={language}
            size="sm"
            disabled={isGeneratingOutline}
          />
          <button
            className={`rounded-md p-1.5 transition-colors ${
              isGeneratingOutline
                ? "text-gray-400 cursor-not-allowed"
                : "text-white hover:bg-white/10 hover:text-white"
            }`}
            onClick={handleGenerateOutline}
            disabled={isGeneratingOutline || !presentationInput.trim()}
            title="Regenerate outline"
          >
            <RefreshCw size={18} className={isGeneratingOutline ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
