import type { GenerateContentResponse } from "@google/genai";
import type { Source } from "./types";

export function extractGroundedSources(
  response: GenerateContentResponse,
  maxResults = 8
): Source[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: Source[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const uri = chunk.web?.uri;
    if (!uri) continue;

    try {
      const url = new URL(uri);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      const normalizedUrl = url.href;
      if (seen.has(normalizedUrl)) continue;
      seen.add(normalizedUrl);
      const host = url.hostname.toLowerCase();
      const isOfficial =
        host.endsWith(".gov") ||
        host.includes(".gov.") ||
        /(^|\.)iata\.org$|(^|\.)who\.int$|(^|\.)europa\.eu$|(^|\.)unwto\.org$/i.test(host);
      const isBooking =
        /booking\.com|hotels\.com|expedia\.|agoda\.|airbnb\.|duffel\.|skyscanner\./i.test(host);

      sources.push({
        title: chunk.web?.title?.trim() || host,
        url: normalizedUrl,
        type: isOfficial ? "official" : isBooking ? "booking" : "review",
      });
      if (sources.length >= maxResults) break;
    } catch {
      // Ignore malformed URLs returned in grounding metadata.
    }
  }

  return sources;
}

export function normalizeSourceUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return undefined;
  }
}
