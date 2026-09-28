import { createFileRoute, Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { SiteNav } from "@/components/nova/SiteNav";
import { BudgetDonut, budgetColors, fmt } from "@/components/nova/Budget";
import { budget, budgetTotal } from "@/lib/tunisia";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Estimated trip budget in TND — TUNITRAVEL" },
      { name: "description", content: "NOVA's estimated budget for a 5-day Tunisia trip for two: accommodation, transport, food and activities." },
      { property: "og:title", content: "Trip budget estimate — TUNITRAVEL" },
      { property: "og:description", content: "~2,450 TND estimated for 5 days, 2 travelers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 py-14 md:px-8">
        <h1 className="text-4xl font-semibold md:text-6xl">Estimated trip budget</h1>
        <p className="mt-3 text-muted-foreground">Tunisia Adventure · 5 days · 2 travelers · Target 2,500 TND</p>
        <div className="mt-12 grid items-center gap-12 rounded-3xl border border-border bg-card p-8 md:grid-cols-[auto_1fr] md:p-12">
          <BudgetDonut size={240} />
          <ul className="space-y-5">
            {budget.map((b, i) => (
              <li key={b.label}>
                <div className="flex items-baseline justify-between"><span className="flex items-center gap-2 font-semibold"><span className="size-2.5 rounded-full" style={{ background: budgetColors[i] }} />{b.label}</span><span className="font-display text-lg">{fmt(b.value)} TND</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="animate-rise h-full rounded-full" style={{ width: `${(b.value / budgetTotal) * 100}%`, background: budgetColors[i] }} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sand/40 p-4 text-sm"><Info className="mt-0.5 size-4 shrink-0 text-terracotta" /><p><strong>AI estimate — actual prices may vary.</strong> These figures are NOVA's planning estimates, not live prices or bookings.</p></div>
        <Link to="/nova" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Ask NOVA to adjust</Link>
      </div>
    </div>
  );
}
