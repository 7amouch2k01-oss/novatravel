/**
 * NOVA Travel Agent — Gemini-Grounded Web Search Provider
 *
 * Uses Gemini's built-in Google Search grounding tool as the web search backend.
 * No external API credentials needed beyond GEMINI_API_KEY.
 *
 * Status: LIVE — requires GEMINI_API_KEY in environment.
 */

import { GoogleGenAI } from "@google/genai";
import { extractGroundedSources, normalizeSourceUrl } from "../grounding";
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
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const text = response.text ?? "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      let modelResults: WebSearchResult[] = [];
      if (jsonMatch) {
        try {
          const parsed: unknown = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) modelResults = parsed as WebSearchResult[];
        } catch {
          console.warn("[GeminiSearch] Search response JSON could not be parsed");
        }
      }

      const groundedSources = extractGroundedSources(response, maxResults);
      return groundedSources.map((source) => {
        const matchingSummary = modelResults.find(
          (result) => normalizeSourceUrl(result.url) === normalizeSourceUrl(source.url)
        );
        let hostname = "";
        try {
          hostname = new URL(source.url).hostname;
        } catch {
          // Source URLs have already been validated by extractGroundedSources.
        }
        return {
          title: source.title,
          url: source.url,
          snippet: matchingSummary?.snippet ?? "",
          source: hostname,
        };
      });
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
