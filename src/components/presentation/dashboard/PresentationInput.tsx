import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { VoiceInputButton } from "@/components/ui/voice-input";
import { useCallback } from "react";

export function PresentationInput() {
  const { presentationInput, setPresentationInput, setShowTemplates, language } =
    usePresentationState();

  // Handle voice transcript - append to existing input
  const handleVoiceTranscript = useCallback((text: string) => {
    setPresentationInput(
      presentationInput ? `${presentationInput} ${text}` : text
    );
  }, [presentationInput, setPresentationInput]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          What would you like to present about?
        </label>
        <Button
          variant="outline"
          onClick={() => setShowTemplates(true)}
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Templates
        </Button>
      </div>
      <div className="relative">
        <textarea
          value={presentationInput}
          onChange={(e) => setPresentationInput(e.target.value)}
          placeholder="Describe your topic or paste your content here. Or use the microphone to speak your topic!"
          className="h-32 w-full rounded-xl border border-gray-200 bg-white p-4 pr-14 text-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-black dark:text-white"
        />
        {/* Voice input button positioned inside textarea */}
        <div className="absolute bottom-3 right-3">
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            language={language}
            size="md"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        💡 Tip: Click the microphone to speak your topic, e.g., &quot;Create slides on photosynthesis for Class 5&quot;
      </p>
    </div>
  );
}
