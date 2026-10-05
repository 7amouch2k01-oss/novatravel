/**
 * NOVA Travel Agent — Result Cards
 *
 * Beautiful, information-rich cards for hotels, flights, activities,
 * restaurants, destinations, and bookings.
 *
 * Each card clearly labels data provenance:
 * - VERIFIED: from live booking source
 * - ESTIMATED: typical price range
 * - UNAVAILABLE: no price data found
 */

import { cn } from "@/lib/utils";
import { NOVA_LAUNCH_MARKET } from "@/lib/nova/markets";
import type {
  HotelResult,
  FlightResult,
  ActivityResult,
  RestaurantResult,
  DestinationResult,
  BookingConfirmation,
  Source,
  Itinerary,
  DocumentAnalysisResult,
} from "@/lib/nova/types";
import {
  Star,
  MapPin,
  Clock,
  Users,
  Wifi,
  Coffee,
  Waves,
  ExternalLink,
  Plane,
  Hotel,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  Info,
  Globe,
  ArrowRight,
  Calendar,
  Check,
  FileText,
  Luggage,
  Ticket,
  ShieldCheck,
  PlaneTakeoff,
  PlaneLanding,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Price Badge ──────────────────────────────────────────────────────────────

function PriceBadge({
  status,
  price,
  currency,
  period,
}: {
  status: "verified" | "estimated" | "unavailable";
  price?: number | undefined;
  currency?: string | undefined;
  period?: string | undefined;
}) {
  if (status === "unavailable" || !price) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Info className="size-3" /> Price unavailable
      </Badge>
    );
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <div className="flex flex-col items-end">
      <span className="font-display text-lg font-semibold">
        {currency ?? ""} {formatted}
        {period && <span className="text-sm font-normal text-muted-foreground">/{period}</span>}
      </span>
      <Badge
        variant={status === "verified" ? "default" : "secondary"}
        className={cn("gap-1 text-[10px]", status === "verified" ? "bg-accent/15 text-accent" : "")}
      >
        {status === "verified" ? (
          <CheckCircle2 className="size-2.5" />
        ) : (
          <AlertCircle className="size-2.5" />
        )}
        {status === "verified" ? "Live price" : "Estimated"}
      </Badge>
    </div>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i < count ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          )}
        />
      ))}
    </span>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────

export function HotelCard({ hotel, compact = false }: { hotel: HotelResult; compact?: boolean }) {
  return (
    <div className={cn(
      "group rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-soft",
      compact ? "p-4" : "p-5"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Stars count={hotel.stars} />
            {hotel.rating && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {hotel.rating.toFixed(1)}
                {hotel.reviewCount && (
                  <span className="text-muted-foreground">({hotel.reviewCount.toLocaleString()})</span>
                )}
              </Badge>
            )}
          </div>
          <h3 className="mt-1.5 font-semibold text-base truncate">{hotel.name}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{hotel.location}</span>
          </div>
          {!compact && hotel.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {hotel.amenities.slice(0, 4).map((a) => (
                <Badge key={a} variant="secondary" className="text-xs gap-1">
                  {a === "WiFi" ? <Wifi className="size-3" /> : a === "Pool" ? <Waves className="size-3" /> : a === "Breakfast" ? <Coffee className="size-3" /> : null}
                  {a}
                </Badge>
              ))}
              {hotel.amenities.length > 4 && (
                <Badge variant="secondary" className="text-xs">+{hotel.amenities.length - 4} more</Badge>
              )}
            </div>
          )}
          {!compact && hotel.cancellationPolicy && (
            <p className="mt-2 text-xs text-muted-foreground">{hotel.cancellationPolicy}</p>
          )}
        </div>
        <PriceBadge
          status={hotel.priceStatus}
          price={hotel.pricePerNight}
          currency={hotel.currency}
          period="night"
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{hotel.provider}</span>
        {hotel.bookingUrl && (
          <Button size="sm" asChild className="gap-1.5">
            <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer">
              View <ExternalLink className="size-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Flight Card ──────────────────────────────────────────────────────────────

export function FlightCard({ flight }: { flight: FlightResult }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-secondary">
            <Plane className="size-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">{flight.airline}</p>
            {flight.flightNumber && (
              <p className="text-xs text-muted-foreground">{flight.flightNumber}</p>
            )}
          </div>
        </div>
        <PriceBadge
          status={flight.priceStatus}
          price={flight.price}
          currency={flight.currency}
        />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="text-center">
          <p className="font-display text-xl font-semibold">{flight.departureTime}</p>
          <p className="text-xs font-medium text-muted-foreground">{flight.origin}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3" />{flight.duration}
          </div>
          <div className="relative w-full flex items-center">
            <div className="h-px flex-1 bg-border" />
            {flight.stops === 0 ? (
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-2 text-[10px] text-accent font-medium">Direct</span>
            ) : (
              <span className="absolute left-1/2 -translate-x-1/2 -translate-y-2 text-[10px] text-muted-foreground">{flight.stops} stop</span>
            )}
            <Plane className="size-3 text-muted-foreground rotate-90 absolute left-1/2 -translate-x-1/2 translate-y-0" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-semibold">{flight.arrivalTime}</p>
          <p className="text-xs font-medium text-muted-foreground">{flight.destination}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{flight.cabinClass}</Badge>
          <span className="text-xs text-muted-foreground">{flight.provider}</span>
        </div>
        {flight.bookingUrl && (
          <Button size="sm" asChild className="gap-1.5">
            <a href={flight.bookingUrl} target="_blank" rel="noopener noreferrer">
              Book <ExternalLink className="size-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Activity Card ────────────────────────────────────────────────────────────

export function ActivityCard({ activity }: { activity: ActivityResult }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {activity.categories.slice(0, 2).map((c) => (
              <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
            ))}
          </div>
          <h3 className="font-semibold">{activity.name}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{activity.location}</span>
          </div>
          {activity.duration && (
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              {activity.duration}
            </div>
          )}
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
        </div>
        <PriceBadge
          status={activity.priceStatus}
          price={activity.price}
          currency={activity.currency}
        />
      </div>
      {activity.bookingUrl && (
        <div className="mt-4 flex justify-end">
          <Button size="sm" asChild className="gap-1.5">
            <a href={activity.bookingUrl} target="_blank" rel="noopener noreferrer">
              Book <ExternalLink className="size-3" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Restaurant Card ──────────────────────────────────────────────────────────

export function RestaurantCard({ restaurant }: { restaurant: RestaurantResult }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="size-4 text-terracotta" />
            <span className="text-sm text-muted-foreground">{restaurant.cuisine}</span>
            {restaurant.priceRange && (
              <Badge variant="secondary" className="text-xs ml-auto">{restaurant.priceRange}</Badge>
            )}
          </div>
          <h3 className="font-semibold">{restaurant.name}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{restaurant.location}</span>
          </div>
          {restaurant.rating && (
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{restaurant.rating.toFixed(1)}</span>
              {restaurant.reviewCount && (
                <span className="text-muted-foreground">({restaurant.reviewCount.toLocaleString()} reviews)</span>
              )}
            </div>
          )}
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{restaurant.description}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {restaurant.websiteUrl && (
          <Button size="sm" variant="ghost" asChild className="gap-1.5">
            <a href={restaurant.websiteUrl} target="_blank" rel="noopener noreferrer">
              Website <Globe className="size-3" />
            </a>
          </Button>
        )}
        {restaurant.bookingUrl && (
          <Button size="sm" asChild className="gap-1.5">
            <a href={restaurant.bookingUrl} target="_blank" rel="noopener noreferrer">
              Reserve <ArrowRight className="size-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Destination Card ─────────────────────────────────────────────────────────

export function DestinationCard({ destination }: { destination: DestinationResult }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-terracotta" />
            <span className="text-sm text-muted-foreground">{destination.country}{destination.region ? ` · ${destination.region}` : ""}</span>
            {destination.matchScore !== undefined && (
              <Badge className="ml-auto gap-1 bg-accent/15 text-accent text-xs">
                <Star className="size-3" />{destination.matchScore}% match
              </Badge>
            )}
          </div>
          <h3 className="mt-1.5 text-lg font-semibold">{destination.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{destination.description}</p>
          {destination.matchReason && (
            <p className="mt-2 text-sm text-accent font-medium">{destination.matchReason}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {destination.bestFor.slice(0, 4).map((b) => (
              <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
            ))}
          </div>
          {destination.bestSeason && (
            <p className="mt-2 text-xs text-muted-foreground">Best season: {destination.bestSeason}</p>
          )}
          {destination.averageCost && (
            <p className="mt-1 text-xs text-muted-foreground">Cost: {destination.averageCost}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────

export function BookingCard({ booking }: { booking: BookingConfirmation }) {
  const isConfirmed = booking.state === "confirmed";
  const isFailed = booking.state === "failed";
  const isReady = booking.state === "booking_ready";
  const needsDetails = booking.state === "needs_details";
  const optionsFound = booking.state === "options_found";
  const isFlight = booking.type === "flight";

  return (
    <div className={cn(
      "rounded-2xl border p-5",
      isConfirmed && "border-accent/30 bg-accent/5",
      isFailed && "border-destructive/30 bg-destructive/5",
      (isReady || needsDetails || optionsFound || booking.state === "search") && "border-border bg-card"
    )}>
      <div className="flex items-center gap-3">
        {isConfirmed && <CheckCircle2 className="size-5 text-accent" />}
        {isFailed && <AlertCircle className="size-5 text-destructive" />}
        {(isReady || needsDetails || optionsFound || booking.state === "search") && (
          isFlight ? <Plane className="size-5 text-muted-foreground" /> : <Hotel className="size-5 text-muted-foreground" />
        )}
        <h3 className="font-semibold">
          {isConfirmed
            ? "Booking Confirmed"
            : isFailed
              ? "Booking Failed"
              : needsDetails
                ? "Trip details needed"
                : optionsFound
                  ? "Options to review"
                  : isReady
                    ? "Ready to review"
                    : "Preparing options"}
        </h3>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Item</span>
          <span className="font-medium">{booking.item}</span>
        </div>
        {booking.date && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{booking.date}</span>
          </div>
        )}
        {booking.price !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">
              {booking.currency} {booking.price.toLocaleString()}
            </span>
          </div>
        )}
        {booking.referenceNumber && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-mono font-medium text-accent">{booking.referenceNumber}</span>
          </div>
        )}
        {booking.cancellationPolicy && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cancellation</span>
            <span className="text-right max-w-[200px]">{booking.cancellationPolicy}</span>
          </div>
        )}
      </div>

      {booking.detailsNeeded && booking.detailsNeeded.length > 0 && (
        <div className="mt-4 rounded-xl bg-secondary/70 p-3">
          <p className="text-xs font-semibold text-foreground">Please share:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {booking.detailsNeeded.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground">{booking.message}</p>

      {booking.bookingUrl && (
        <div className="mt-4">
          <Button asChild className="w-full gap-2">
            <a href={booking.bookingUrl} target="_blank" rel="noopener noreferrer">
              Continue with {booking.provider} <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sources ──────────────────────────────────────────────────────────────────

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Sources
      </p>
      <div className="flex flex-wrap gap-2">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <Globe className="size-3" />
            {s.title.length > 30 ? s.title.slice(0, 30) + "…" : s.title}
            <ExternalLink className="size-2.5" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Itinerary Card with Confirmation ─────────────────────────────────────────

export function ItineraryCard({
  itinerary,
  isConfirmed = false,
  onConfirm,
}: {
  itinerary: Itinerary;
  isConfirmed?: boolean | undefined;
  onConfirm?: ((itinerary: Itinerary) => void) | undefined;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {itinerary.days.length} Days Itinerary
            </span>
            {isConfirmed && (
              <Badge className="bg-emerald-500/15 text-emerald-600 text-xs gap-1 border-emerald-500/20">
                <Check className="size-3" /> Confirmed Plan
              </Badge>
            )}
          </div>
          <h3 className="mt-1 text-lg font-semibold">{itinerary.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Destination: <span className="text-foreground font-medium">{itinerary.destination}</span>
          </p>
        </div>
        {itinerary.totalEstimatedCost && (
          <div className="text-right">
            <span className="font-display text-lg font-semibold">
              {itinerary.currency ?? NOVA_LAUNCH_MARKET.defaultCurrency} {itinerary.totalEstimatedCost.toLocaleString()}
            </span>
            <p className="text-[10px] text-muted-foreground">estimated total</p>
          </div>
        )}
      </div>

      {/* Days Preview */}
      <div className="mt-4 space-y-3">
        {itinerary.days.map((day) => (
          <div key={day.day} className="rounded-xl border border-border/60 bg-secondary/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 bg-accent/10 rounded">
                  DAY {day.day}
                </span>
                <span className="text-sm font-semibold">{day.city}</span>
              </div>
              <span className="text-xs text-muted-foreground">{day.theme}</span>
            </div>
            {day.items && day.items.length > 0 && (
              <div className="mt-2 space-y-1.5 pl-2 border-l border-border/60">
                {day.items.map((item, idx) => (
                  <div key={idx} className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-foreground/90">{item.place}</span>
                    <span className="text-muted-foreground">{item.slot}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Action Button */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          {isConfirmed ? "This plan is active and showing on your live map." : "Confirm this plan to lock in stops & map route."}
        </span>
        {!isConfirmed && onConfirm && (
          <Button
            size="sm"
            onClick={() => onConfirm(itinerary)}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Check className="size-3.5" /> Confirm Plan
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Document Intelligence Card ───────────────────────────────────────────────

export function DocumentAnalysisCard({
  analysis,
}: {
  analysis: DocumentAnalysisResult;
}) {
  const flight = analysis.flightInfo;
  const hotel = analysis.hotelInfo;
  const isFlight =
    analysis.documentType.toLowerCase().includes("flight") ||
    analysis.documentType.toLowerCase().includes("boarding") ||
    analysis.documentType.toLowerCase().includes("ticket") ||
    Boolean(flight?.departureTime || flight?.airline);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {/* Document Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent">
            {isFlight ? <Ticket className="size-4" /> : <FileText className="size-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                AI DOCUMENT INTELLIGENCE
              </span>
              <Badge variant="outline" className="text-[10px] py-0 border-accent/30 text-accent">
                {analysis.documentType}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-foreground truncate max-w-[280px]">
              {analysis.fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck className="size-3.5" />
          Verified & Analyzed
        </div>
      </div>

      {/* Flight Boarding Pass Style Card if flight ticket */}
      {isFlight && (flight?.departureCity || flight?.arrivalCity || flight?.departureTime) && (
        <div className="border-b border-dashed border-border/80 bg-secondary/20 p-5">
          {/* Airline & Flight No Header */}
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-accent flex items-center gap-1.5">
              <Plane className="size-3.5" />
              {flight.airline ?? "Commercial Airline"}
            </span>
            {flight.flightNumber && (
              <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-muted-foreground">
                Flight {flight.flightNumber}
              </span>
            )}
          </div>

          {/* Departure (starts flying) ➔ Arrival (stops flying / reaches destination) */}
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Departure */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <PlaneTakeoff className="size-3 text-accent" /> Starts Flying
              </p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {flight.departureTime ?? "—"}
              </p>
              <p className="text-sm font-semibold text-foreground/90">
                {flight.departureCity ?? "Origin"}
              </p>
              {flight.departureDate && (
                <p className="text-[11px] text-muted-foreground">{flight.departureDate}</p>
              )}
            </div>

            {/* Flight Path Arrow / Duration */}
            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] text-muted-foreground font-medium">
                {flight.duration ?? "Direct"}
              </span>
              <div className="my-1 flex items-center">
                <div className="h-0.5 w-8 bg-border sm:w-12" />
                <ArrowRight className="size-4 text-accent -ml-1 shrink-0" />
              </div>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                En Route
              </span>
            </div>

            {/* Arrival */}
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-end gap-1">
                <PlaneLanding className="size-3 text-accent" /> Reaches Destination
              </p>
              <p className="mt-1 font-display text-xl font-bold text-foreground">
                {flight.arrivalTime ?? "—"}
              </p>
              <p className="text-sm font-semibold text-foreground/90">
                {flight.arrivalCity ?? "Destination"}
              </p>
              {flight.arrivalDate && (
                <p className="text-[11px] text-muted-foreground">{flight.arrivalDate}</p>
              )}
            </div>
          </div>

          {/* Passenger, Seat, Gate, Terminal, Baggage */}
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-card p-3 border border-border sm:grid-cols-4 text-xs">
            {flight.passengerName && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Passenger</span>
                <p className="font-semibold truncate">{flight.passengerName}</p>
              </div>
            )}
            <div>
              <span className="text-[10px] text-muted-foreground uppercase">Seat & Gate</span>
              <p className="font-semibold font-mono">
                {flight.seat ? `Seat ${flight.seat}` : "TBD"} · {flight.gate ? `Gate ${flight.gate}` : "Gate TBA"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Luggage className="size-3" /> Baggage
              </span>
              <p className="font-semibold truncate">
                {flight.baggage ?? "Standard Allowance"}
              </p>
            </div>
            {flight.bookingReference && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">PNR / Ref</span>
                <p className="font-mono font-bold text-accent truncate">
                  {flight.bookingReference}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hotel Reservation details if applicable */}
      {hotel && (hotel.hotelName || hotel.checkIn) && (
        <div className="border-b border-border bg-secondary/20 p-5">
          <div className="flex items-center gap-2">
            <Hotel className="size-4 text-accent" />
            <h4 className="font-semibold text-foreground">{hotel.hotelName ?? "Accommodation"}</h4>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase">Check-in</span>
              <p className="font-semibold">{hotel.checkIn ?? "—"}</p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase">Check-out</span>
              <p className="font-semibold">{hotel.checkOut ?? "—"}</p>
            </div>
            {hotel.confirmationNumber && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase">Confirmation</span>
                <p className="font-mono font-bold text-accent">{hotel.confirmationNumber}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Details Grid */}
      {analysis.keyDetails && Object.keys(analysis.keyDetails).length > 0 && (
        <div className="p-4 border-b border-border bg-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Key Extracted Parameters
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
            {Object.entries(analysis.keyDetails).map(([key, val]) => (
              <div key={key} className="flex items-baseline justify-between rounded-lg bg-secondary/50 px-2.5 py-1.5">
                <span className="text-muted-foreground font-medium">{key}</span>
                <span className="font-semibold text-foreground">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Narrative */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Document Summary & Schedule
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {analysis.summary}
          </p>
        </div>

        {/* Answered Question if user asked one */}
        {analysis.answeredQuestion && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs">
            <span className="font-bold text-accent flex items-center gap-1.5">
              <Info className="size-3.5" /> Answer to your query
            </span>
            <p className="mt-1 text-foreground leading-relaxed">
              {analysis.answeredQuestion}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
