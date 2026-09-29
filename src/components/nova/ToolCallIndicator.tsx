/**
 * NOVA Travel Agent — Tool Activity Indicator
 *
 * Shows live tool execution states: running, done, error.
 * Only renders when tools are actually running — never faked.
 */

import { cn } from "@/lib/utils";
import type { ToolCall } from "@/lib/nova/types";
import {
  Search,
  Globe,
  Hotel,
  Plane,
  UtensilsCrossed,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

const TOOL_ICONS: Record<string, React.ElementType> = {
  search_web: Globe,
  search_hotels: Hotel,
  search_flights: Plane,
  search_restaurants: UtensilsCrossed,
  search_activities: MapPin,
  search_destinations: Search,
  create_itinerary: Calendar,
  thinking: Sparkles,
};

interface ToolCallIndicatorProps {
  toolCalls: ToolCall[];
  className?: string;
}

export function ToolCallIndicator({ toolCalls, className }: ToolCallIndicatorProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {toolCalls.map((tc) => {
        const Icon = TOOL_ICONS[tc.name] ?? Search;
        return (
          <div
            key={tc.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-all",
              tc.status === "running" && "border-accent/30 bg-accent/5 text-accent",
              tc.status === "done" && "border-border bg-card text-muted-foreground",
              tc.status === "error" && "border-destructive/30 bg-destructive/5 text-destructive"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1 font-medium">{tc.label}</span>
            {tc.status === "running" && (
              <Loader2 className="size-4 animate-spin text-accent" />
            )}
            {tc.status === "done" && (
              <CheckCircle2 className="size-4 text-accent" />
            )}
            {tc.status === "error" && (
              <XCircle className="size-4 text-destructive" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Thinking Dots ────────────────────────────────────────────────────────────

export function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((d) => (
        <span
          key={d}
          className="size-1.5 rounded-full bg-accent think-dot"
          style={{ animationDelay: `${d * 0.15}s` }}
        />
      ))}
    </span>
  );
}
