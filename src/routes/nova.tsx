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
  GripVertical,
  Coins,
  Plus,
  Paperclip,
  FileText,
  X,
  MessageSquare,
  ArrowRight,
  UploadCloud,
} from "lucide-react";
import { NovaMark, Wordmark } from "@/components/nova/NovaMark";
import { LiveGoogleMap } from "@/components/nova/LiveGoogleMap";
import { MessageBubble } from "@/components/nova/MessageBubble";
import { ToolCallIndicator } from "@/components/nova/ToolCallIndicator";
import { ModeSwitcher } from "@/components/nova/ModeSwitcher";
import { bySlug } from "@/lib/tunisia";
import { useNovaChat, useNovaStatus } from "@/hooks/use-nova-chat";
import type { Itinerary, DocumentAttachment } from "@/lib/nova/types";
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
    chats,
    activeChatId,
    activeChat,
    switchChat,
    createNewTrip,
    removeChat,
  } = useNovaChat({ initialMode: "travel" });

  const [input, setInput] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<DocumentAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(360);
  const [isDraggingResizer, setIsDraggingResizer] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please select a document or ticket under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(",") ? res.split(",")[1] || "" : res;
      setSelectedAttachment({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        base64,
        sizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Mouse move and mouse up listeners for smooth dragging resize
  useEffect(() => {
    if (!isDraggingResizer) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Panel width = window width - mouse X position
      const newWidth = window.innerWidth - e.clientX;
      // Clamp between min 280px and max 640px or 50% of viewport
      const maxAllowed = Math.min(680, Math.floor(window.innerWidth * 0.5));
      const clamped = Math.max(280, Math.min(newWidth, maxAllowed));
      setRightPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingResizer(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingResizer]);

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
    if ((!text.trim() && !selectedAttachment) || isThinking) return;
    sendMessage(text, selectedAttachment ?? undefined);
    setInput("");
    setSelectedAttachment(null);
    inputRef.current?.focus();
  };

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* ── Left sidebar ─────────────────────────────────── */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-5 md:flex">
        <Link to="/" className="flex items-center gap-2">
          <NovaMark className="size-7" />
          <Wordmark className="text-base" />
        </Link>

        <nav className="mt-8 space-y-1 text-sm font-medium">
          {[
            { to: "/", l: "Home", i: Home },
            { to: "/itinerary", l: "My Trip", i: Map },
            { to: "/budget", l: "Budget", i: Coins },
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

        {/* New Chat Button */}
        <div className="mt-6">
          <Button
            onClick={() => createNewTrip()}
            className="w-full justify-start gap-2 rounded-xl bg-accent text-accent-foreground font-semibold shadow-sm hover:bg-accent/90"
          >
            <Plus className="size-4 shrink-0" />
            <span>New Trip / Chat</span>
          </Button>
        </div>

        {/* Multi-chat list */}
        <div className="mt-5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Your Chats & Trips
            </span>
            <span className="text-[10px] text-muted-foreground/80 font-mono">
              {chats.length}
            </span>
          </div>

          <div className="space-y-1.5 pr-1">
            {chats.map((c) => {
              const isActive = c.id === activeChatId;
              return (
                <div
                  key={c.id}
                  onClick={() => switchChat(c.id)}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group relative flex flex-col gap-1 rounded-xl p-2.5 text-left transition-all border cursor-pointer",
                    isActive
                      ? "border-accent/40 bg-accent/10 shadow-xs"
                      : "border-transparent bg-card/40 hover:bg-card hover:border-sidebar-border"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "truncate text-xs font-semibold tracking-tight",
                        isActive ? "text-accent-foreground font-bold" : "text-foreground/90"
                      )}
                      title={c.title}
                    >
                      {c.title}
                    </span>

                    {chats.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeChat(c.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider text-[9px]",
                        c.status === "confirmed"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : c.status === "planning"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {c.status === "confirmed"
                        ? "Confirmed"
                        : c.status === "planning"
                        ? "Planning"
                        : "New"}
                    </span>
                    <span className="text-muted-foreground/60 text-[9px]">
                      {new Date(c.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trip context display */}
        {tripContext.destination && (
          <div className="mt-4 rounded-2xl border border-sidebar-border bg-card p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Current destination
            </p>
            <p className="mt-1 font-display text-sm font-semibold truncate">
              {tripContext.origin ? `${tripContext.origin} → ` : ""}{tripContext.destination}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
              {tripContext.durationDays && (
                <span>{tripContext.durationDays}d</span>
              )}
              {tripContext.travelers && (
                <span>· {tripContext.travelers} pers</span>
              )}
              {tripContext.budget && (
                <span>
                  · {tripContext.currency ?? ""}{tripContext.budget.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Clear conversation */}
        {hasMessages && (
          <button
            onClick={clearConversation}
            className="mt-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3.5" />
            Clear active chat
          </button>
        )}
      </aside>

      {/* ── Center: chat ─────────────────────────────────── */}
      <main className="flex flex-1 min-w-0 min-h-0 flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <NovaMark className="size-9 shrink-0" spinning={isThinking} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold truncate text-sm sm:text-base">
                {activeChat?.title || "NOVA"}
              </h1>
              {activeChat?.status && (
                <span
                  className={cn(
                    "hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                    activeChat.status === "confirmed"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : activeChat.status === "planning"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {activeChat.status}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isThinking ? "Researching & analyzing…" : mode === "travel" ? "Live AI Travel Planner" : "General AI"}
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

            {/* Document attachment preview chip */}
            {selectedAttachment && (
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                    <FileText className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {selectedAttachment.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(selectedAttachment.sizeBytes / 1024)} KB · Ready for AI Analysis
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAttachment(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                  title="Remove attachment"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2 rounded-2xl border border-input bg-card p-2 pl-3 focus-within:ring-2 focus-within:ring-ring"
            >
              {/* Paperclip upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl transition-colors shrink-0",
                  selectedAttachment
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Upload plane ticket, booking voucher, or travel document (PDF or image)"
              >
                <Paperclip className="size-4" />
              </button>

              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedAttachment
                    ? `Ask about ${selectedAttachment.name} or press send to analyze…`
                    : mode === "travel"
                    ? "Ask NOVA, or attach a ticket/voucher to extract flight times & details…"
                    : "Ask NOVA anything, or upload a document…"
                }
                disabled={isThinking}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && !selectedAttachment) || isThinking}
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

      {/* ── Draggable Splitter Handle for 'Your trip' panel ── */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingResizer(true);
        }}
        title="Drag to resize 'Your trip' panel"
        className={cn(
          "hidden xl:flex w-2 shrink-0 cursor-col-resize items-center justify-center transition-colors select-none group",
          isDraggingResizer ? "bg-accent" : "hover:bg-accent/40 bg-border/60"
        )}
      >
        <div className="h-8 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-accent transition-colors" />
      </div>

      {/* ── Right panel: trip summary (Dynamically Resizable) ── */}
      <aside
        style={{ width: `${rightPanelWidth}px` }}
        className="hidden shrink-0 overflow-y-auto border-l border-border bg-card p-6 xl:block select-text"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">Your trip</h2>
            <span className="text-[10px] text-muted-foreground/70 font-mono">(drag edge to resize)</span>
          </div>
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
          <Link
            to="/budget"
            title="Click to view detailed budget breakdown and live currency conversion"
            className="group rounded-xl bg-secondary p-3 transition-colors hover:bg-accent/10 border border-transparent hover:border-accent/30 flex flex-col justify-center cursor-pointer"
          >
            <p className="font-display text-lg font-semibold group-hover:text-accent transition-colors">
              {tripContext.budget
                ? `${tripContext.budget.toLocaleString()}`
                : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground group-hover:text-accent/90 transition-colors">
              {tripContext.currency ?? "TND"} budget ↗
            </p>
          </Link>
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Live route map
          </p>

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
