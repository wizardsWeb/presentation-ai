"use client";

import { useEffect, useState, useRef } from "react";
import { usePresentationState } from "@/states/presentation-state";
import { Spinner } from "@/components/ui/spinner";
import { ThemeBackground } from "@/components/presentation/theme/ThemeBackground";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { type PlateSlide } from "@/components/presentation/utils/parser";

const LLAMA_API_URL = "http://localhost:5001/inference";

// Module-level flag to prevent duplicate generation across component instances
let isGeneratingGlobally = false;

interface SlideGenerationResult {
  success: boolean;
  slide: PlateSlide | null;
  error?: string;
}

export function OfflinePresentationGenerator({
  presentationId: _presentationId,
}: {
  presentationId: string;
}) {
  const {
    presentationInput,
    numSlides,
    language,
    teachingStyle,
    audienceType,
    setSlides,
    setIsGeneratingPresentation,
    setOutline,
  } = usePresentationState();

  const [currentSlideIndex] = useState(0);
  const [_generatedSlides] = useState<PlateSlide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Use ref to prevent duplicate generation calls
  const hasStartedGenerationRef = useRef(false);
  const isGeneratingRef = useRef(false);

  // Generate outline first, then generate slides
  useEffect(() => {
    // Prevent duplicate calls - check both local and global flags
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (hasStartedGenerationRef.current || isGeneratingRef.current || isGeneratingGlobally) {
      console.log("Skipping duplicate generation call", {
        hasStarted: hasStartedGenerationRef.current,
        isGenerating: isGeneratingRef.current,
        isGeneratingGlobally,
      });
      return;
    }

    if (!presentationInput?.trim()) {
      toast.error("No presentation topic provided");
      return;
    }

    // Mark as started immediately to prevent re-runs (both local and global)
    hasStartedGenerationRef.current = true;
    isGeneratingRef.current = true;
    isGeneratingGlobally = true;

    const generatePresentation = async () => {
      setIsGenerating(true);
      setIsGeneratingPresentation(true);

      try {
        // Step 1: Generate outline using llama API
        toast.info("Generating presentation outline...");
        const outline = await generateOutline(presentationInput, numSlides, language);

        if (!outline || outline.length === 0) {
          throw new Error("Failed to generate outline");
        }

        setOutline(outline);
        toast.success(`Generated ${outline.length} slide topics`);

        // Step 2: Generate slides in parallel
        toast.info("Generating slides...");
        const slides = await generateSlidesParallel(
          outline,
          presentationInput,
          language,
          teachingStyle ?? "concept-first",
          audienceType ?? "professional",
          setSlides
        );

        if (slides.length === 0) {
          throw new Error("Failed to generate slides");
        }

        // setSlides is already called in generateSlidesParallel, so we don't need to call it again
        // Just mark generation as complete
        setIsGeneratingPresentation(false);
        toast.success("Presentation generated successfully!");
      } catch (error) {
        console.error("Error generating presentation:", error);
        
        // Provide user-friendly error messages
        let errorMessage = "Failed to generate presentation";
        if (error instanceof Error) {
          if (error.message.includes("network") || error.message.includes("fetch")) {
            errorMessage = "Network error: Unable to connect to the AI service. Please check your connection and try again.";
          } else if (error.message.includes("timeout")) {
            errorMessage = "Request timed out. The AI service may be slow. Please try again.";
          } else if (error.message.includes("API error")) {
            errorMessage = "AI service error. Please check if the local AI service is running and try again.";
          } else {
            errorMessage = error.message;
          }
        }
        
        toast.error(errorMessage);
        setIsGeneratingPresentation(false);
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
        isGeneratingGlobally = false; // Reset global flag
      }
    };

    void generatePresentation();
    
    // Cleanup function to reset ref if component unmounts
    return () => {
      // Don't reset hasStartedGenerationRef here - we want to prevent re-runs
      isGeneratingRef.current = false;
      isGeneratingGlobally = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - using refs to prevent duplicates

  if (isGenerating) {
    return (
      <ThemeBackground>
        <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center">
          <div className="relative">
            <Spinner className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2 text-center mt-4">
            <h2 className="text-2xl font-bold text-white">
              {currentSlideIndex === 0
                ? "Generating Outline..."
                : `Generating Slide ${currentSlideIndex}/${numSlides}...`}
            </h2>
            <p className="text-muted-foreground">
              Using local AI model (offline mode)
            </p>
          </div>
        </div>
      </ThemeBackground>
    );
  }

  return null;
}

// Helper function to convert language code to language name
function getLanguageName(langCode: string): string {
  const languageMap: Record<string, string> = {
    "en-US": "English",
    "en-GB": "English",
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "ru": "Russian",
    "it": "Italian",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "ta": "Tamil",
    "te": "Telugu",
    "mr": "Marathi",
    "bn": "Bengali",
  };
  return languageMap[langCode] ?? langCode;
}

async function generateOutline(
  topic: string,
  numSlides: number,
  language: string
): Promise<string[]> {
  const languageName = getLanguageName(language);
  
  const prompt = `Create a detailed outline for a presentation about "${topic}". 
Generate exactly ${numSlides} distinct slide topics. Each topic should be:
- A clear, concise title for ONE slide only
- Focused on a specific aspect of "${topic}"
- Different from the other topics
- Suitable for a single slide (not multiple slides)

IMPORTANT LANGUAGE REQUIREMENT:
- Write ALL content in ${languageName} language only
- All slide topics must be in ${languageName}
- Do not mix languages

Format your response as a numbered list, one topic per line.
Example format:
1. First Topic
2. Second Topic
3. Third Topic

Do not include any other text, just the numbered list of ${numSlides} topics in ${languageName}.`;

  try {
    const response = await fetch(LLAMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instruction: prompt,
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json() as { success?: boolean; response?: string; error?: string };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!data.success || !data.response) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(data.error ?? "Failed to generate outline");
    }

    // Validate response for safety - check if model is uncertain
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const responseText = String(data.response).trim();
    
    // Additional safety check: ensure response is not empty
    if (!responseText || responseText.length === 0) {
      console.warn(`Empty outline response for topic "${topic}", using fallback outline`);
      return Array.from({ length: numSlides }, (_, i) => {
        if (i === 0) return `Introduction to ${topic}`;
        if (i === numSlides - 1) return `Conclusion: ${topic}`;
        return `${topic} - Part ${i + 1}`;
      });
    }
    
    // Validate response safety
    const isUncertain = validateResponseSafety(responseText, topic);
    
    if (isUncertain) {
      // Return a simple fallback outline
      console.warn(`Model uncertain about topic "${topic}", using fallback outline`);
      return Array.from({ length: numSlides }, (_, i) => {
        if (i === 0) return `Introduction to ${topic}`;
        if (i === numSlides - 1) return `Conclusion: ${topic}`;
        return `${topic} - Part ${i + 1}`;
      });
    }

    // Parse the response into an array of topics
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-member-access
    const lines = responseText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    // Extract topics (remove numbers and bullets)
    const topics = lines
      .map((line: string) => {
        // Remove leading numbers, bullets, dashes
        return line
          .replace(/^\d+[\.\)]\s*/, "")
          .replace(/^[-•*]\s*/, "")
          .trim();
      })
      .filter((topic: string) => topic.length > 0);

    return topics.slice(0, numSlides);
  } catch (error) {
    console.error("Error generating outline:", error);
    // Fallback: create simple outline from topic
    return Array.from({ length: numSlides }, (_, i) => {
      if (i === 0) return `Introduction to ${topic}`;
      if (i === numSlides - 1) return `Conclusion: ${topic}`;
      return `${topic} - Part ${i + 1}`;
    });
  }
}

async function generateSlidesParallel(
  outline: string[],
  title: string,
  language: string,
  teachingStyle: string,
  audienceType: string,
  setSlides: (slides: PlateSlide[]) => void
): Promise<PlateSlide[]> {
  // Create placeholder slides first
  const placeholderSlides: PlateSlide[] = outline.map((topic, _index) => ({
    id: nanoid(),
    layoutType: "vertical" as const,
    isGenerating: true,
    content: [
      {
        id: nanoid(),
        type: "h1" as const,
        children: [{ text: topic }],
      },
      {
        id: nanoid(),
        type: "p" as const,
        children: [{ text: "Generating content..." }],
      },
    ],
  }));

  // Show placeholders immediately (only once)
  // This is safe because we only call this function once per generation
  setSlides(placeholderSlides);

  // Generate all slides in parallel - wait for all to complete before updating state
  // This prevents multiple state updates that could trigger re-renders and duplicate calls
  const slidePromises = outline.map(async (topic, index) => {
    return generateSingleSlide(
      topic,
      index,
      outline.length,
      title,
      language,
      teachingStyle,
      audienceType
    );
  });

  // Wait for ALL slides to complete before updating state
  const results = await Promise.all(slidePromises);

  // Combine results into final slides
  const finalSlides: PlateSlide[] = results.map((result, index) => {
    if (result.success && result.slide) {
      return result.slide;
    }
    // Fallback to placeholder if generation failed
    return placeholderSlides[index]!;
  });

  // Update state ONCE with all completed slides
  // This prevents multiple re-renders that could trigger duplicate generation
  setSlides(finalSlides);

  return finalSlides;
}

async function generateSingleSlide(
  topic: string,
  index: number,
  total: number,
  title: string,
  language: string,
  teachingStyle: string,
  audienceType: string
): Promise<SlideGenerationResult> {
  const languageName = getLanguageName(language);
  
  const prompt = `You are creating content for ONLY ONE presentation slide.

Slide Topic: "${topic}"
This is slide ${index + 1} of ${total} slides in a presentation titled "${title}".

IMPORTANT LANGUAGE REQUIREMENT:
- Write ALL content in ${languageName} language only
- All headings, bullet points, and paragraphs must be in ${languageName}
- Do not mix languages
- Generate the entire slide content in ${languageName}

IMPORTANT: Generate content ONLY about "${topic}". Do NOT include content about other slides or topics. Focus exclusively on this single topic.

Teaching Style: ${teachingStyle}
Target Audience: ${audienceType}
Language: ${languageName}

Generate well-structured content about "${topic}" only in ${languageName}. Use the following format:
- Use "## " for main section headings (h2)
- Use "### " for sub-section headings (h3)
- Use "- " or "• " for bullet points
- Each bullet point should be on a new line
- Include 3-5 main points with supporting details about "${topic}"
- Use paragraphs for longer explanations when needed

Format your response using markdown:
- Headings: ## Heading or ### Subheading
- Bullet points: - Point 1
- Paragraphs: Regular text without markers

Remember: Only generate content about "${topic}". Do not mention other slides or topics.`;

  try {
    const response = await fetch(LLAMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instruction: prompt,
        max_tokens: 250,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json() as { success?: boolean; response?: string; error?: string };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!data.success || !data.response) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(data.error ?? "Failed to generate slide content");
    }

    // Validate response for safety - check if model is uncertain
    const responseText = data.response.trim();
    
    // Additional safety check: ensure response is not empty or just whitespace
    if (!responseText || responseText.length === 0) {
      console.warn(`Empty response for topic "${topic}"`);
      return {
        success: true,
        slide: {
          id: nanoid(),
          layoutType: "vertical" as const,
          isGenerating: false,
          content: [
            {
              id: nanoid(),
              type: "h1" as const,
              children: [{ text: topic }],
            },
            {
              id: nanoid(),
              type: "p" as const,
              children: [{ 
                text: "I don't have enough information about this topic to provide accurate content. Please provide more details or try a different topic." 
              }],
            },
          ],
        },
      };
    }
    
    // Validate response safety
    const isUncertain = validateResponseSafety(responseText, topic);
    
    if (isUncertain) {
      // Return a safe fallback slide that acknowledges uncertainty
      return {
        success: true,
        slide: {
          id: nanoid(),
          layoutType: "vertical" as const,
          isGenerating: false,
          content: [
            {
              id: nanoid(),
              type: "h1" as const,
              children: [{ text: topic }],
            },
            {
              id: nanoid(),
              type: "p" as const,
              children: [{ 
                text: "I don't have enough information about this topic to provide accurate content. Please provide more details or try a different topic." 
              }],
            },
          ],
        },
      };
    }

    // Parse the response into slide content
    const content = parseSlideContent(topic, responseText);

    const slide: PlateSlide = {
      id: nanoid(),
      layoutType: "vertical" as const,
      isGenerating: false,
      content,
    };

    return { success: true, slide };
  } catch (error) {
    console.error(`Error generating slide ${index + 1} for topic "${topic}":`, error);
    
    // Return a safe error slide instead of failing completely
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Check if it's a network/API error vs validation error
    const isNetworkError = errorMessage.includes("fetch") || 
                          errorMessage.includes("network") || 
                          errorMessage.includes("API error");
    
    return {
      success: false,
      slide: {
        id: nanoid(),
        layoutType: "vertical" as const,
        isGenerating: false,
        content: [
          {
            id: nanoid(),
            type: "h1" as const,
            children: [{ text: topic }],
          },
          {
            id: nanoid(),
            type: "p" as const,
            children: [{ 
              text: isNetworkError 
                ? "Unable to generate content due to a connection error. Please check your internet connection and try again."
                : `Unable to generate content for this topic. Error: ${errorMessage}`
            }],
          },
        ],
      },
      error: errorMessage,
    };
  }
}

/**
 * Validates if the model response indicates uncertainty or lack of knowledge
 * Safety validation disabled - always returns false to allow content generation
 */
function validateResponseSafety(_response: string, _topic: string): boolean {
  // Safety validation disabled - allow all content
  return false;
}

function parseSlideContent(topic: string, response: string): PlateSlide["content"] {
  const content: PlateSlide["content"] = [
    {
      id: nanoid(),
      type: "h1" as const,
      children: [{ text: topic }],
    },
  ];

  // Clean the response - remove any references to other slides
  let cleanedResponse = response;
  
  // Remove common patterns that indicate content from other slides
  // Remove lines that mention "slide X" where X is not the current topic
  const slideNumberPattern = /slide\s+\d+/gi;
  cleanedResponse = cleanedResponse.replace(slideNumberPattern, "");
  
  // Remove lines that start with "Next slide" or "Previous slide" or similar
  cleanedResponse = cleanedResponse.replace(/^(next|previous|other)\s+slide.*$/gim, "");
  
  // Limit content length - if response is too long, it might include multiple slides
  // Take only the first reasonable portion (first 2000 characters should be enough for one slide)
  if (cleanedResponse.length > 2000) {
    console.warn(`Response for topic "${topic}" is very long (${cleanedResponse.length} chars), truncating to prevent multi-slide content`);
    cleanedResponse = cleanedResponse.substring(0, 2000);
    // Try to end at a sentence boundary
    const lastPeriod = cleanedResponse.lastIndexOf('.');
    const lastNewline = cleanedResponse.lastIndexOf('\n');
    const cutPoint = Math.max(lastPeriod, lastNewline);
    if (cutPoint > 1000) {
      cleanedResponse = cleanedResponse.substring(0, cutPoint + 1);
    }
  }
  
  // Split response into lines and process
  const lines = cleanedResponse.split("\n").map((line) => line.trim()).filter(line => line.length > 0);
  
  // Track bullet points to group them
  const bulletItems: string[] = [];
  
  // Process each line
  for (const line of lines) {
    if (!line || line.length === 0) {
      // Empty line - flush bullets if we have any
      if (bulletItems.length > 0) {
        content.push(createBulletsElement(bulletItems));
        bulletItems.length = 0; // Clear array
      }
      continue;
    }

    // Check for markdown headings
    if (line.startsWith("### ")) {
      // h3 heading
      if (bulletItems.length > 0) {
        content.push(createBulletsElement(bulletItems));
        bulletItems.length = 0;
      }
      const headingText = line.replace(/^###\s+/, "").trim();
      if (headingText) {
        content.push({
          id: nanoid(),
          type: "h3" as const,
          children: [{ text: headingText }],
        });
      }
    } else if (line.startsWith("## ")) {
      // h2 heading
      if (bulletItems.length > 0) {
        content.push(createBulletsElement(bulletItems));
        bulletItems.length = 0;
      }
      const headingText = line.replace(/^##\s+/, "").trim();
      if (headingText) {
        content.push({
          id: nanoid(),
          type: "h2" as const,
          children: [{ text: headingText }],
        });
      }
    } else if (line.startsWith("# ")) {
      // h1 heading (but we already have the topic as h1, so treat as h2)
      if (bulletItems.length > 0) {
        content.push(createBulletsElement(bulletItems));
        bulletItems.length = 0;
      }
      const headingText = line.replace(/^#\s+/, "").trim();
      if (headingText && headingText.toLowerCase() !== topic.toLowerCase()) {
        content.push({
          id: nanoid(),
          type: "h2" as const,
          children: [{ text: headingText }],
        });
      }
    } else if (/^[-•*]\s/.test(line) || /^\d+[\.\)]\s/.test(line)) {
      // Bullet point - collect it (with or without space after marker)
      const bulletText = line
        .replace(/^[-•*]\s*/, "")
        .replace(/^\d+[\.\)]\s*/, "")
        .trim();
      if (bulletText) {
        bulletItems.push(bulletText);
      }
    } else {
      // Regular paragraph
      // Flush bullets first if we have any
      if (bulletItems.length > 0) {
        content.push(createBulletsElement(bulletItems));
        bulletItems.length = 0;
      }
      
      // Add as paragraph
      if (line.length > 0) {
        content.push({
          id: nanoid(),
          type: "p" as const,
          children: [{ text: line }],
        });
      }
    }
  }

  // Flush any remaining bullets
  if (bulletItems.length > 0) {
    content.push(createBulletsElement(bulletItems));
  }

  // If we only have the title, add the response as a paragraph
  if (content.length === 1) {
    const cleanResponse = response.trim();
    if (cleanResponse) {
      content.push({
        id: nanoid(),
        type: "p" as const,
        children: [{ text: cleanResponse }],
      });
    }
  }

  return content;
}

// Helper function to create a bullets element with bullet items
function createBulletsElement(bulletTexts: string[]): PlateSlide["content"][number] {
  const bulletItems = bulletTexts.map((text) => ({
    id: nanoid(),
    type: "bullet" as const,
    children: [
      {
        id: nanoid(),
        type: "p" as const,
        children: [{ text }],
      },
    ],
  }));

  return {
    id: nanoid(),
    type: "bullets" as const,
    children: bulletItems,
  };
}


