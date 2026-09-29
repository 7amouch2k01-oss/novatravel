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

const MODEL = "gemini-2.5-flash";

function getAI(): GoogleGenAI {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenAI({ apiKey });
}

async function searchWithGrounding<T>(
  query: string,
  schema: string,
  maxResults: number
): Promise<T[]> {
  const ai = getAI();

  const prompt = `Research current information for this travel query: "${query}"

Search for up-to-date information and return a JSON array of up to ${maxResults} results.
Schema: ${schema}

IMPORTANT RULES:
- Only include information you found through search
- Mark prices as "estimated" if they are typical ranges, "verified" if from official/booking sites
- Include real booking URLs when found
- Set priceStatus to "unavailable" if no price information was found
- Never invent specific prices, hotel names, or booking confirmations
- Return ONLY valid JSON array, no other text`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const text = response.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]) as T[];
  } catch {
    console.error("[TravelProvider] JSON parse error:", text.slice(0, 500));
    return [];
  }
}

// ─── Hotel Provider ───────────────────────────────────────────────────────────

export class GeminiHotelProvider implements HotelProvider {
  readonly name = "Gemini Hotel Research";
  readonly supportsLivePricing = false; // Enable with Amadeus/Booking.com API

  async search(params: HotelSearchParams): Promise<HotelResult[]> {
    const query = `Hotels in ${params.destination} check-in ${params.checkIn} check-out ${params.checkOut} ${params.adults} adults${params.children ? ` ${params.children} children` : ""} ${params.category ?? ""}`;

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

    const results = await searchWithGrounding<HotelResult>(
      query,
      schema,
      params.maxResults ?? 6
    );

    return results.map((h, i) => ({
      ...h,
      id: h.id ?? `hotel-${i}`,
      amenities: h.amenities ?? [],
      priceStatus: h.priceStatus ?? "estimated",
    }));
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

  async search(params: FlightSearchParams): Promise<FlightResult[]> {
    const query = `Flights from ${params.origin} to ${params.destination} on ${params.departureDate}${params.returnDate ? ` return ${params.returnDate}` : " one-way"} ${params.adults} adults ${params.cabinClass ?? "economy"}`;

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

    const results = await searchWithGrounding<FlightResult>(
      query,
      schema,
      params.maxResults ?? 5
    );

    return results.map((f, i) => ({
      ...f,
      id: f.id ?? `flight-${i}`,
      priceStatus: f.priceStatus ?? "estimated",
    }));
  }
}

// ─── Activity Provider ────────────────────────────────────────────────────────

export class GeminiActivityProvider implements ActivityProvider {
  readonly name = "Gemini Activity Research";
  readonly supportsLivePricing = false;

  async search(params: ActivitySearchParams): Promise<ActivityResult[]> {
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

    const results = await searchWithGrounding<ActivityResult>(
      query,
      schema,
      params.maxResults ?? 8
    );

    return results.map((a, i) => ({
      ...a,
      id: a.id ?? `activity-${i}`,
      categories: a.categories ?? [],
      priceStatus: a.priceStatus ?? "estimated",
    }));
  }
}

// ─── Restaurant Provider ──────────────────────────────────────────────────────

export class GeminiRestaurantProvider implements RestaurantProvider {
  readonly name = "Gemini Restaurant Research";

  async search(params: RestaurantSearchParams): Promise<RestaurantResult[]> {
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

    const results = await searchWithGrounding<RestaurantResult>(
      query,
      schema,
      params.maxResults ?? 6
    );

    return results.map((r, i) => ({
      ...r,
      id: r.id ?? `restaurant-${i}`,
      priceStatus: r.priceStatus ?? "estimated",
    }));
  }
}

// ─── Destination Provider ─────────────────────────────────────────────────────

export class GeminiDestinationProvider implements DestinationProvider {
  readonly name = "Gemini Destination Research";

  async search(query: string, _context?: string): Promise<DestinationResult[]> {
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
    const prompt = `Research destinations for this travel query: "${query}"

Find up-to-date information about suitable destinations and return a JSON array of up to 5 results.
Schema: ${schema}

Be specific about WHY each destination matches the query. Research current travel conditions.
Return ONLY valid JSON array.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });

    const text = response.text ?? "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    try {
      const results = JSON.parse(jsonMatch[0]) as DestinationResult[];
      return results.map((d, i) => ({
        ...d,
        id: d.id ?? `dest-${i}`,
        highlights: d.highlights ?? [],
        bestFor: d.bestFor ?? [],
      }));
    } catch {
      return [];
    }
  }
}
