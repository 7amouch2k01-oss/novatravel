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

  const hasStops = uniquePts.length > 0;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary/60 to-secondary zellige", className)}>
      <svg viewBox="0 0 100 92" className="h-full w-full select-none">
        <defs>
          <linearGradient id="tunisiaLandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.9" />
          </linearGradient>
          <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="hsl(var(--accent))" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Tunisia stylized land boundary */}
        <path
          d="M48 4 L64 5 L66 14 L62 20 L66 30 L68 42 L74 56 L76 68 L66 72 L58 86 L44 88 L36 76 L24 66 L22 50 L30 40 L36 26 L40 12 Z"
          fill="url(#tunisiaLandGradient)"
          className="stroke-border/80 transition-colors"
          strokeWidth="0.8"
        />

        {/* Sea labeling */}
        <text x="80" y="26" className="fill-accent/70 font-semibold tracking-wider select-none" fontSize="2.6">
          Mediterranean
        </text>
        <text x="80" y="30" className="fill-muted-foreground/50 text-[2px]" fontSize="2">
          Gulf of Tunis
        </text>

        {/* Sahara labeling */}
        <text x="28" y="76" className="fill-muted-foreground/40 italic font-display" fontSize="2.8">
          Sahara Desert
        </text>

        {/* Ghost reference dots for all known regions when no stops are active */}
        {!hasStops &&
          destinations.map((d) => (
            <g key={`ghost-${d.slug}`} opacity="0.35" className="transition-opacity hover:opacity-80">
              <circle cx={d.x} cy={d.y} r="1.4" className="fill-muted-foreground" />
              <text x={d.x + 2.5} y={d.y + 0.8} fontSize="2.2" className="fill-muted-foreground/80 font-medium">
                {d.name}
              </text>
            </g>
          ))}

        {/* Animated Route Path connecting active stops */}
        {uniquePts.length > 1 && (
          <path
            d={d}
            fill="none"
            className="route-draw stroke-accent transition-all duration-700"
            strokeWidth="1.4"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Active Destination Markers */}
        {uniquePts.map((p, i) => {
          const isActive = i === 0 || selectedPoint === p.slug;
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
                  r="5.5"
                  className="fill-accent/30 animate-ping"
                />
              )}

              {/* Marker pin circle with elevation filter */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isActive ? "3.6" : "2.8"}
                filter="url(#mapGlow)"
                className={cn(
                  "transition-all duration-300",
                  isActive ? "fill-accent stroke-background stroke-2" : "fill-primary stroke-background stroke-1"
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

              {/* Smart Name Tag */}
              <g transform={`translate(${p.x + 3.8}, ${p.y - 3})`}>
                <rect
                  x="0"
                  y="0"
                  width={p.name.length * 2.1 + 4}
                  height="6"
                  rx="1.5"
                  className={cn(
                    "transition-colors",
                    isActive ? "fill-accent text-accent-foreground" : "fill-background/90 stroke-border/70 stroke-[0.3]"
                  )}
                />
                <text
                  x="2"
                  y="4.2"
                  fontSize="2.6"
                  className={cn(
                    "font-bold transition-colors pointer-events-none",
                    isActive ? "fill-accent-foreground font-extrabold" : "fill-foreground"
                  )}
                >
                  {p.name}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Floating indicator info */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-xl bg-background/90 px-3 py-1.5 text-xs backdrop-blur-md border border-border/80 shadow-xs">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Navigation className={cn("size-3.5 text-accent", hasStops && "animate-pulse")} />
          {hasStops
            ? `${uniquePts.length} Active Stop${uniquePts.length === 1 ? "" : "s"}`
            : "Live Tunisia Navigator"}
        </span>
        <span className="text-[11px] text-muted-foreground truncate max-w-[190px]">
          {hasStops
            ? uniquePts.map((p) => p.name).join(" → ")
            : "Select cities in NOVA to map"}
        </span>
      </div>
    </div>
  );
}
