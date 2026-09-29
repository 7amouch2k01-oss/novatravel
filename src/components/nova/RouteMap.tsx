import { bySlug, destinations } from "@/lib/tunisia";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";

/** Fuzzy lookup helper: match city names or slugs, with sensible fallbacks */
export function resolveDestination(nameOrSlug: string) {
  const clean = nameOrSlug.toLowerCase().trim();
  const direct = bySlug(clean);
  if (direct) return direct;

  const found = destinations.find(
    (d) =>
      d.name.toLowerCase() === clean ||
      d.slug.toLowerCase().includes(clean) ||
      clean.includes(d.slug.toLowerCase()) ||
      clean.includes(d.name.toLowerCase())
  );
  if (found) return found;

  // Common aliases in Tunisia
  if (clean.includes("hammamet")) return bySlug("hammamet");
  if (clean.includes("tunis") || clean.includes("capital")) return bySlug("tunis");
  if (clean.includes("carthage")) return bySlug("carthage");
  if (clean.includes("sidi") || clean.includes("bou said")) return bySlug("sidi-bou-said");
  if (clean.includes("jem")) return bySlug("el-jem");
  if (clean.includes("djerba") || clean.includes("jerba")) return bySlug("djerba");
  if (clean.includes("tozeur") || clean.includes("oasis")) return bySlug("tozeur");
  if (clean.includes("sahara") || clean.includes("douz") || clean.includes("desert")) return bySlug("sahara");

  return undefined;
}

export interface RouteMapProps {
  stops: string[];
  className?: string | undefined;
  compact?: boolean | undefined;
  activeDestination?: string | undefined;
}

/**
 * Live Interactive Route Map
 * Shows the actual destinations appearing in the current conversation & confirmed plan.
 * Highlights active destination, animates paths, and supports hover/click inspection.
 */
export function RouteMap({ stops, className, compact = false, activeDestination }: RouteMapProps) {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  // Resolve all stops to coordinates
  const pts = stops
    .map((s) => resolveDestination(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Remove consecutive duplicates if any
  const uniquePts = pts.filter((p, i) => i === 0 || p.slug !== pts[i - 1]?.slug);

  const d = uniquePts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

  const active = activeDestination ? resolveDestination(activeDestination) : null;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-secondary zellige", className)}>
      <svg viewBox="0 0 100 90" className="h-full w-full select-none">
        {/* Tunisia stylized land boundary */}
        <path
          d="M48 4 L64 5 L66 14 L62 20 L66 30 L68 42 L74 56 L76 68 L66 72 L58 86 L44 88 L36 76 L24 66 L22 50 L30 40 L36 26 L40 12 Z"
          className="fill-card stroke-border transition-colors"
          strokeWidth="0.6"
        />

        {/* Sea labeling */}
        <text x="82" y="28" className="fill-accent font-medium tracking-wider" fontSize="2.8" opacity="0.6">
          Mediterranean
        </text>

        {/* Animated Route Path */}
        {uniquePts.length > 1 && (
          <path
            d={d}
            fill="none"
            className="route-draw stroke-accent transition-all duration-700"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Destination Markers */}
        {uniquePts.map((p, i) => {
          const isActive = active?.slug === p.slug || selectedPoint === p.slug;
          return (
            <g
              key={`${p.slug}-${i}`}
              className="cursor-pointer transition-transform duration-300"
              onMouseEnter={() => setSelectedPoint(p.slug)}
              onMouseLeave={() => setSelectedPoint(null)}
              onClick={() => setSelectedPoint(p.slug === selectedPoint ? null : p.slug)}
            >
              {/* Pulse glow for active destination */}
              {isActive && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  className="fill-accent/25 animate-ping"
                />
              )}

              {/* Marker pin circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? "3.2" : "2.4"}
                className={cn(
                  "transition-all duration-300",
                  isActive ? "fill-accent stroke-background stroke-1" : "fill-primary"
                )}
              />

              {/* Order number */}
              <text
                x={p.x}
                y={p.y + 0.9}
                textAnchor="middle"
                fontSize={isActive ? "2.6" : "2.2"}
                className="fill-primary-foreground font-bold pointer-events-none"
              >
                {i + 1}
              </text>

              {/* Name label */}
              {!compact && (
                <text
                  x={p.x + 3.6}
                  y={p.y + 1}
                  fontSize="2.8"
                  className={cn(
                    "font-semibold transition-colors duration-200 pointer-events-none",
                    isActive ? "fill-accent font-bold" : "fill-foreground"
                  )}
                >
                  {p.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating indicator info */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg bg-background/85 px-2.5 py-1 text-[11px] backdrop-blur-sm border border-border/50">
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Navigation className="size-3 text-accent animate-pulse" />
          {uniquePts.length} Live Stop{uniquePts.length === 1 ? "" : "s"}
        </span>
        <span className="text-muted-foreground truncate max-w-[170px]">
          {uniquePts.map((p) => p.name).join(" → ")}
        </span>
      </div>
    </div>
  );
}
