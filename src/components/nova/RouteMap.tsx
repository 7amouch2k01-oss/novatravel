import { bySlug } from "@/lib/tunisia";
import { cn } from "@/lib/utils";

/** Stylised Tunisia outline with an animated route through the given stops. */
export function RouteMap({ stops, className, compact = false }: { stops: string[]; className?: string; compact?: boolean }) {
  const pts = stops.map((s) => bySlug(s)!).filter(Boolean);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-secondary zellige", className)}>
      <svg viewBox="0 0 100 90" className="h-full w-full">
        <path d="M48 4 L64 5 L66 14 L62 20 L66 30 L68 42 L74 56 L76 68 L66 72 L58 86 L44 88 L36 76 L24 66 L22 50 L30 40 L36 26 L40 12 Z" className="fill-card stroke-border" strokeWidth="0.6" />
        <text x="84" y="30" className="fill-accent" fontSize="3" opacity="0.6">Mediterranean</text>
        <path d={d} fill="none" className="route-draw stroke-accent" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={p.slug}>
            <circle cx={p.x} cy={p.y} r="2.2" className="fill-primary" />
            <text x={p.x} y={p.y + 0.9} textAnchor="middle" fontSize="2.2" className="fill-primary-foreground font-bold">{i + 1}</text>
            {!compact && <text x={p.x + 3.4} y={p.y + 1} fontSize="2.8" className="fill-foreground font-semibold">{p.name}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}
