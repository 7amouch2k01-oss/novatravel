/**
 * NOVA Travel Agent — Booking Provider
 *
 * Manages booking workflows. Supports three states:
 * - SEARCH: Options presented, no booking attempted
 * - BOOKING_READY: User confirmed item, all info collected
 * - CONFIRMED: Real provider confirmed reservation
 *
 * Currently: No live booking APIs connected. Shows "Continue with provider" link.
 * To enable live booking: implement AmadeusBookingProvider or BookingComProvider
 * using the BookingProvider interface in providers.ts.
 */

import type { BookingProvider, BookingRequest, BookingResult } from "../providers";
import type { BookingConfirmation } from "../types";

// ─── Link-Only Provider (no API key required) ─────────────────────────────────

export class LinkOnlyBookingProvider implements BookingProvider {
  readonly name = "Direct Provider Link";

  async book(_request: BookingRequest): Promise<BookingResult> {
    // This provider never fabricates a confirmation.
    // It directs users to the provider's own booking page.
    return {
      success: false,
      error:
        "No direct booking API is connected. Use the provider link to complete the reservation.",
    };
  }

  async getStatus(_referenceNumber: string): Promise<BookingResult> {
    return {
      success: false,
      error: "No booking API connected.",
    };
  }
}

// ─── Booking Workflow Manager ─────────────────────────────────────────────────

export interface BookingWorkflowState {
  phase: "search" | "confirm" | "processing" | "done" | "error";
  item?: {
    type: string;
    name: string;
    price?: number;
    currency?: string;
    date?: string;
    travelers?: number;
    cancellationPolicy?: string;
    bookingUrl?: string;
    provider?: string;
  };
  referenceNumber?: string;
  error?: string;
}

/**
 * Builds a BookingConfirmation from a workflow state.
 * NEVER says "confirmed" unless a real provider returned a reference number.
 */
export function buildBookingConfirmation(
  state: BookingWorkflowState
): BookingConfirmation {
  if (!state.item) {
    return {
      state: "search",
      provider: "Unknown",
      item: "Unknown item",
      message: "No item selected yet.",
    };
  }

  if (state.referenceNumber) {
    // Real confirmation from a provider API
    return {
      state: "confirmed",
      provider: state.item.provider ?? "Provider",
      referenceNumber: state.referenceNumber,
      item: state.item.name,
      ...(state.item.date !== undefined ? { date: state.item.date } : {}),
      ...(state.item.price !== undefined ? { price: state.item.price } : {}),
      ...(state.item.currency !== undefined ? { currency: state.item.currency } : {}),
      ...(state.item.cancellationPolicy !== undefined ? { cancellationPolicy: state.item.cancellationPolicy } : {}),
      ...(state.item.bookingUrl !== undefined ? { bookingUrl: state.item.bookingUrl } : {}),
      message: `Your booking is confirmed! Reference: ${state.referenceNumber}`,
    };
  }

  if (state.phase === "error") {
    return {
      state: "failed",
      provider: state.item.provider ?? "Provider",
      item: state.item.name,
      ...(state.item.date !== undefined ? { date: state.item.date } : {}),
      ...(state.item.price !== undefined ? { price: state.item.price } : {}),
      ...(state.item.currency !== undefined ? { currency: state.item.currency } : {}),
      message:
        state.error ??
        "The booking could not be completed. Please try the provider link directly.",
      ...(state.item.bookingUrl !== undefined ? { bookingUrl: state.item.bookingUrl } : {}),
    };
  }

  // Booking-ready state: show confirmation prompt with provider link
  return {
    state: "booking_ready",
    provider: state.item.provider ?? "Provider",
    item: state.item.name,
    ...(state.item.date !== undefined ? { date: state.item.date } : {}),
    ...(state.item.price !== undefined ? { price: state.item.price } : {}),
    ...(state.item.currency !== undefined ? { currency: state.item.currency } : {}),
    ...(state.item.cancellationPolicy !== undefined ? { cancellationPolicy: state.item.cancellationPolicy } : {}),
    ...(state.item.bookingUrl !== undefined ? { bookingUrl: state.item.bookingUrl } : {}),
    message: state.item.bookingUrl
      ? `Ready to book. Click "Continue with ${state.item.provider ?? "provider"}" to complete your reservation.`
      : `I've found the details for ${state.item.name}. No direct booking API is connected — I'll link you to the provider's booking page.`,
  };
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _bookingProvider: LinkOnlyBookingProvider | null = null;

export function getBookingProvider(): BookingProvider {
  if (!_bookingProvider) {
    _bookingProvider = new LinkOnlyBookingProvider();
  }
  return _bookingProvider;
}
