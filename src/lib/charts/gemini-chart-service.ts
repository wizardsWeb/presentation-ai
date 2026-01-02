"use server";

import { env } from "@/env";

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartSpec {
  chartType: "vertical-bar" | "horizontal-bar" | "line" | "pie" | "area";
  data: ChartDataPoint[];
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

/**
 * Use Gemini to extract data from text and generate chart specifications
 */
export async function extractChartDataFromText(
  text: string,
  context?: string
): Promise<ChartSpec | null> {
  const apiKey = env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a data visualization expert. Extract numerical data from the following text and suggest the best chart type.

Text: "${text}"
${context ? `Context: "${context}"` : ""}

Your task:
1. Identify all numerical data points (numbers, percentages, statistics)
2. Extract labels/categories associated with each number
3. Determine the best chart type (vertical-bar, horizontal-bar, line, pie, area)
4. Return ONLY valid JSON in this exact format:
{
  "chartType": "vertical-bar",
  "data": [
    {"label": "Category 1", "value": 45},
    {"label": "Category 2", "value": 72}
  ],
  "title": "Chart Title",
  "xAxisLabel": "X Axis",
  "yAxisLabel": "Y Axis"
}

Rules:
- Extract at least 3 data points, maximum 10
- Use appropriate chart type: bar for comparisons, line for trends, pie for parts of whole
- Ensure all values are numbers
- Return ONLY the JSON, no explanations`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          }
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.warn("Gemini chart extraction failed:", response.status);
      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!jsonText) {
      return null;
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ?? 
                      jsonText.match(/(\{[\s\S]*\})/);
    
    const jsonStr = jsonMatch?.[1] ?? jsonText;
    
    try {
      const chartSpec = JSON.parse(jsonStr) as ChartSpec;
      
      // Validate the spec
      if (!chartSpec.data || !Array.isArray(chartSpec.data) || chartSpec.data.length < 2) {
        return null;
      }
      
      // Ensure all values are numbers
      chartSpec.data = chartSpec.data.map(item => ({
        label: item.label || "Unknown",
        value: typeof item.value === "number" ? item.value : parseFloat(String(item.value)) || 0,
      }));
      
      return chartSpec;
    } catch (parseError) {
      console.warn("Failed to parse chart JSON:", parseError);
      return null;
    }
  } catch (error) {
    console.warn("Gemini chart extraction error:", error);
    return null;
  }
}

/**
 * Generate chart XML for slide generation
 */
export function generateChartXML(chartSpec: ChartSpec): string {
  const tableRows = chartSpec.data
    .map(item => 
      `    <TR><TD type="label"><VALUE>${escapeXml(item.label)}</VALUE></TD><TD type="data"><VALUE>${item.value}</VALUE></TD></TR>`
    )
    .join("\n");

  return `<CHART charttype="${chartSpec.chartType}">
  <TABLE>
${tableRows}
  </TABLE>
</CHART>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

