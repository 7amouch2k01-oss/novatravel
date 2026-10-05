import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Clock,
  Car,
  Calendar,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { SiteNav } from "@/components/nova/SiteNav";
import { LiveGoogleMap } from "@/components/nova/LiveGoogleMap";
import { NovaMark } from "@/components/nova/NovaMark";
import { bySlug } from "@/lib/tunisia";
import { getSavedTripContext, clearSavedTripContext } from "@/lib/trip-storage";
import type { TripContext, ItineraryDay } from "@/lib/nova/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/itinerary")({
  head: () => ({
    meta: [
      { title: "Your Live Journey — Personalized Itinerary by NOVA | TUNITRAVEL" },
      {
        name: "description",
        content:
          "Live, real-time itinerary and interactive Google Map powered by your conversation with NOVA.",
      },
      { property: "og:title", content: "Your Live Journey — TUNITRAVEL" },
      { property: "og:description", content: "Real-time travel plan personalized by NOVA" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ItineraryPage,
});

function ItineraryPage() {
  const [tripContext, setTripContext] = useState<TripContext | null>(null);

  useEffect(() => {
    // Initial load
    setTripContext(getSavedTripContext());

    // Listen for live updates from chat
    const handleUpdate = () => {
      setTripContext(getSavedTripContext());
    };

    window.addEventListener("tunitravel_trip_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("tunitravel_trip_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const hasConfirmedPlan = Boolean(
    tripContext?.isPlanConfirmed &&
      tripContext?.confirmedDaysPlan &&
      tripContext.confirmedDaysPlan.length > 0
  );

  const daysPlan: ItineraryDay[] = tripContext?.confirmedDaysPlan ?? [];

  // Active stops from user's confirmed days plan, tripContext stops, or destination
  const activeStops = (
    tripContext?.stops && tripContext.stops.length > 0
      ? tripContext.stops
      : hasConfirmedPlan
      ? Array.from(new Set(daysPlan.map((d) => d.city).filter(Boolean)))
      : tripContext?.destination
      ? [tripContext.destination]
      : []
  );

  const destinationTitle = tripContext?.destination
    ? `${tripContext.destination} Journey`
    : "Your Journey";

  const handleClearTrip = () => {
    if (confirm("Reset current trip plan and start fresh with NOVA?")) {
      clearSavedTripContext();
      setTripContext(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        {/* Header with live status badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <NovaMark className="size-5" />
              <span>Personalized by NOVA</span>
              {hasConfirmedPlan ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  <CheckCircle2 className="size-3.5" />
                  Confirmed Live Plan
                </span>
              ) : tripContext?.destination ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                  <Sparkles className="size-3.5" />
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Awaiting Input
                </span>
              )}
            </div>

            <h1 className="mt-3 text-4xl font-semibold md:text-6xl">{destinationTitle}</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {tripContext?.durationDays ? `${tripContext.durationDays} days` : "Custom duration"} ·{" "}
              {tripContext?.travelers ? `${tripContext.travelers} traveler(s)` : "Travelers"}{" "}
              {tripContext?.budget
                ? `· ${tripContext.currency ?? "TND"} ${tripContext.budget.toLocaleString()} budget`
                : ""}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {tripContext?.destination && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearTrip}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="size-3.5" />
                Reset Plan
              </Button>
            )}
            <Link
              to="/nova"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="size-4 text-accent" />
              Talk to NOVA
            </Link>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_420px]">
          {/* Left Column: Day-by-Day Timeline */}
          <div className="space-y-12">
            {hasConfirmedPlan ? (
              daysPlan.map((day) => (
                <section key={day.day} className="animate-rise">
                  <div className="flex items-baseline gap-4">
                    <span className="font-display text-sm font-bold tracking-[0.2em] text-accent">
                      DAY {day.day}
                    </span>
                    <h2 className="text-3xl font-semibold">{day.city}</h2>
                  </div>
                  {day.theme && <p className="mt-1 text-muted-foreground">{day.theme}</p>}

                  <ol className="relative mt-8 space-y-4 border-l border-dashed border-border pl-8">
                    {day.items.map((item, idx) => {
                      const dest = bySlug(item.place.toLowerCase());
                      const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${item.place}, ${day.city}, Tunisia`
                      )}`;

                      return (
                        <li key={idx} className="relative">
                          {/* Timeline dot */}
                          <span className="absolute -left-[39px] top-6 size-3.5 rounded-full border-2 border-background bg-accent ring-2 ring-accent/30" />

                          <div className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft sm:flex-row sm:gap-5">
                            {dest?.image && (
                              <img
                                src={dest.image}
                                alt={item.place}
                                loading="lazy"
                                className="h-32 w-full rounded-xl object-cover sm:size-28 shrink-0"
                              />
                            )}

                            <div className="flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  {item.time && <span className="text-accent">{item.time}</span>}
                                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                                    {item.slot}
                                  </span>
                                </div>

                                <a
                                  href={item.mapUrl || googleSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                                >
                                  <MapPin className="size-3" />
                                  View on Google Maps
                                  <ExternalLink className="size-2.5" />
                                </a>
                              </div>

                              <h3 className="mt-2 text-lg font-semibold text-foreground">
                                {item.place}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.description}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                {item.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="size-3 text-accent" />
                                    {item.duration}
                                  </span>
                                )}
                                {item.estimatedCost !== undefined && item.estimatedCost > 0 && (
                                  <span className="rounded-md bg-secondary px-2 py-0.5 font-medium text-foreground">
                                    Est. {item.currency ?? "TND"} {item.estimatedCost}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {item.transport && (
                            <p className="mt-2 flex items-center gap-2 pl-2 text-xs font-medium text-accent">
                              <Car className="size-3.5" />
                              {item.transport}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))
            ) : tripContext?.destination ? (
              /* User in-progress plan (not yet confirmed) */
              <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center sm:p-12">
                <Sparkles className="mx-auto size-10 text-accent animate-pulse" />
                <h3 className="mt-4 font-display text-2xl font-semibold">
                  Plan in Progress with NOVA
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  You are exploring <strong>{tripContext.destination}</strong> with NOVA.
                  Return to the chat, ask NOVA to build your itinerary, and click{" "}
                  <strong>Confirm Plan</strong> to see your full schedule rendered here live.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    to="/nova"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
                  >
                    Continue Planning in NOVA
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Clean empty waiting state */
              <div className="rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center sm:p-12">
                <Calendar className="mx-auto size-12 text-muted-foreground/60" />
                <h3 className="mt-4 font-display text-2xl font-semibold">
                  No Confirmed Trip Plan Yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Your personalized itinerary is live and dynamic. Chat with NOVA, customize your
                  stops, budget, and activities, and confirm your plan. Everything will appear
                  here immediately.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    to="/nova"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
                  >
                    Start with NOVA
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Real Google Map & Route Overview */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {/* Real Interactive Google Map with the user's route */}
            <LiveGoogleMap
              stops={activeStops}
              activeDestination={tripContext?.destination}
              height="420px"
              title="Live Google Map"
            />

            {/* Quick Summary Card */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trip Highlights
              </h4>
              <div className="mt-3 space-y-2">
                {activeStops.length > 0 ? (
                  activeStops.map((stop, i) => {
                    const d = bySlug(stop.toLowerCase());
                    return (
                      <div
                        key={stop}
                        className="flex items-center justify-between rounded-xl bg-secondary/50 p-2.5 text-xs"
                      >
                        <span className="font-semibold capitalize text-foreground">
                          {i + 1}. {d ? d.name : stop}
                        </span>
                        <span className="text-muted-foreground">
                          {d?.region ?? "Selected Stop"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No destinations selected yet. Tell NOVA your desired cities to plot them live.
                  </p>
                )}
              </div>

              <Link
                to="/nova"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="size-4 text-accent" />
                Customize with NOVA
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
