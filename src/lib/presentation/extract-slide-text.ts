import { type PlateNode } from "@/components/presentation/utils/parser";

/**
 * Extract plain text content from a PlateNode tree
 * This is used to convert slide content to text for AI processing
 */
export function extractTextFromPlateNode(node: unknown): string {
  let text = "";

  // If node has text property (TText node), add it
  if (
    node &&
    typeof node === "object" &&
    node !== null &&
    "text" in node &&
    typeof (node as { text: unknown }).text === "string"
  ) {
    text += (node as { text: string }).text;
  }

  // If node has children, recursively extract text
  if (
    node &&
    typeof node === "object" &&
    node !== null &&
    "children" in node &&
    Array.isArray((node as { children: unknown }).children)
  ) {
    for (const child of (node as { children: unknown[] }).children) {
      const childText = extractTextFromPlateNode(child);
      if (childText) {
        text += (text ? " " : "") + childText;
      }
    }
  }

  return text.trim();
}

/**
 * Extract all text content from a slide
 * Handles various Plate.js node types (headings, paragraphs, bullets, etc.)
 */
export function extractSlideText(slide: { content: PlateNode[] }): string {
  if (!slide.content || slide.content.length === 0) {
    return "";
  }

  const texts = slide.content
    .map((node) => extractTextFromPlateNode(node))
    .filter((text) => text.length > 0);

  return texts.join(" ").trim();
}
