/**
 * NOVA Travel Agent — Mode Switcher
 *
 * Toggles between General AI mode and Travel Agent mode.
 * The mode switch adds a system message to the conversation.
 */

import { cn } from "@/lib/utils";
import type { AgentMode } from "@/lib/nova/types";
import { Globe, MapPin } from "lucide-react";

interface ModeSwitcherProps {
  mode: AgentMode;
  onSwitch: (mode: AgentMode) => void;
  className?: string;
}

export function ModeSwitcher({ mode, onSwitch, className }: ModeSwitcherProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border bg-secondary p-1",
        className
      )}
    >
      <button
        onClick={() => onSwitch("general")}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          mode === "general"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Globe className="size-3.5" />
        General AI
      </button>
      <button
        onClick={() => onSwitch("travel")}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          mode === "travel"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MapPin className="size-3.5" />
        Travel Agent
      </button>
    </div>
  );
}
