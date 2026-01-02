import { useState, useCallback } from "react";
import { INDIAN_LANGUAGES, type LanguageCode } from "@/lib/bhashini/client";

// Re-export for convenience
export { INDIAN_LANGUAGES };
export type { LanguageCode };

interface UseBhashiniOptions {
  onError?: (error: string) => void;
}

interface SpeechToTextResult {
  text: string;
  language: LanguageCode;
}

interface TextToSpeechResult {
  audio: string; // Base64 encoded audio
  language: LanguageCode;
}

interface TranslationResult {
  translation: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

/**
 * React hook for Bhashini Indian language services
 * 
 * Provides:
 * - Speech to Text (ASR) for Indian languages
 * - Text to Speech (TTS) for Indian languages  
 * - Translation between Indian languages
 */
export function useBhashini(options: UseBhashiniOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
    options.onError?.(message);
  }, [options]);

  /**
   * Convert speech audio to text
   */
  const speechToText = useCallback(async (
    audioBase64: string,
    language: LanguageCode
  ): Promise<SpeechToTextResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/speech-to-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: audioBase64, language }),
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json() as { error?: string };
        throw new Error(data.error ?? "Failed to transcribe audio");
      }

      const data: { text: string } = await response.json() as { text: string };
      return { text: data.text, language };
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Speech recognition failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  /**
   * Convert text to speech audio
   */
  const textToSpeech = useCallback(async (
    text: string,
    language: LanguageCode,
    gender: "male" | "female" = "female"
  ): Promise<TextToSpeechResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, gender }),
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json() as { error?: string };
        throw new Error(data.error ?? "Failed to generate speech");
      }

      const data: { audio: string } = await response.json() as { audio: string };
      return { audio: data.audio, language };
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Speech synthesis failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  /**
   * Translate text between languages
   */
  const translate = useCallback(async (
    text: string,
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): Promise<TranslationResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json() as { error?: string };
        throw new Error(data.error ?? "Failed to translate");
      }

      const data: { translation: string } = await response.json() as { translation: string };
      return { 
        translation: data.translation, 
        sourceLanguage, 
        targetLanguage 
      };
    } catch (err) {
      handleError(err instanceof Error ? err.message : "Translation failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  /**
   * Play audio from base64 string
   */
  const playAudio = useCallback(async (audioBase64: string): Promise<void> => {
    try {
      const audioBlob = base64ToBlob(audioBase64, "audio/wav");
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error("Failed to play audio"));
        };
        void audio.play();
      });
    } catch (err) {
      handleError("Failed to play audio");
      throw err;
    }
  }, [handleError]);

  /**
   * Record audio from microphone and get base64
   */
  const recordAudio = useCallback(async (
    durationMs = 5000
  ): Promise<string | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      
      const chunks: Blob[] = [];
      
      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          const blob = new Blob(chunks, { type: "audio/webm" });
          const base64 = await blobToBase64(blob);
          resolve(base64);
        };

        mediaRecorder.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error("Recording failed"));
        };

        mediaRecorder.start();
        
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }, durationMs);
      });
    } catch (err) {
      handleError("Microphone access denied or unavailable");
      return null;
    }
  }, [handleError]);

  return {
    // State
    isLoading,
    error,
    
    // Methods
    speechToText,
    textToSpeech,
    translate,
    playAudio,
    recordAudio,
    
    // Helpers
    clearError: () => setError(null),
    languages: INDIAN_LANGUAGES,
  };
}

// Utility functions
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
