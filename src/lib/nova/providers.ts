/**
 * NOVA Travel Agent — Provider Abstractions
 *
 * All travel data providers implement these interfaces.
 * NOVA never depends on a concrete provider — only on these contracts.
 * Add new providers (Booking.com, Amadeus, etc.) by implementing the interfaces.
 */

import type {
  WebSearchResult,
  HotelResult,
  FlightResult,
  ActivityResult,
  RestaurantResult,
  DestinationResult,
  HotelSearchParams,
  FlightSearchParams,
  ActivitySearchParams,
  RestaurantSearchParams,
} from "./types";

// ─── Web Search ───────────────────────────────────────────────────────────────

export interface WebSearchProvider {
  readonly name: string;
  search(query: string, maxResults?: number): Promise<WebSearchResult[]>;
  openPage(url: string): Promise<string>;
}

// ─── Travel Providers ─────────────────────────────────────────────────────────

export interface HotelProvider {
  readonly name: string;
  readonly supportsLivePricing: boolean;
  search(params: HotelSearchParams): Promise<HotelResult[]>;
  checkAvailability(hotelId: string, params: HotelSearchParams): Promise<boolean>;
}

export interface FlightProvider {
  readonly name: string;
  readonly supportsLivePricing: boolean;
  search(params: FlightSearchParams): Promise<FlightResult[]>;
}

export interface ActivityProvider {
  readonly name: string;
  readonly supportsLivePricing: boolean;
  search(params: ActivitySearchParams): Promise<ActivityResult[]>;
}

export interface RestaurantProvider {
  readonly name: string;
  search(params: RestaurantSearchParams): Promise<RestaurantResult[]>;
}

export interface DestinationProvider {
  readonly name: string;
  search(query: string, context?: string): Promise<DestinationResult[]>;
}

// ─── Booking Provider ─────────────────────────────────────────────────────────

export interface BookingRequest {
  type: "hotel" | "flight" | "activity" | "restaurant";
  itemId: string;
  provider: string;
  params: Record<string, unknown>;
}

export interface BookingResult {
  success: boolean;
  referenceNumber?: string;
  confirmationUrl?: string;
  price?: number;
  currency?: string;
  cancellationPolicy?: string;
  error?: string;
}

export interface BookingProvider {
  readonly name: string;
  book(request: BookingRequest): Promise<BookingResult>;
  getStatus(referenceNumber: string): Promise<BookingResult>;
}

// ─── Provider Registry ────────────────────────────────────────────────────────

export interface ProviderRegistry {
  webSearch: WebSearchProvider;
  hotels: HotelProvider[];
  flights: FlightProvider[];
  activities: ActivityProvider[];
  restaurants: RestaurantProvider[];
  destinations: DestinationProvider[];
  booking: BookingProvider[];
}
