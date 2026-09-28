import { useEffect, useState } from "react";
import { budget, budgetTotal } from "@/lib/tunisia";

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function useCountUp(target: number, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
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

export const fmt = (n: number) => n.toLocaleString("en-US");

export function BudgetBar() {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      {budget.map((b, i) => (
        <div key={b.label} style={{ width: `${(b.value / budgetTotal) * 100}%`, background: colors[i] }} />
      ))}
    </div>
  );
}

export function BudgetDonut({ size = 220 }: { size?: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const total = useCountUp(budgetTotal);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90">
        {budget.map((b, i) => {
          const len = (b.value / budgetTotal) * c;
          const el = <circle key={b.label} cx="50" cy="50" r={r} fill="none" stroke={colors[i]} strokeWidth="11" strokeDasharray={`${len - 1} ${c}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Estimated</span>
        <span className="font-display text-3xl font-semibold">~{fmt(total)}</span>
        <span className="text-xs text-muted-foreground">TND</span>
      </div>
    </div>
  );
}

export { colors as budgetColors };
