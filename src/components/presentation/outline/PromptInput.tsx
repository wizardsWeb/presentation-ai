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
    <div className="relative">
      <input
        type="text"
        value={presentationInput}
        onChange={(e) => setPresentationInput(e.target.value)}
        className="w-full rounded-md bg-muted px-4 py-3 pr-24 text-foreground outline-none focus:ring-2 focus:ring-indigo-400"
        placeholder="Enter your topic or use the microphone..."
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
          className={`${
            isGeneratingOutline
              ? "text-indigo-400"
              : "text-indigo-400 hover:text-indigo-500"
          }`}
          onClick={handleGenerateOutline}
          disabled={isGeneratingOutline || !presentationInput.trim()}
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </div>
  );
}
