"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface UseVoiceInputOptions {
  language?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Custom hook for voice input using Web Speech API
 * Supports multiple languages based on the presentation language setting
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = "en-US",
    continuous = false, // Changed to false for better UX - single utterance mode
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const transcriptRef = useRef("");

  // Keep refs updated
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Check if Speech Recognition is supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  // Initialize speech recognition - only once
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
      transcriptRef.current = "";
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
      // Call onResult with final transcript when recognition ends
      if (transcriptRef.current) {
        onResultRef.current?.(transcriptRef.current);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      let errorMessage = "Voice recognition error";
      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "No microphone found. Please check your device.";
          break;
        case "not-allowed":
          errorMessage = "Microphone access denied. Please allow microphone access.";
          break;
        case "network":
          errorMessage = "Network error. Please check your connection.";
          break;
        case "aborted":
          // User aborted, no error message needed
          return;
        default:
          errorMessage = `Voice recognition error: ${event.error}`;
      }
      
      onErrorRef.current?.(errorMessage);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result?.[0]) {
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
      }

      if (finalTranscript) {
        transcriptRef.current = (transcriptRef.current + " " + finalTranscript).trim();
        setTranscript(transcriptRef.current);
      }
      
      setInterimTranscript(interim);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []); // Only initialize once

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  // Update continuous mode when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.continuous = continuous;
    }
  }, [continuous]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.("Voice recognition is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      // Re-initialize if needed
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        onErrorRef.current?.("Voice recognition is not supported in this browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      recognition.onstart = () => {
        setIsListening(true);
        transcriptRef.current = "";
      };

      recognition.onend = () => {
        setIsListening(false);
        if (transcriptRef.current) {
          onResultRef.current?.(transcriptRef.current);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "aborted") {
          onErrorRef.current?.(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result?.[0]) {
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interim += result[0].transcript;
            }
          }
        }

        if (finalTranscript) {
          transcriptRef.current = (transcriptRef.current + " " + finalTranscript).trim();
          setTranscript(transcriptRef.current);
        }
        
        setInterimTranscript(interim);
      };

      recognitionRef.current = recognition;
    }

    try {
      // Reset transcripts when starting new recording
      setTranscript("");
      setInterimTranscript("");
      transcriptRef.current = "";
      recognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      // Recognition might already be running, stop and retry
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      setTimeout(() => {
        try {
          setTranscript("");
          setInterimTranscript("");
          transcriptRef.current = "";
          recognitionRef.current?.start();
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          onErrorRef.current?.("Failed to start voice recognition. Please try again.");
        }
      }, 200);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
}
