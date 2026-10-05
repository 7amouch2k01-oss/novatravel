import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/currency";
import { NOVA_LAUNCH_MARKET } from "@/lib/nova/markets";

const colors = [
  "hsl(var(--accent, 221 83% 53%))",      // Accommodation - blue / primary accent
  "hsl(199, 89%, 48%)",                  // Transport - cyan / ocean
  "hsl(24, 94%, 53%)",                   // Activities - warm terracotta / amber
  "hsl(142, 71%, 45%)",                  // Food - green / fresh
];

export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target || isNaN(target)) {
      setV(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export interface BudgetItem {
  label: string;
  value: number;
}

export function BudgetBar({
  items,
  total,
}: {
  items: BudgetItem[];
  total: number;
}) {
  const safeTotal = total > 0 ? total : 1;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      {items.map((b, i) => (
        <div
          key={b.label}
          style={{
            width: `${(b.value / safeTotal) * 100}%`,
            background: colors[i % colors.length],
          }}
          title={`${b.label}: ${fmt(b.value)}`}
        />
      ))}
    </div>
  );
}

export function BudgetDonut({
  size = 220,
  items,
  total,
  currency = NOVA_LAUNCH_MARKET.defaultCurrency,
}: {
  size?: number | undefined;
  items?: BudgetItem[] | undefined;
  total?: number | undefined;
  currency?: string | undefined;
}) {
  const defaultItems: BudgetItem[] = [
    { label: "Accommodation", value: 1050 },
    { label: "Transport", value: 420 },
    { label: "Activities", value: 380 },
    { label: "Food", value: 600 },
  ];

  const actualItems = items && items.length > 0 ? items : defaultItems;
  const actualTotal = total ?? actualItems.reduce((acc, curr) => acc + curr.value, 0);
  const safeTotal = actualTotal > 0 ? actualTotal : 1;

  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const animatedTotal = useCountUp(actualTotal);

  return (
    <div className="relative shrink-0 select-none" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90 size-full">
        {actualItems.map((b, i) => {
          const len = (b.value / safeTotal) * c;
          const strokeColor = colors[i % colors.length];
          const el = (
            <circle
              key={b.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={strokeColor}
              strokeWidth="11"
              strokeDasharray={`${Math.max(0, len - 1)} ${c}`}
              strokeDashoffset={-offset}
              className="transition-all duration-500 ease-out"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
          ESTIMATED
        </span>
        <span className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          ~{fmt(animatedTotal)}
        </span>
        <span className="text-xs font-semibold text-accent">{currency}</span>
      </div>
    </div>
  );
}

export { colors as budgetColors };
