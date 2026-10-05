/**
 * NOVA Travel Agent — Core Type Definitions
 * All types used across the NOVA agent system.
 */

// ─── Conversation ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "nova";

export type ToolStatus = "running" | "done" | "error";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ToolCall {
  id: string;
  name: string;
  label: string;          // Human-readable label e.g. "Searching the web…"
  status: ToolStatus;
  result?: JsonValue | undefined;
  error?: string | undefined;
  startedAt: number;
  endedAt?: number | undefined;
}

export interface Source {
  title: string;
  url: string;
  type: "official" | "booking" | "review" | "news" | "ai-generated";
}

export type MessageContentType =
  | "text"
  | "hotel_results"
  | "flight_results"
  | "activity_results"
  | "restaurant_results"
  | "itinerary"
  | "itinerary_results"
  | "booking_summary"
  | "destination_results"
  | "document_analysis"
  | "error";

export interface HotelResult {
  id: string;
  name: string;
  stars: number;
  location: string;
  pricePerNight?: number | undefined;
  currency?: string | undefined;
  totalPrice?: number | undefined;
  rating?: number | undefined;
  reviewCount?: number | undefined;
  amenities: string[];
  cancellationPolicy?: string | undefined;
  imageUrl?: string | undefined;
  bookingUrl?: string | undefined;
  provider: string;
  priceStatus: "verified" | "estimated" | "unavailable";
  available?: boolean | undefined;
}

export interface FlightResult {
  id: string;
  airline: string;
  flightNumber?: string | undefined;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  price?: number | undefined;
  currency?: string | undefined;
  cabinClass: string;
  bookingUrl?: string | undefined;
  provider: string;
  priceStatus: "verified" | "estimated" | "unavailable";
  available?: boolean | undefined;
}

export interface ActivityResult {
  id: string;
  name: string;
  location: string;
  duration?: string | undefined;
  price?: number | undefined;
  currency?: string | undefined;
  rating?: number | undefined;
  reviewCount?: number | undefined;
  description: string;
  categories: string[];
  bookingUrl?: string | undefined;
  imageUrl?: string | undefined;
  provider: string;
  priceStatus: "verified" | "estimated" | "unavailable";
}

export interface RestaurantResult {
  id: string;
  name: string;
  location: string;
  cuisine: string;
  priceRange?: string | undefined;
  rating?: number | undefined;
  reviewCount?: number | undefined;
  description: string;
  bookingUrl?: string | undefined;
  websiteUrl?: string | undefined;
  imageUrl?: string | undefined;
  priceStatus: "verified" | "estimated" | "unavailable";
}

export interface ItineraryDay {
  day: number;
  city: string;
  theme: string;
  items: ItineraryItem[];
}

export interface ItineraryItem {
  time?: string | undefined;
  slot: "Morning" | "Afternoon" | "Evening" | "Night" | "Flexible";
  place: string;
  duration?: string | undefined;
  description: string;
  estimatedCost?: number | undefined;
  currency?: string | undefined;
  bookingUrl?: string | undefined;
  mapUrl?: string | undefined;
  transport?: string | undefined;
}

export interface Itinerary {
  id: string;
  title: string;
  destination: string;
  days: ItineraryDay[];
  totalEstimatedCost?: number | undefined;
  currency?: string | undefined;
  travelers?: number | undefined;
  notes?: string | undefined;
}

export type BookingType = "hotel" | "flight";
export type BookingState =
  | "search"
  | "needs_details"
  | "options_found"
  | "booking_ready"
  | "confirmed"
  | "failed";

export interface BookingConfirmation {
  state: BookingState;
  provider: string;
  type?: BookingType | undefined;
  detailsNeeded?: string[] | undefined;
  referenceNumber?: string | undefined;
  item: string;
  date?: string | undefined;
  time?: string | undefined;
  price?: number | undefined;
  currency?: string | undefined;
  cancellationPolicy?: string | undefined;
  bookingUrl?: string | undefined;
  message: string;
}

export interface DocumentAttachment {
  name: string;
  mimeType: string;
  base64: string; // raw base64 data
  sizeBytes: number;
}

export interface DocumentAnalysisResult {
  documentType: string; // e.g. "Flight Ticket / Boarding Pass", "Hotel Reservation", "Visa / Passport", etc.
  fileName: string;
  summary: string;
  keyDetails: Record<string, string>;
  flightInfo?: {
    airline?: string | undefined;
    flightNumber?: string | undefined;
    departureCity?: string | undefined;
    departureTime?: string | undefined;
    departureDate?: string | undefined;
    arrivalCity?: string | undefined;
    arrivalTime?: string | undefined;
    arrivalDate?: string | undefined;
    duration?: string | undefined;
    seat?: string | undefined;
    gate?: string | undefined;
    terminal?: string | undefined;
    baggage?: string | undefined;
    passengerName?: string | undefined;
    bookingReference?: string | undefined;
  } | undefined;
  hotelInfo?: {
    hotelName?: string | undefined;
    checkIn?: string | undefined;
    checkOut?: string | undefined;
    address?: string | undefined;
    confirmationNumber?: string | undefined;
    guestName?: string | undefined;
  } | undefined;
  answeredQuestion?: string | undefined;
}

export interface MessageContent {
  type: MessageContentType;
  text?: string | undefined;
  hotels?: HotelResult[] | undefined;
  flights?: FlightResult[] | undefined;
  activities?: ActivityResult[] | undefined;
  restaurants?: RestaurantResult[] | undefined;
  itinerary?: Itinerary | undefined;
  booking?: BookingConfirmation | undefined;
  sources?: Source[] | undefined;
  destinations?: DestinationResult[] | undefined;
  documentAnalysis?: DocumentAnalysisResult | undefined;
}

export interface DestinationResult {
  id: string;
  name: string;
  country: string;
  region?: string | undefined;
  description: string;
  highlights: string[];
  bestFor: string[];
  bestSeason?: string | undefined;
  averageCost?: string | undefined;
  imageUrl?: string | undefined;
  matchScore?: number | undefined;
  matchReason?: string | undefined;
  sources?: Source[] | undefined;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent;
  attachment?: DocumentAttachment | undefined;
  toolCalls?: ToolCall[] | undefined;
  timestamp: number;
}

// ─── Trip Context ─────────────────────────────────────────────────────────────

export interface TripContext {
  destination?: string | undefined;
  origin?: string | undefined;
  departureDate?: string | undefined;
  returnDate?: string | undefined;
  durationDays?: number | undefined;
  travelers?: number | undefined;
  adults?: number | undefined;
  children?: number | undefined;
  childrenAges?: number[] | undefined;
  rooms?: number | undefined;
  cabinClass?: string | undefined;
  budget?: number | undefined;
  currency?: string | undefined;
  accommodationPreference?: string | undefined;   // "budget" | "mid-range" | "luxury" | "any"
  transportationPreference?: string | undefined;
  interests?: string[] | undefined;
  dietaryPreferences?: string[] | undefined;
  accessibilityNeeds?: string[] | undefined;
  preferredActivities?: string[] | undefined;
  tripStyle?: string | undefined;                 // "relaxed" | "active" | "cultural" | "adventure"
  hotelName?: string | undefined;                 // selected hotel for booking
  flightId?: string | undefined;                  // selected flight for booking
  bookingType?: BookingType | undefined;
  bookingStatus?: "collecting_details" | "awaiting_selection" | undefined;
  stops?: string[] | undefined;                   // real destination slugs currently in the trip
  proposedItinerary?: Itinerary | undefined;      // last generated plan awaiting the user's Confirm Plan click
  confirmedDaysPlan?: ItineraryDay[] | undefined;  // confirmed day-by-day plan
  isPlanConfirmed?: boolean | undefined;          // whether user approved/confirmed plan
}

// ─── Agent Intent ─────────────────────────────────────────────────────────────

export type AgentMode = "general" | "travel";

export type IntentType =
  | "GENERAL_QUERY"
  | "GENERAL_CONVERSATION"
  | "TRAVEL_RESEARCH"
  | "TRIP_PLANNING"
  | "HOTEL_SEARCH"
  | "FLIGHT_SEARCH"
  | "RESTAURANT_SEARCH"
  | "ACTIVITY_SEARCH"
  | "DESTINATION_RESEARCH"
  | "BOOKING_REQUEST"
  | "BOOKING_CONFIRMATION"
  | "CONFIRM_PLAN"
  | "TRIP_MODIFICATION"
  | "ITINERARY_BUILD"
  | "BUDGET_CALCULATION"
  | "DOCUMENT_ANALYSIS";

export interface DetectedIntent {
  type: IntentType;
  mode: AgentMode;
  confidence: number;
  extractedContext: Partial<TripContext>;
}

// ─── Agent Request / Response ──────────────────────────────────────────────────

export interface AgentRequest {
  message: string;
  history: Array<{ role: "user" | "model"; text: string }>;
  tripContext: TripContext;
  mode: AgentMode;
  attachment?: DocumentAttachment | undefined;
}

export interface AgentResponse {
  content: MessageContent;
  toolCalls: ToolCall[];
  updatedTripContext: TripContext;
  suggestedFollowUps?: string[] | undefined;
}

// ─── Provider Interfaces ──────────────────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number | undefined;
  childrenAges?: number[] | undefined;
  rooms?: number | undefined;
  maxResults?: number | undefined;
  budgetPerNight?: number | undefined;
  currency?: string | undefined;
  category?: string | undefined;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | undefined;
  adults: number;
  children?: number | undefined;
  childrenAges?: number[] | undefined;
  cabinClass?: string | undefined;
  maxResults?: number | undefined;
}

export interface ActivitySearchParams {
  destination: string;
  interests?: string[] | undefined;
  date?: string | undefined;
  duration?: string | undefined;
  budget?: number | undefined;
  currency?: string | undefined;
  maxResults?: number | undefined;
}

export interface RestaurantSearchParams {
  destination: string;
  cuisine?: string | undefined;
  priceRange?: string | undefined;
  date?: string | undefined;
  partySize?: number | undefined;
  maxResults?: number | undefined;
}
