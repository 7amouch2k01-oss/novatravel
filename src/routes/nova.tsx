/**
 * NOVA Workspace — Main Chat Interface
 *
 * Connects the NOVA AI agent to the UI.
 * All AI logic runs server-side through createServerFn.
 * This file contains ONLY UI and state management.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useEffect, useState } from "react";
import {
  Home,
  Map,
  Compass,
  Heart,
  ArrowUp,
  Sparkles,
  Globe,
  Trash2,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Calendar,
  Clock,
} from "lucide-react";
import { NovaMark, Wordmark } from "@/components/nova/NovaMark";
import { RouteMap } from "@/components/nova/RouteMap";
import { LiveGoogleMap } from "@/components/nova/LiveGoogleMap";
import { MessageBubble } from "@/components/nova/MessageBubble";
import { ToolCallIndicator } from "@/components/nova/ToolCallIndicator";
import { ModeSwitcher } from "@/components/nova/ModeSwitcher";
import { bySlug } from "@/lib/tunisia";
import { useNovaChat, useNovaStatus } from "@/hooks/use-nova-chat";
import type { Itinerary } from "@/lib/nova/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/nova")({
  head: () => ({
    meta: [
      { title: "NOVA Workspace — Your AI Travel Agent | TUNITRAVEL" },
      {
        name: "description",
        content:
          "Chat with NOVA — a real AI travel agent that searches the web, finds hotels, flights, and builds personalized itineraries.",
      },
      { property: "og:title", content: "NOVA Workspace — TUNITRAVEL" },
      {
        property: "og:description",
        content: "Your intelligent AI travel agent at work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

// ─── Quick action chips ────────────────────────────────────────────────────────

const TRAVEL_CHIPS = [
  "Find hotels in Rome for 2 people",
  "Search flights Tunis → Paris",
  "Best beaches in Tunisia",
  "Build a 5-day Italy itinerary",
];

const GENERAL_CHIPS = [
  "Explain how AI works",
  "Help me write an email",
  "What should I pack for Tunisia?",
  "Translate: Bonjour je suis ici",
];

// ─── Welcome Screen ────────────────────────────────────────────────────────────

function WelcomeScreen({
  mode,
  onSend,
}: {
  mode: "general" | "travel";
  onSend: (text: string) => void;
}) {
  const chips = mode === "travel" ? TRAVEL_CHIPS : GENERAL_CHIPS;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <NovaMark className="mx-auto size-16" spinning />
      <h2 className="mt-6 font-display text-3xl font-semibold">
        {mode === "travel"
          ? "Where would you like to go?"
          : "How can I help you today?"}
      </h2>
      <p className="mt-3 text-muted-foreground">
        {mode === "travel"
          ? "I can search for hotels, flights, activities, build itineraries, and research destinations using live web data."
          : "Ask me anything — from technical questions to creative writing, languages, and everyday advice."}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onSend(c)}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-soft"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-accent">
              {mode === "travel" ? (
                <MapPin className="size-4" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </span>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── API Status Banner ────────────────────────────────────────────────────────

function ApiBanner() {
  const { data: status } = useNovaStatus();
  if (!status || status.configured) return null;

  return (
    <div className="mx-6 my-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <div>
        <strong>NOVA needs configuration.</strong>{" "}
        Add <code className="rounded bg-amber-100 px-1">GEMINI_API_KEY=your-key</code> to a{" "}
        <code className="rounded bg-amber-100 px-1">.env</code> file in the project root, then restart the server.
        Get your key free at{" "}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Google AI Studio
        </a>
        .
      </div>
    </div>
  );
}

// ─── Workspace ─────────────────────────────────────────────────────────────────

function Workspace() {
  const {
    messages,
    mode,
    tripContext,
    liveToolCalls,
    suggestedFollowUps,
    isThinking,
    sendMessage,
    clearConversation,
    switchMode,
    updateTripContext,
    bottomRef,
  } = useNovaChat({ initialMode: "travel" });

  const [input, setInput] = useState("");
  const [sidebarMapMode, setSidebarMapMode] = useState<"google" | "schematic">("google");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConfirmItinerary = (itinerary: Itinerary) => {
    const extractedStops = Array.from(
      new Set(
        itinerary.days
          .map((d) => d.city?.trim())
          .filter((c): c is string => Boolean(c && c.length > 1))
      )
    );

    updateTripContext((prev) => ({
      ...prev,
      isPlanConfirmed: true,
      confirmedDaysPlan: itinerary.days,
      stops: extractedStops.length > 0 ? extractedStops : prev.stops,
      durationDays: itinerary.days.length,
      ...(itinerary.destination ? { destination: itinerary.destination } : {}),
      ...(itinerary.totalEstimatedCost ? { budget: itinerary.totalEstimatedCost } : {}),
      ...(itinerary.currency ? { currency: itinerary.currency } : {}),
    }));
  };

  const handleSend = (text: string) => {
    if (!text.trim() || isThinking) return;
    sendMessage(text);
    setInput("");
    inputRef.current?.focus();
  };

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="grid h-screen grid-cols-1 bg-background md:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_340px]">
      {/* ── Left sidebar ─────────────────────────────────── */}
      <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar p-5 md:flex">
        <Link to="/" className="flex items-center gap-2">
          <NovaMark className="size-7" />
          <Wordmark className="text-base" />
        </Link>

        <nav className="mt-8 space-y-1 text-sm font-medium">
          {[
            { to: "/", l: "Home", i: Home },
            { to: "/itinerary", l: "My Trip", i: Map },
            { to: "/explore", l: "Explore", i: Compass },
            { to: "/explore", l: "Saved Places", i: Heart },
          ].map(({ to, l, i: I }) => (
            <Link
              key={l}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <I className="size-4" />
              {l}
            </Link>
          ))}
        </nav>

        {/* Trip context display */}
        {tripContext.destination && (
          <div className="mt-6 rounded-2xl border border-sidebar-border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Current trip
            </p>
            <p className="mt-2 font-display font-semibold">
              {tripContext.destination}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {tripContext.durationDays && (
                <span>{tripContext.durationDays} days</span>
              )}
              {tripContext.travelers && (
                <span>{tripContext.travelers} travelers</span>
              )}
              {tripContext.budget && (
                <span>
                  {tripContext.currency ?? ""} {tripContext.budget.toLocaleString()} budget
                </span>
              )}
            </div>
          </div>
        )}

        {/* Empty state when no trip context yet */}
        {!tripContext.destination && (
          <div className="mt-auto rounded-2xl border border-dashed border-sidebar-border bg-card/50 p-4 text-center">
            <p className="text-[11px] font-medium text-muted-foreground">
              No active trip yet.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground/75">
              Tell NOVA your dream destination, dates, or budget to start planning live.
            </p>
          </div>
        )}

        {/* Clear conversation */}
        {hasMessages && (
          <button
            onClick={clearConversation}
            className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Clear conversation
          </button>
        )}
      </aside>

      {/* ── Center: chat ─────────────────────────────────── */}
      <main className="flex min-h-0 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <NovaMark className="size-9 shrink-0" spinning={isThinking} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-semibold">NOVA</h1>
            <p className="text-xs text-muted-foreground">
              {isThinking ? "Researching…" : mode === "travel" ? "Travel Agent" : "General AI"}
            </p>
          </div>
          <ModeSwitcher
            mode={mode}
            onSwitch={switchMode}
            className="hidden sm:flex"
          />
        </header>

        {/* API Banner */}
        <ApiBanner />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {!hasMessages ? (
              <WelcomeScreen mode={mode} onSend={handleSend} />
            ) : (
              messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1}
                  isPlanConfirmed={tripContext.isPlanConfirmed}
                  onConfirmItinerary={handleConfirmItinerary}
                />
              ))
            )}

            {/* Live tool calls */}
            {isThinking && liveToolCalls.length > 0 && (
              <div className="flex gap-3">
                <NovaMark className="mt-0.5 size-8 shrink-0" spinning />
                <div className="flex-1">
                  <ToolCallIndicator toolCalls={liveToolCalls} />
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {/* Mode switcher (mobile) */}
            <div className="mb-3 flex items-center justify-between sm:hidden">
              <ModeSwitcher mode={mode} onSwitch={switchMode} />
            </div>

            {/* Follow-up chips */}
            {suggestedFollowUps.length > 0 && !isThinking && (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestedFollowUps.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleSend(c)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent hover:text-accent"
                  >
                    <Sparkles className="size-3" />
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2 rounded-2xl border border-input bg-card p-2 pl-4 focus-within:ring-2 focus-within:ring-ring"
            >
              {mode === "general" ? (
                <Globe className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <MapPin className="size-4 shrink-0 text-accent" />
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "travel"
                    ? "Ask NOVA to find hotels, flights, plan a trip…"
                    : "Ask NOVA anything…"
                }
                disabled={isThinking}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isThinking}
                className="size-9 rounded-xl"
              >
                <ArrowUp className="size-4" />
              </Button>
            </form>

            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {mode === "travel"
                ? "NOVA uses live web research · Prices are estimates unless labeled verified"
                : "NOVA can use web search for current information"}
            </p>
          </div>
        </div>
      </main>

      {/* ── Right panel: trip summary ─────────────────────── */}
      <aside className="hidden overflow-y-auto border-l border-border bg-card p-6 xl:block">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your trip</h2>
          {tripContext.isPlanConfirmed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="size-3" />
              Confirmed
            </span>
          )}
        </div>

        {/* Dynamic / Context Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary p-3">
            <p className="font-display text-lg font-semibold">
              {tripContext.durationDays ? `${tripContext.durationDays}` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">days</p>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <p className="font-display text-lg font-semibold">
              {tripContext.travelers ? `${tripContext.travelers}` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">travelers</p>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <p className="font-display text-lg font-semibold">
              {tripContext.budget
                ? `${tripContext.budget.toLocaleString()}`
                : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {tripContext.currency ?? "TND"} budget
            </p>
          </div>
        </div>

        {/* Interests if any */}
        {tripContext.interests && tripContext.interests.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Interests
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tripContext.interests.map((i) => (
                <span
                  key={i}
                  className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Live Interactive Map of Real Destinations */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Live route map
            </p>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setSidebarMapMode("google")}
                className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
                  sidebarMapMode === "google"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Google Map
              </button>
              <button
                type="button"
                onClick={() => setSidebarMapMode("schematic")}
                className={`rounded px-1.5 py-0.5 font-medium transition-colors ${
                  sidebarMapMode === "schematic"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Route
              </button>
            </div>
          </div>

          {sidebarMapMode === "google" ? (
            <LiveGoogleMap
              stops={
                tripContext.stops && tripContext.stops.length > 0
                  ? tripContext.stops
                  : tripContext.destination
                  ? [tripContext.destination]
                  : []
              }
              activeDestination={tripContext.destination}
              height="200px"
              className="mt-3"
            />
          ) : (
            <RouteMap
              stops={
                tripContext.stops && tripContext.stops.length > 0
                  ? tripContext.stops
                  : tripContext.destination
                  ? [tripContext.destination]
                  : []
              }
              activeDestination={tripContext.destination}
              compact
              className="mt-3 h-48"
            />
          )}
        </div>

        {/* Confirmed Days Plan Section */}
        {tripContext.isPlanConfirmed && tripContext.confirmedDaysPlan && tripContext.confirmedDaysPlan.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Calendar className="size-4 text-accent" />
              <h3 className="font-display text-sm font-semibold">
                Confirmed Plan ({tripContext.confirmedDaysPlan.length} Days)
              </h3>
            </div>

            <div className="space-y-3">
              {tripContext.confirmedDaysPlan.map((dayPlan) => (
                <div
                  key={dayPlan.day}
                  className="rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                      Day {dayPlan.day}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {dayPlan.city}
                    </span>
                  </div>

                  {dayPlan.theme && (
                    <p className="mt-1.5 text-xs font-medium text-muted-foreground">
                      {dayPlan.theme}
                    </p>
                  )}

                  <div className="mt-2.5 space-y-1.5 border-t border-border/50 pt-2">
                    {dayPlan.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <Clock className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{item.place}</span>
                          {item.description && (
                            <p className="line-clamp-1 text-[11px] text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {dayPlan.items.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">
                        + {dayPlan.items.length - 3} more activities
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tripContext.stops && tripContext.stops.length > 0 ? (
          /* Live Destinations from user inputs when plan not yet confirmed */
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Planned Destinations
            </p>
            <ul className="mt-3 space-y-2">
              {tripContext.stops.map((s, i) => {
                const d = bySlug(s.toLowerCase());
                return (
                  <li key={s}>
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-2">
                      {d?.image ? (
                        <img
                          src={d.image}
                          alt=""
                          className="size-10 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid size-10 place-items-center rounded-lg bg-secondary text-xs font-bold text-accent">
                          <MapPin className="size-4" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold capitalize">
                          {d ? d.name : s}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d?.region ?? "Selected stop"}
                        </p>
                      </div>
                      <span className="grid size-6 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                        {i + 1}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          /* Clean live waiting state */
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
            <MapPin className="mx-auto size-7 text-muted-foreground/60" />
            <p className="mt-3 font-display text-sm font-semibold text-foreground">
              Live Trip Canvas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask NOVA to plan a trip, search hotels, or discover places. Every decision you make and every plan you confirm will appear here in real-time.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
