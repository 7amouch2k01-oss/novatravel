import { cn } from "@/lib/utils";

/** NOVA identity: an eight-point Tunisian star inside a compass ring. */
export function NovaMark({ className, spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8", className)} aria-label="NOVA">
      <circle cx="20" cy="20" r="19" className="fill-primary" />
      <g className={spinning ? "nova-spin" : undefined}>
        <circle cx="20" cy="20" r="14" fill="none" className="stroke-sand" strokeWidth="0.8" strokeDasharray="1.5 3" />
      </g>
      <g className="fill-sand">
        <path d="M20 8 L22.4 17.6 L32 20 L22.4 22.4 L20 32 L17.6 22.4 L8 20 L17.6 17.6 Z" />
      </g>
      <path d="M20 12.5 L21.2 18.8 L27.5 20 L21.2 21.2 L20 27.5 L18.8 21.2 L12.5 20 L18.8 18.8 Z" transform="rotate(45 20 20)" className="fill-terracotta" opacity="0.9" />
      <circle cx="20" cy="20" r="2" className="fill-primary-foreground" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg font-semibold tracking-tight", className)}>
      TUNI<span className="text-tunis-red">·</span>TRAVEL
    </span>
  );
}
