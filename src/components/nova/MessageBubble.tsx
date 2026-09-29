/**
 * NOVA Travel Agent — Message Bubble
 *
 * Renders a single conversation message — user or NOVA.
 * NOVA messages can contain rich content: text + result cards + sources.
 */

import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { Message } from "@/lib/nova/types";
import { NovaMark } from "./NovaMark";
import { ToolCallIndicator } from "./ToolCallIndicator";
import {
  HotelCard,
  FlightCard,
  ActivityCard,
  RestaurantCard,
  DestinationCard,
  BookingCard,
  SourceList,
  ItineraryCard,
  DocumentAnalysisCard,
} from "./ResultCards";
import type { Itinerary } from "@/lib/nova/types";

// ─── Simple Markdown-ish Text ─────────────────────────────────────────────────

function RichText({ text }: { text: string }) {
  // Convert **bold**, *italic*, line breaks
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\n)/g);
  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part === "\n") {
          return <br key={i} />;
        }
        return part;
      })}
    </span>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean | undefined;
  isPlanConfirmed?: boolean | undefined;
  onConfirmItinerary?: ((itinerary: Itinerary) => void) | undefined;
}

export function MessageBubble({ message, isLast, isPlanConfirmed, onConfirmItinerary }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const content = message.content;

  if (isUser) {
    return (
      <div className="animate-rise ml-auto max-w-[85%]">
        <div className="rounded-2xl rounded-br-md bg-primary px-5 py-3.5 text-primary-foreground shadow-xs">
          {message.attachment && (
            <div className="mb-2.5 flex items-center gap-2.5 rounded-xl bg-primary-foreground/15 px-3 py-2 text-xs backdrop-blur-xs border border-primary-foreground/20">
              <FileText className="size-4 shrink-0 text-primary-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-primary-foreground">{message.attachment.name}</p>
                <p className="text-[10px] text-primary-foreground/75">
                  {Math.round(message.attachment.sizeBytes / 1024)} KB · {message.attachment.mimeType}
                </p>
              </div>
            </div>
          )}
          {content.text && <p className="leading-relaxed">{content.text}</p>}
        </div>
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    );
  }

  // NOVA message
  return (
    <div className="animate-rise flex gap-3">
      <NovaMark className="mt-0.5 size-8 shrink-0" />
      <div className="flex-1 min-w-0 space-y-4">
        {/* Tool calls (completed) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallIndicator toolCalls={message.toolCalls} />
        )}

        {/* Main text */}
        {content.text && (
          <p className="text-[15px] leading-relaxed">
            <RichText text={content.text} />
          </p>
        )}

        {/* Hotel results */}
        {content.hotels && content.hotels.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Hotels found
            </p>
            {content.hotels.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}

        {/* Flight results */}
        {content.flights && content.flights.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Flights found
            </p>
            {content.flights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>
        )}

        {/* Activity results */}
        {content.activities && content.activities.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Activities & attractions
            </p>
            {content.activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {/* Restaurant results */}
        {content.restaurants && content.restaurants.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Restaurants
            </p>
            {content.restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

        {/* Destination results */}
        {content.destinations && content.destinations.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Destinations
            </p>
            {content.destinations.map((dest) => (
              <DestinationCard key={dest.id} destination={dest} />
            ))}
          </div>
        )}

        {/* Document Analysis / Ticket Intelligence */}
        {content.documentAnalysis && (
          <DocumentAnalysisCard analysis={content.documentAnalysis} />
        )}

        {/* Itinerary */}
        {content.itinerary && (
          <ItineraryCard
            itinerary={content.itinerary}
            isConfirmed={isPlanConfirmed}
            onConfirm={onConfirmItinerary}
          />
        )}

        {/* Booking summary */}
        {content.booking && <BookingCard booking={content.booking} />}

        {/* Sources */}
        {content.sources && content.sources.length > 0 && (
          <SourceList sources={content.sources} />
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {isLast && " · NOVA"}
        </p>
      </div>
    </div>
  );
}
