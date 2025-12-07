"use server";

import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * Slide Validation Tool
 * Uses LLM-as-judge to evaluate slide quality and suggest improvements
 */

export interface ValidationResult {
  isValid: boolean;
  score: number; // 1-10
  issues: string[];
  suggestions: string[];
}

const validationModel = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 500,
});

const VALIDATION_PROMPT = `You are a presentation quality evaluator. Analyze this slide content and provide feedback.

Slide Topic: {topic}
Slide Content (XML):
{content}

Web Research Available: {hasResearch}

Evaluate on these criteria:
1. Content Quality (clear, informative, not too brief or verbose)
2. Structure (proper use of layout components)
3. Visual Appeal (good use of images, icons if present)
4. Relevance (content matches the topic)
5. Data/Facts (includes specific information, not just generic statements)

Respond in this exact JSON format:
{{
  "score": <1-10>,
  "isValid": <true if score >= 7>,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}}

Be concise. Max 2 issues and 2 suggestions.`;

/**
 * Validate a generated slide
 */
export async function validateSlide(
  topic: string,
  content: string,
  hasResearch = false
): Promise<ValidationResult> {
  try {
    const prompt = VALIDATION_PROMPT
      .replace("{topic}", topic)
      .replace("{content}", content.substring(0, 1500)) // Limit for token efficiency
      .replace("{hasResearch}", hasResearch ? "Yes" : "No");

    const response = await validationModel.invoke(prompt);
    const text = await new StringOutputParser().invoke(response);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Default to valid if parsing fails
      return {
        isValid: true,
        score: 7,
        issues: [],
        suggestions: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      score: number;
      isValid: boolean;
      issues: string[];
      suggestions: string[];
    };

    return {
      isValid: parsed.isValid ?? parsed.score >= 7,
      score: Math.min(10, Math.max(1, parsed.score ?? 7)),
      issues: parsed.issues ?? [],
      suggestions: parsed.suggestions ?? [],
    };
  } catch (error) {
    console.error("Validation error:", error);
    // Default to valid on error to not block generation
    return {
      isValid: true,
      score: 7,
      issues: [],
      suggestions: [],
    };
  }
}

/**
 * Quick validation - just check for basic issues without LLM
 */
export async function quickValidate(content: string): Promise<{ valid: boolean; reason?: string }> {
  // Check if content is too short
  if (content.length < 100) {
    return { valid: false, reason: "Content too short" };
  }

  // Check if has SECTION tag
  if (!content.includes("<SECTION")) {
    return { valid: false, reason: "Missing SECTION structure" };
  }

  // Check for at least one content element
  const hasContent =
    content.includes("<H1>") ||
    content.includes("<H2>") ||
    content.includes("<H3>") ||
    content.includes("<BULLETS>") ||
    content.includes("<ICONS>") ||
    content.includes("<P>");

  if (!hasContent) {
    return { valid: false, reason: "No content elements found" };
  }

  return { valid: true };
}
