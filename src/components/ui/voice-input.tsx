"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Map language codes to speech recognition language codes
const getSpeechLanguage = (langCode: string): string => {
  const languageMap: Record<string, string> = {
    "en-US": "en-US",
    "en-GB": "en-GB",
    "en": "en-US",
    "hi": "hi-IN",
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "pt": "pt-BR",
    "zh": "zh-CN",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "ar": "ar-SA",
    "ru": "ru-RU",
    "it": "it-IT",
    "nl": "nl-NL",
    "pl": "pl-PL",
    "tr": "tr-TR",
    "vi": "vi-VN",
    "ta": "ta-IN",
    "te": "te-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
  };
  return languageMap[langCode] ?? "en-US";
};

export function VoiceInputButton({
  onTranscript,
  language = "en-US",
  disabled = false,
  className,
  size = "md",
}: VoiceInputButtonProps) {
  const speechLanguage = getSpeechLanguage(language);
  const onTranscriptRef = useRef(onTranscript);
  
  // Keep ref updated
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);
  
  const {
    isListening,
    isSupported,
    transcript: _transcript,
    interimTranscript: _interimTranscript,
    startListening,
    stopListening,
  } = useVoiceInput({
    language: speechLanguage,
    continuous: false, // Single utterance mode for better UX
    onResult: (text) => {
      // Called when recognition ends with final transcript
      console.log("Voice result received:", text);
      if (text) {
        onTranscriptRef.current(text);
        toast.success("Voice captured!", { duration: 1500 });
      }
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const handleClick = () => {
    if (isListening) {
      stopListening();
      toast.dismiss();
    } else {
      startListening();
      toast.info("Listening... Speak now", {
        duration: 3000,
        id: "voice-listening",
      });
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: { button: "h-8 w-8", icon: "h-4 w-4", pulse: "h-10 w-10" },
    md: { button: "h-10 w-10", icon: "h-5 w-5", pulse: "h-12 w-12" },
    lg: { button: "h-12 w-12", icon: "h-6 w-6", pulse: "h-14 w-14" },
  };

  const config = sizeConfig[size];

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled
              className={cn(config.button, "rounded-full opacity-50", className)}
            >
              <MicOff className={cn(config.icon, "text-muted-foreground")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voice input not supported in this browser</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {/* Animated pulse ring when listening */}
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className={cn(
                      "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/30",
                      config.pulse
                    )}
                  />
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.5,
                    }}
                    className={cn(
                      "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/40",
                      config.pulse
                    )}
                  />
                </>
              )}
            </AnimatePresence>

            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={handleClick}
              disabled={disabled}
              className={cn(
                config.button,
                "relative rounded-full transition-all",
                isListening && "animate-pulse bg-red-500 hover:bg-red-600",
                className
              )}
            >
              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.div
                    key="listening"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Mic className={cn(config.icon, "text-white")} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Mic className={config.icon} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isListening ? "Click to stop" : "Voice input"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline voice indicator showing what's being heard
interface VoiceTranscriptIndicatorProps {
  isListening: boolean;
  interimTranscript: string;
  className?: string;
}

export function VoiceTranscriptIndicator({
  isListening,
  interimTranscript,
  className,
}: VoiceTranscriptIndicatorProps) {
  if (!isListening || !interimTranscript) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        "flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300",
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="italic">&quot;{interimTranscript}&quot;</span>
    </motion.div>
  );
}
