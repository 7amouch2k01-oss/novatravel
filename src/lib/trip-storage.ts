import type { TripContext } from "@/lib/nova/types";

const STORAGE_KEY = "tunitravel_active_trip";

/**
 * Loads the active trip context from localStorage (live sync across /nova and /itinerary)
 */
export function getSavedTripContext(): TripContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TripContext;
  } catch (e) {
    console.error("Failed to load active trip context", e);
    return null;
  }
}

/**
 * Saves the active trip context to localStorage and broadcasts an event for live update
 */
export function saveTripContext(context: TripContext) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    window.dispatchEvent(new Event("tunitravel_trip_updated"));
  } catch (e) {
    console.error("Failed to persist trip context", e);
  }
}

/**
 * Clears the active trip context from localStorage and broadcasts
 */
export function clearSavedTripContext() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("tunitravel_trip_updated"));
  } catch (e) {
    console.error("Failed to clear trip context", e);
  }
}
