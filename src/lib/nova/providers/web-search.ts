/**
 * NOVA Travel Agent — Gemini-Grounded Web Search Provider
 *
 * Uses Gemini's built-in Google Search grounding tool as the web search backend.
 * No external API credentials needed beyond GEMINI_API_KEY.
 *
 * Status: LIVE — requires GEMINI_API_KEY in environment.
 */

import { GoogleGenAI } from "@google/genai";
import type { WebSearchProvider, WebSearchResult } from "../providers";

const MODEL = "gemini-3.5-flash-lite";

export class GeminiSearchProvider implements WebSearchProvider {
  readonly name = "Gemini Search (Google Grounding)";

  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Add it to your .env file."
      );
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async search(query: string, maxResults = 8): Promise<WebSearchResult[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Search the web for: "${query}"
                
Return a JSON array of up to ${maxResults} results. Each result must have:
- title: page/article title
- url: full URL  
- snippet: 1-2 sentence summary of the content
- source: domain name only

Return ONLY valid JSON, no other text. Format:
[{"title":"...","url":"...","snippet":"...","source":"..."}]`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text ?? "";
      
      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn("[GeminiSearch] No JSON array found in response");
        return [];
      }

      const results = JSON.parse(jsonMatch[0]) as WebSearchResult[];
      
      // Also extract grounding metadata for additional sources
      const metadata = response.candidates?.[0]?.groundingMetadata;
      if (metadata?.groundingChunks) {
        const groundingResults: WebSearchResult[] = metadata.groundingChunks
          .filter((c) => c.web?.uri)
          .slice(0, maxResults)
          .map((c) => ({
            title: c.web?.title ?? "Source",
            url: c.web?.uri ?? "",
            snippet: "",
            source: new URL(c.web?.uri ?? "https://unknown").hostname,
          }));

        // Merge grounding URLs into results if they have matching URLs
        return results.map((r) => {
          const grounding = groundingResults.find((g) =>
            g.url.includes(r.source)
          );
          return grounding ? { ...r, url: grounding.url } : r;
        });
      }

      return results.slice(0, maxResults);
    } catch (error) {
      console.error("[GeminiSearch] Search failed:", error);
      throw new Error(
        `Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async openPage(url: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Retrieve and summarize the content from this URL: ${url}
                
Provide a structured summary including:
- Main topic
- Key information and facts
- Any prices, dates, or specific details
- Contact information if available

Be factual. Only include information that is on the page.`,
              },
            ],
          },
        ],
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        },
      });

      return response.text ?? "Could not retrieve page content.";
    } catch (error) {
      console.error("[GeminiSearch] Page open failed:", error);
      return `Could not retrieve page content: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
// Lazily initialized server-side only.

let _searchProvider: GeminiSearchProvider | null = null;

export function getWebSearchProvider(): GeminiSearchProvider {
  if (!_searchProvider) {
    _searchProvider = new GeminiSearchProvider();
  }
  return _searchProvider;
}
