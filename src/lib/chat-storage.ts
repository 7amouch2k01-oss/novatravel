import type { Message, TripContext } from "@/lib/nova/types";
import { saveTripContext, clearSavedTripContext } from "@/lib/trip-storage";

export interface ChatSession {
  id: string;
  title: string;
  origin?: string | undefined;
  destination?: string | undefined;
  status: "confirmed" | "planning" | "new";
  messages: Message[];
  tripContext: TripContext;
  createdAt: number;
  updatedAt: number;
}

const CHATS_STORAGE_KEY = "tunitravel_chat_sessions";
const ACTIVE_CHAT_ID_KEY = "tunitravel_active_chat_id";

function capitalize(s: string): string {
  if (!s) return "";
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Automatically computes an elegant, human-readable route title
 * e.g. "Tunisia → Italy" or "Trip to Djerba" or "New Trip"
 */
export function formatRouteTitle(
  origin?: string | undefined,
  destination?: string | undefined,
  fallback = "New Trip"
): string {
  const o = origin ? capitalize(origin) : "";
  const d = destination ? capitalize(destination) : "";

  if (o && d && o.toLowerCase() !== d.toLowerCase()) {
    return `${o} → ${d}`;
  }
  if (d) {
    return `Trip to ${d}`;
  }
  if (o) {
    return `From ${o}`;
  }
  return fallback;
}

/**
 * Computes status based on tripContext and message count
 */
export function deriveChatStatus(
  context: TripContext,
  messagesCount = 0
): "confirmed" | "planning" | "new" {
  if (context.isPlanConfirmed) return "confirmed";
  if (
    context.destination ||
    (context.stops && context.stops.length > 0) ||
    context.durationDays ||
    context.budget ||
    messagesCount > 1
  ) {
    return "planning";
  }
  return "new";
}

/**
 * Loads all saved chat sessions from localStorage
 */
export function getAllChats(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as ChatSession[];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch (e) {
    console.error("Failed to load chat sessions:", e);
    return [];
  }
}

/**
 * Gets a specific chat session by id
 */
export function getChat(id: string): ChatSession | null {
  const chats = getAllChats();
  return chats.find((c) => c.id === id) ?? null;
}

/**
 * Saves or updates a chat session in localStorage
 */
export function saveChat(session: ChatSession): void {
  if (typeof window === "undefined") return;
  try {
    const chats = getAllChats();
    const index = chats.findIndex((c) => c.id === session.id);

    // Auto-update title and status if origin/destination or confirmation changed
    const autoTitle = formatRouteTitle(
      session.tripContext.origin ?? session.origin,
      session.tripContext.destination ?? session.destination,
      session.title || "New Trip"
    );

    const autoStatus = deriveChatStatus(session.tripContext, session.messages.length);

    const updatedSession: ChatSession = {
      ...session,
      title: autoTitle,
      origin: session.tripContext.origin ?? session.origin,
      destination: session.tripContext.destination ?? session.destination,
      status: autoStatus,
      updatedAt: Date.now(),
    };

    if (index >= 0) {
      chats[index] = updatedSession;
    } else {
      chats.unshift(updatedSession);
    }

    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    window.dispatchEvent(new Event("tunitravel_chats_updated"));

    // Also sync the tripContext to the active trip storage so /itinerary and /budget update
    if (getActiveChatId() === session.id) {
      saveTripContext(updatedSession.tripContext);
    }
  } catch (e) {
    console.error("Failed to save chat session:", e);
  }
}

/**
 * Deletes a chat session by id
 */
export function deleteChat(id: string): void {
  if (typeof window === "undefined") return;
  try {
    let chats = getAllChats();
    chats = chats.filter((c) => c.id !== id);
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));

    const activeId = getActiveChatId();
    if (activeId === id) {
      const nextActive = chats[0]?.id ?? null;
      if (nextActive) {
        setActiveChatId(nextActive);
      } else {
        localStorage.removeItem(ACTIVE_CHAT_ID_KEY);
        clearSavedTripContext();
      }
    }

    window.dispatchEvent(new Event("tunitravel_chats_updated"));
  } catch (e) {
    console.error("Failed to delete chat session:", e);
  }
}

/**
 * Gets the active chat ID
 */
export function getActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CHAT_ID_KEY);
}

/**
 * Sets the active chat ID
 */
export function setActiveChatId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_CHAT_ID_KEY, id);
  const chat = getChat(id);
  if (chat) {
    saveTripContext(chat.tripContext);
  }
  window.dispatchEvent(new Event("tunitravel_chats_updated"));
}

/**
 * Creates a brand new chat session and sets it active
 */
export function createNewChat(initial?: Partial<ChatSession>): ChatSession {
  const newId = `trip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newChat: ChatSession = {
    id: newId,
    title: initial?.title || "New Trip",
    origin: initial?.origin,
    destination: initial?.destination,
    status: "new",
    messages: initial?.messages ?? [],
    tripContext: initial?.tripContext ?? {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveChat(newChat);
  setActiveChatId(newId);
  return newChat;
}
