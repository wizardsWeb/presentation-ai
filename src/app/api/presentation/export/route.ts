import { type NextRequest, NextResponse } from "next/server";
import type { PlateSlide } from "@/components/presentation/utils/parser";
import { themes, type ThemeName, type ThemeProperties } from "@/lib/presentation/themes";
import type PptxGenJS from "pptxgenjs";

// Dynamic import for pptxgenjs (server-side only)
const loadPptxGenJS = async () => {
  const PptxGenJS = (await import("pptxgenjs")).default;
  return PptxGenJS;
};

interface ExportRequest {
  slides: PlateSlide[];
  title: string;
  theme: ThemeName;
  customThemeData?: ThemeProperties | null;
  isDarkMode?: boolean;
}

interface ThemeColors {
  background: string;
  text: string;
  heading: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
}

// Helper to format color for pptxgenjs (removes # prefix if present)
function formatColor(color: string): string {
  return color.replace("#", "");
}

// Get theme colors - uses dark mode by default to match website
function getThemeColors(
  themeName: ThemeName,
  customThemeData?: ThemeProperties | null,
  isDarkMode = true
): ThemeColors {
  // Default dark theme colors matching the website
  const defaultDarkColors: ThemeColors = {
    background: "#0f0d1a",
    text: "#e5e7eb",
    heading: "#f9fafb",
    primary: "#8b5cf6",
    secondary: "#a78bfa",
    accent: "#c4b5fd",
    muted: "#6b7280",
  };

  if (customThemeData) {
    const colors = isDarkMode ? customThemeData.colors.dark : customThemeData.colors.light;
    return {
      background: colors.background ?? defaultDarkColors.background,
      text: colors.text ?? defaultDarkColors.text,
      heading: colors.heading ?? defaultDarkColors.heading,
      primary: colors.primary ?? defaultDarkColors.primary,
      secondary: colors.secondary ?? defaultDarkColors.secondary,
      accent: colors.accent ?? defaultDarkColors.accent,
      muted: colors.muted ?? defaultDarkColors.muted,
    };
  }

  const theme = themes[themeName];
  if (!theme) {
    return defaultDarkColors;
  }

  const colors = isDarkMode ? theme.colors.dark : theme.colors.light;
  return {
    background: colors.background ?? defaultDarkColors.background,
    text: colors.text ?? defaultDarkColors.text,
    heading: colors.heading ?? defaultDarkColors.heading,
    primary: colors.primary ?? defaultDarkColors.primary,
    secondary: colors.secondary ?? defaultDarkColors.secondary,
    accent: colors.accent ?? defaultDarkColors.accent,
    muted: colors.muted ?? defaultDarkColors.muted,
  };
}

// Helper function to extract text from node recursively
function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;

  // Direct text node
  if (typeof n.text === "string") {
    return n.text;
  }

  // Recursively get text from children
  if (Array.isArray(n.children)) {
    return n.children.map((child) => extractText(child)).join("");
  }

  return "";
}

// Recursively collect all text content from a node and its descendants
function collectAllText(node: unknown, results: string[] = []): string[] {
  if (!node || typeof node !== "object") return results;
  const n = node as Record<string, unknown>;
  const type = n.type as string;

  // Skip icon elements
  if (type === "icon") return results;

  // For headings and paragraphs, extract their text
  if (type === "h1" || type === "h2" || type === "h3" || type === "h4" || 
      type === "h5" || type === "h6" || type === "p" || type === "paragraph") {
    const text = extractText(node);
    if (text?.trim()) {
      results.push(text.trim());
    }
  }

  // Recurse into children
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      collectAllText(child, results);
    }
  }

  return results;
}

interface SlideContent {
  title: string;
  bulletPoints: string[];
  youtubeVideo?: {
    videoId: string;
    title: string;
    channel?: string;
    thumbnail?: string;
  };
}

// Process slide content into title + bullet points
function processSlideContent(content: unknown[]): SlideContent {
  let title = "";
  const bulletPoints: string[] = [];
  let youtubeVideo: SlideContent["youtubeVideo"];

  for (const node of content) {
    if (!node || typeof node !== "object") continue;
    const n = node as Record<string, unknown>;
    const type = n.type as string;

    // Handle YouTube video element
    if (type === "youtube") {
      youtubeVideo = {
        videoId: n.videoId as string,
        title: n.title as string,
        channel: n.channel as string | undefined,
        thumbnail: n.thumbnail as string | undefined,
      };
      continue;
    }

    // Main title from h1 or h2
    if (type === "h1" || type === "h2") {
      const text = extractText(node);
      if (!title && text?.trim()) {
        title = text.trim();
      }
      continue;
    }

    // Paragraph text becomes bullet point
    if (type === "p" || type === "paragraph") {
      const text = extractText(node);
      if (text?.trim()) {
        bulletPoints.push(text.trim());
      }
      continue;
    }

    // Handle container elements (icons, bullets, cycle, etc.)
    if (type === "icons" || type === "bullets" || type === "cycle" || 
        type === "staircase" || type === "visualization-list" ||
        type === "arrows" || type === "timeline" || type === "pyramid" ||
        type === "columns") {
      const children = n.children as unknown[];
      if (Array.isArray(children)) {
        // Each child is an item (icon-item, bullet-item, etc.)
        for (const child of children) {
          const texts = collectAllText(child);
          // Add each text as a separate bullet point
          for (const text of texts) {
            if (text.trim()) {
              bulletPoints.push(text.trim());
            }
          }
        }
      }
      continue;
    }

    // Handle individual item types directly
    if (type === "icon-item" || type === "bullet-item" || type === "bullet" ||
        type === "cycle-item" || type === "stair-item" || type === "visualization-item" ||
        type === "arrow-item" || type === "timeline-item" || type === "pyramid-item") {
      const texts = collectAllText(node);
      for (const text of texts) {
        if (text.trim()) {
          bulletPoints.push(text.trim());
        }
      }
      continue;
    }

    // For any other container, try to extract text
    if (Array.isArray(n.children)) {
      const texts = collectAllText(node);
      for (const text of texts) {
        if (text.trim() && !bulletPoints.includes(text.trim())) {
          bulletPoints.push(text.trim());
        }
      }
    }
  }

  return { title, bulletPoints, youtubeVideo };
}

// Add a numbered badge (rounded square)
function addNumberBadge(
  slide: PptxGenJS.Slide,
  num: number,
  x: number,
  y: number,
  colors: ThemeColors
) {
  const badgeSize = 0.25;
  
  // Add rounded rectangle
  slide.addShape("roundRect" as PptxGenJS.ShapeType, {
    x: x,
    y: y,
    w: badgeSize,
    h: badgeSize,
    fill: { color: formatColor(colors.primary) },
    line: { color: formatColor(colors.primary), width: 0 },
    rectRadius: 0.04,
  });

  // Add number text
  slide.addText(num.toString(), {
    x: x,
    y: y,
    w: badgeSize,
    h: badgeSize,
    fontSize: 10,
    bold: true,
    color: "FFFFFF",
    align: "center",
    valign: "middle",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportRequest;
    const { slides, title, theme, customThemeData, isDarkMode = true } = body;

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: "No slides provided" }, { status: 400 });
    }

    const colors = getThemeColors(theme, customThemeData, isDarkMode);
    const PptxGenJS = await loadPptxGenJS();
    const pptx = new PptxGenJS();

    // Set presentation properties
    pptx.title = title;
    pptx.author = "Presentation AI";
    pptx.layout = "LAYOUT_16x9";

    // Define master slide with dark background
    pptx.defineSlideMaster({
      title: "MAIN_SLIDE",
      background: { color: formatColor(colors.background) },
    });

    // Process each slide
    for (let i = 0; i < slides.length; i++) {
      const slideData = slides[i];
      if (!slideData) continue;

      const slide = pptx.addSlide({ masterName: "MAIN_SLIDE" });
      const layout = slideData.layoutType ?? "right";
      const processed = processSlideContent(slideData.content);
      const hasImage = !!slideData.rootImage?.url;

      // Calculate content area based on layout
      let contentX = 0.4;
      let contentW = hasImage ? 5.0 : 9.2;
      let imageX = 5.8;
      const imageW = 4.0;
      const imageH = 5.625;

      if (layout === "left" && hasImage) {
        // Image on left
        imageX = 0;
        contentX = 4.2;
        contentW = 5.4;
      } else if (layout === "right" && hasImage) {
        // Image on right
        contentX = 0.4;
        contentW = 5.0;
        imageX = 5.8;
      } else if (layout === "vertical" && hasImage) {
        // Image at top
        contentX = 0.4;
        contentW = 9.2;
      }

      // Add background image if present
      if (hasImage && slideData.rootImage?.url) {
        try {
          if (layout === "vertical") {
            slide.addImage({
              path: slideData.rootImage.url,
              x: 0,
              y: 0,
              w: 10,
              h: 2.2,
              sizing: { type: "cover", w: 10, h: 2.2 },
            });
          } else {
            slide.addImage({
              path: slideData.rootImage.url,
              x: imageX,
              y: 0,
              w: imageW,
              h: imageH,
              sizing: { type: "cover", w: imageW, h: imageH },
            });
          }
        } catch {
          // Image loading failed
        }
      }

      // Starting Y position
      let currentY = layout === "vertical" && hasImage ? 2.4 : 0.4;

      // Add slide title with numbered badge
      if (processed.title) {
        // Add number badge
        addNumberBadge(slide, 1, contentX, currentY + 0.05, colors);

        // Add title text
        slide.addText(processed.title, {
          x: contentX + 0.35,
          y: currentY,
          w: contentW - 0.35,
          h: 0.4,
          fontSize: 16,
          bold: true,
          color: formatColor(colors.heading),
          fontFace: "Arial",
          align: "left",
          valign: "middle",
        });
        currentY += 0.55;
      }

      // Add bullet points
      for (const bulletText of processed.bulletPoints) {
        // Add bullet text with dash prefix
        slide.addText(bulletText, {
          x: contentX,
          y: currentY,
          w: contentW,
          h: 0.35,
          fontSize: 10,
          color: formatColor(colors.text),
          fontFace: "Arial",
          align: "left",
          valign: "top",
        });
        currentY += 0.4;
      }

      // Add YouTube video preview if present
      if (processed.youtubeVideo) {
        const video = processed.youtubeVideo;
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        const thumbnailUrl = video.thumbnail ?? `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
        
        currentY += 0.2;
        
        // Add video thumbnail with play button overlay effect
        try {
          slide.addImage({
            path: thumbnailUrl,
            x: contentX,
            y: currentY,
            w: 4.5,
            h: 2.53, // 16:9 aspect ratio
            sizing: { type: "cover", w: 4.5, h: 2.53 },
            hyperlink: { url: videoUrl },
          });
          
          // Add play button overlay (red circle with white triangle)
          slide.addShape("ellipse" as PptxGenJS.ShapeType, {
            x: contentX + 1.8,
            y: currentY + 0.9,
            w: 0.7,
            h: 0.7,
            fill: { color: "FF0000" },
            line: { color: "FF0000", width: 0 },
          });
          
          // Play triangle
          slide.addText("▶", {
            x: contentX + 1.8,
            y: currentY + 0.9,
            w: 0.7,
            h: 0.7,
            fontSize: 18,
            color: "FFFFFF",
            align: "center",
            valign: "middle",
          });
        } catch {
          // Thumbnail failed, add placeholder
          slide.addShape("rect" as PptxGenJS.ShapeType, {
            x: contentX,
            y: currentY,
            w: 4.5,
            h: 2.53,
            fill: { color: formatColor(colors.muted) },
            line: { color: formatColor(colors.primary), width: 1 },
          });
        }
        
        // Add video title and link
        slide.addText(video.title, {
          x: contentX + 4.7,
          y: currentY,
          w: 4.5,
          h: 0.6,
          fontSize: 11,
          bold: true,
          color: formatColor(colors.heading),
          fontFace: "Arial",
          align: "left",
          valign: "top",
          hyperlink: { url: videoUrl },
        });
        
        if (video.channel) {
          slide.addText(`Channel: ${video.channel}`, {
            x: contentX + 4.7,
            y: currentY + 0.6,
            w: 4.5,
            h: 0.3,
            fontSize: 9,
            color: formatColor(colors.muted),
            fontFace: "Arial",
            align: "left",
          });
        }
        
        // Add "Click to watch" text
        slide.addText("🔗 Click thumbnail to watch on YouTube", {
          x: contentX + 4.7,
          y: currentY + 1.0,
          w: 4.5,
          h: 0.3,
          fontSize: 9,
          color: formatColor(colors.primary),
          fontFace: "Arial",
          align: "left",
          hyperlink: { url: videoUrl },
        });
        
        currentY += 2.8;
      }

      // Add slide number (bottom right)
      slide.addText(`${i + 1}`, {
        x: 9.3,
        y: 5.2,
        w: 0.4,
        h: 0.25,
        fontSize: 9,
        color: formatColor(colors.muted),
        align: "center",
      });

      // Add branding (bottom left)
      slide.addText("Created with Presentation AI", {
        x: 0.3,
        y: 5.2,
        w: 2.5,
        h: 0.25,
        fontSize: 7,
        color: formatColor(colors.primary),
        align: "left",
      });
    }

    // Generate the file as base64
    const base64 = await pptx.write({ outputType: "base64" });

    return NextResponse.json({
      success: true,
      data: base64,
      fileName: `${title.replace(/[^a-zA-Z0-9]/g, "_")}_presentation.pptx`,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export presentation" },
      { status: 500 }
    );
  }
}
