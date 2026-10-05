/**
 * NOVA Travel Agent — AI-Powered Travel Providers
 *
 * These providers use Gemini + Google Search grounding to research live travel
 * information: hotels, flights, activities, restaurants, destinations.
 *
 * Status: LIVE research via AI grounding. Direct booking APIs require separate
 * credentials (Amadeus, Booking.com, etc.) — see provider comments.
 */

import { GoogleGenAI } from "@google/genai";
import { extractGroundedSources, normalizeSourceUrl } from "../grounding";
import { withRetry } from "../retry";
import type { GroundedSearchResults } from "../providers";
import type {
  HotelProvider,
  FlightProvider,
  ActivityProvider,
  RestaurantProvider,
  DestinationProvider,
} from "../providers";
import type {
  HotelResult,
  FlightResult,
  ActivityResult,
  RestaurantResult,
  DestinationResult,
  HotelSearchParams,
  FlightSearchParams,
  ActivitySearchParams,
  RestaurantSearchParams,
} from "../types";

const MODEL = "gemini-3.5-flash-lite";

function getAI(): GoogleGenAI {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenAI({ apiKey });
}

async function searchWithGrounding<T>(
  query: string,
  schema: string,
  maxResults: number
): Promise<GroundedSearchResults<T>> {
  const ai = getAI();

  const rules = (grounded: boolean) =>
    grounded
      ? `Rules:
- Include only options supported by the search results.
- Never invent a specific price, exact availability, cancellation term, or booking confirmation.
- Search summaries are research leads, not live supplier inventory or offers.
- Set priceStatus to "estimated" for indicative prices and "unavailable" when no price is found.
- Return only valid JSON.`
      : `Rules:
- Live search is NOT available for this request: return well-known, typical options from general travel knowledge instead.
- Set priceStatus to "estimated" (typical indicative range) or "unavailable" — never "verified".
- Set bookingUrl to null and provider to "AI research (unverified)".
- Never claim current availability, opening hours, or bookable inventory.
- Return only valid JSON.`;

  const prompt = (grounded: boolean) =>
    `${grounded ? "Use Google Search to research" : "Research"} current information for this travel query: "${query}"

Return a JSON array of up to ${maxResults} options using this schema: ${schema}

${rules(grounded)}`;

  const generate = (grounded: boolean) =>
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt(grounded) }] }],
      config: {
        ...(grounded ? { tools: [{ googleSearch: {} }] } : {}),
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

  let grounded = true;
  let response;
  try {
    response = await withRetry(() => generate(true), 2, "TravelProvider");
  } catch (groundedErr) {
    console.warn(
      "[TravelProvider] Grounded search unavailable, using AI knowledge fallback:",
      groundedErr instanceof Error ? groundedErr.message : groundedErr
    );
    grounded = false;
    response = await withRetry(() => generate(false), 2, "TravelProviderOffline");
  }

  const sources = extractGroundedSources(response, maxResults);
  const text = response.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  // Grounded results without citations are discarded (anti-hallucination guard);
  // the ungrounded fallback carries no citations by design, so accept it as-is.
  if (!jsonMatch || (grounded && sources.length === 0)) return { items: [], sources };

  try {
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    return {
      items: Array.isArray(parsed) ? (parsed.slice(0, maxResults) as T[]) : [],
      sources,
    };
  } catch {
    console.error("[TravelProvider] JSON parse error:", text.slice(0, 500));
    return { items: [], sources };
  }
}

function keepOnlyGroundedLink(
  candidate: string | undefined,
  sources: GroundedSearchResults<unknown>["sources"]
): string | undefined {
  const normalizedCandidate = normalizeSourceUrl(candidate);
  if (!normalizedCandidate) return undefined;
  return sources.find((source) => normalizeSourceUrl(source.url) === normalizedCandidate)?.url;
}

// ─── Hotel Provider ───────────────────────────────────────────────────────────

export class GeminiHotelProvider implements HotelProvider {
  readonly name = "Gemini Hotel Research";
  readonly supportsLivePricing = false; // Enable with Amadeus/Booking.com API

  async search(params: HotelSearchParams): Promise<GroundedSearchResults<HotelResult>> {
    const query = `Hotels in ${params.destination} check-in ${params.checkIn} check-out ${params.checkOut} ${params.adults} adults${params.children ? ` ${params.children} children${params.childrenAges?.length ? ` aged ${params.childrenAges.join(", ")}` : ""}` : ""}, ${params.rooms ?? 1} room(s) ${params.category ?? ""}`;

    const schema = `{
  "id": "unique_id",
  "name": "Hotel name",
  "stars": 1-5,
  "location": "Neighborhood/area",
  "pricePerNight": number_or_null,
  "currency": "EUR/USD/TND/etc",
  "totalPrice": number_or_null,
  "rating": 0-10_or_null,
  "reviewCount": number_or_null,
  "amenities": ["WiFi", "Pool", ...],
  "cancellationPolicy": "text_or_null",
  "imageUrl": null,
  "bookingUrl": "url_or_null",
  "provider": "Booking.com/Hotels.com/Official/etc",
  "priceStatus": "verified|estimated|unavailable",
  "available": true_or_null
}`;

    const { items, sources } = await searchWithGrounding<HotelResult>(
      query,
      schema,
      params.maxResults ?? 6
    );

    return {
      items: items.map((h, i) => ({
        ...h,
        id: h.id ?? `hotel-${i}`,
        amenities: h.amenities ?? [],
        priceStatus: typeof h.pricePerNight === "number" || typeof h.totalPrice === "number" ? "estimated" : "unavailable",
        available: undefined,
        cancellationPolicy: undefined,
        bookingUrl: keepOnlyGroundedLink(h.bookingUrl, sources),
      })),
      sources,
    };
  }

  async checkAvailability(
    _hotelId: string,
    _params: HotelSearchParams
  ): Promise<boolean> {
    // Requires direct hotel/OTA API integration (Amadeus, Booking.com, etc.)
    return false;
  }
}

// ─── Flight Provider ──────────────────────────────────────────────────────────

export class GeminiFlightProvider implements FlightProvider {
  readonly name = "Gemini Flight Research";
  readonly supportsLivePricing = false; // Enable with Amadeus/Skyscanner API

  async search(params: FlightSearchParams): Promise<GroundedSearchResults<FlightResult>> {
    const query = `Flights from ${params.origin} to ${params.destination} on ${params.departureDate}${params.returnDate ? ` return ${params.returnDate}` : " one-way"} ${params.adults} adults${params.children ? ` ${params.children} children${params.childrenAges?.length ? ` aged ${params.childrenAges.join(", ")}` : ""}` : ""} ${params.cabinClass ?? "economy"}`;

    const schema = `{
  "id": "unique_id",
  "airline": "Airline name",
  "flightNumber": "XX123 or null",
  "origin": "Airport code (IATA)",
  "destination": "Airport code (IATA)",
  "departureTime": "HH:MM",
  "arrivalTime": "HH:MM",
  "duration": "Xh Ym",
  "stops": 0_or_1_etc,
  "price": number_or_null,
  "currency": "EUR/USD/TND/etc",
  "cabinClass": "Economy/Business/etc",
  "bookingUrl": "url_or_null",
  "provider": "Airline official/Skyscanner/etc",
  "priceStatus": "verified|estimated|unavailable",
  "available": true_or_null
}`;

    const { items, sources } = await searchWithGrounding<FlightResult>(
      query,
      schema,
      params.maxResults ?? 5
    );

    return {
      items: items.map((f, i) => ({
        ...f,
        id: f.id ?? `flight-${i}`,
        priceStatus: typeof f.price === "number" ? "estimated" : "unavailable",
        available: undefined,
        bookingUrl: keepOnlyGroundedLink(f.bookingUrl, sources),
      })),
      sources,
    };
  }
}

// ─── Activity Provider ────────────────────────────────────────────────────────

export class GeminiActivityProvider implements ActivityProvider {
  readonly name = "Gemini Activity Research";
  readonly supportsLivePricing = false;

  async search(params: ActivitySearchParams): Promise<GroundedSearchResults<ActivityResult>> {
    const query = `Top activities and attractions in ${params.destination}${params.interests?.length ? ` for ${params.interests.join(", ")}` : ""} with prices and booking info`;

    const schema = `{
  "id": "unique_id",
  "name": "Activity/attraction name",
  "location": "Specific location/address",
  "duration": "X hours or null",
  "price": number_or_null,
  "currency": "EUR/USD/TND or null",
  "rating": 0-5_or_null,
  "reviewCount": number_or_null,
  "description": "2-3 sentence description",
  "categories": ["Culture", "Adventure", etc],
  "bookingUrl": "url_or_null",
  "imageUrl": null,
  "provider": "Official site/GetYourGuide/Viator/etc",
  "priceStatus": "verified|estimated|unavailable"
}`;

    const { items, sources } = await searchWithGrounding<ActivityResult>(
      query,
      schema,
      params.maxResults ?? 8
    );

    return {
      items: items.map((a, i) => ({
        ...a,
        id: a.id ?? `activity-${i}`,
        categories: a.categories ?? [],
        priceStatus: typeof a.price === "number" ? "estimated" : "unavailable",
        bookingUrl: keepOnlyGroundedLink(a.bookingUrl, sources),
      })),
      sources,
    };
  }
}

// ─── Restaurant Provider ──────────────────────────────────────────────────────

export class GeminiRestaurantProvider implements RestaurantProvider {
  readonly name = "Gemini Restaurant Research";

  async search(params: RestaurantSearchParams): Promise<GroundedSearchResults<RestaurantResult>> {
    const query = `Best restaurants in ${params.destination}${params.cuisine ? ` ${params.cuisine} cuisine` : ""} with ratings and reviews`;

    const schema = `{
  "id": "unique_id",
  "name": "Restaurant name",
  "location": "Neighborhood/address",
  "cuisine": "Cuisine type",
  "priceRange": "$ / $$ / $$$ / $$$$ or null",
  "rating": 0-5_or_null,
  "reviewCount": number_or_null,
  "description": "2-3 sentence description",
  "bookingUrl": "url_or_null",
  "websiteUrl": "url_or_null",
  "imageUrl": null,
  "priceStatus": "verified|estimated|unavailable"
}`;

    const { items, sources } = await searchWithGrounding<RestaurantResult>(
      query,
      schema,
      params.maxResults ?? 6
    );

    return {
      items: items.map((r, i) => ({
        ...r,
        id: r.id ?? `restaurant-${i}`,
        priceStatus: r.priceRange ? "estimated" : "unavailable",
        bookingUrl: keepOnlyGroundedLink(r.bookingUrl, sources),
        websiteUrl: keepOnlyGroundedLink(r.websiteUrl, sources),
      })),
      sources,
    };
  }
}

// ─── Destination Provider ─────────────────────────────────────────────────────

export class GeminiDestinationProvider implements DestinationProvider {
  readonly name = "Gemini Destination Research";

  async search(query: string, _context?: string): Promise<GroundedSearchResults<DestinationResult>> {
    const schema = `{
  "id": "unique_id",
  "name": "Destination name",
  "country": "Country",
  "region": "Region/area or null",
  "description": "2-3 sentence description",
  "highlights": ["highlight1", "highlight2", ...],
  "bestFor": ["Beaches", "Culture", "Adventure", ...],
  "bestSeason": "Spring/Summer/etc or null",
  "averageCost": "budget/mid-range/luxury + approximate daily cost",
  "imageUrl": null,
  "matchScore": 0-100,
  "matchReason": "Why this fits the user's request"
}`;

    const ai = getAI();
    const prompt = (grounded: boolean) => `${grounded ? "Research destinations with up-to-date information" : "Suggest destinations from general travel knowledge"} for this travel query: "${query}"

Find up to 5 suitable destinations and return a JSON array.
Schema: ${schema}
${grounded ? "\nBe specific about WHY each destination matches the query. Research current travel conditions.\nReturn ONLY valid JSON array." : '\nLive research is unavailable: use well-known destinations, set "averageCost" as a typical range, and never claim current travel conditions.\nReturn ONLY valid JSON array.'}`;

    const generate = (grounded: boolean) =>
      ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt(grounded) }] }],
        config: {
          ...(grounded ? { tools: [{ googleSearch: {} }] } : {}),
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

    let grounded = true;
    let response;
    try {
      response = await withRetry(() => generate(true), 2, "DestinationProvider");
    } catch (groundedErr) {
      console.warn(
        "[DestinationProvider] Grounded search unavailable, using AI knowledge fallback:",
        groundedErr instanceof Error ? groundedErr.message : groundedErr
      );
      grounded = false;
      response = await withRetry(() => generate(false), 2, "DestinationProviderOffline");
    }

    const sources = extractGroundedSources(response, 6);
    const text = response.text ?? "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch || (grounded && sources.length === 0)) return { items: [], sources };

    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      const items = Array.isArray(parsed) ? (parsed as DestinationResult[]) : [];
      return {
        items: items.map((d, i) => ({
          ...d,
          id: d.id ?? `dest-${i}`,
          highlights: d.highlights ?? [],
          bestFor: d.bestFor ?? [],
        })),
        sources,
      };
    } catch {
      return { items: [], sources };
    }
  }
}
