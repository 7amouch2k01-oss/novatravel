import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Home, Map, Compass, Heart, ArrowUp, Sparkle, Route as RouteIcon, Wallet, CalendarDays, Users, Search } from "lucide-react";
import { NovaMark, Wordmark } from "@/components/nova/NovaMark";
import { RouteMap } from "@/components/nova/RouteMap";
import { BudgetBar, budgetColors, fmt } from "@/components/nova/Budget";
import { budget, budgetTotal, bySlug, novaReplies, tripStops } from "@/lib/tunisia";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nova")({
  head: () => ({
    meta: [
      { title: "NOVA Workspace — Plan your Tunisia trip | TUNITRAVEL" },
      { name: "description", content: "Chat with NOVA to build, refine and budget a personalized Tunisia itinerary." },
      { property: "og:title", content: "NOVA Workspace — TUNITRAVEL" },
      { property: "og:description", content: "Your intelligent Tunisia travel agent at work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

type Msg = { role: "user" | "nova"; text: string; actions?: boolean };

const initial: Msg[] = [
  { role: "user", text: "I'm visiting Tunisia for 5 days with my partner. We love culture, beaches and beautiful places, and our budget is around 2500 TND." },
  { role: "nova", text: "Perfect. I'll build this around a relaxed pace, cultural experiences and coastal destinations while keeping the estimated budget close to 2,500 TND.", actions: true },
];
const actions = [
  { t: "Build itinerary", i: CalendarDays },
  { t: "Find destinations", i: Search },
  { t: "Optimize route", i: RouteIcon },
  { t: "Check budget", i: Wallet },
];
const chips = ["Make it more relaxing", "Reduce the budget", "Add more beaches", "Add cultural experiences", "Show alternatives"];

function Workspace() {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, thinking]);

  const send = (text: string) => {
    if (!text.trim() || thinking) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "nova", text: novaReplies[text] ?? "Noted. I'll factor that into your plan and keep the route and budget balanced — anything else you'd like to adjust?" }]);
      setThinking(false);
    }, 1400);
  };

  return (
    <div className="grid h-screen grid-cols-1 bg-background md:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_340px]">
      {/* Left */}
      <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar p-5 md:flex">
        <Link to="/" className="flex items-center gap-2"><NovaMark className="size-7" /><Wordmark className="text-base" /></Link>
        <nav className="mt-8 space-y-1 text-sm font-medium">
          {[{ to: "/", l: "Home", i: Home }, { to: "/itinerary", l: "My Trip", i: Map }, { to: "/explore", l: "Explore", i: Compass }, { to: "/explore", l: "Saved Places", i: Heart }].map(({ to, l, i: I }) => (
            <Link key={l} to={to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"><I className="size-4" />{l}</Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current trip</p>
          <p className="mt-2 font-display font-semibold">Tunisia Adventure</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays className="size-3" />5 days</span><span className="flex items-center gap-1"><Users className="size-3" />2 travelers</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[68%] rounded-full bg-accent" /></div>
          <p className="mt-1.5 text-xs text-muted-foreground">Plan 68% complete</p>
        </div>
      </aside>

      {/* Center */}
      <main className="flex min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-6 py-4">
          <NovaMark className="size-9" spinning={thinking} />
          <div>
            <h1 className="font-display font-semibold">NOVA</h1>
            <p className="text-xs text-muted-foreground">Your intelligent Tunisia travel agent</p>
          </div>
          <span className="ml-auto hidden rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:block">Culture · Beaches · Relaxed pace</span>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="animate-rise ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-5 py-3.5 text-primary-foreground">{m.text}</div>
            ) : (
              <div key={i} className="animate-rise flex gap-3">
                <NovaMark className="mt-0.5 size-7 shrink-0" />
                <div className="flex-1">
                  <p className="leading-relaxed">{m.text}</p>
                  {m.actions && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {actions.map(({ t, i: I }) => (
                        <button key={t} onClick={() => send(t)} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-soft">
                          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-accent"><I className="size-4" /></span>{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <NovaMark className="size-7" spinning />
                <span>NOVA is weighing your preferences</span>
                <span className="flex gap-1">{[0, 1, 2].map((d) => <span key={d} className="think-dot size-1.5 rounded-full bg-accent" style={{ animationDelay: `${d * 0.15}s` }} />)}</span>
              </div>
            )}
            <div ref={end} />
          </div>
        </div>

        <div className="border-t border-border px-6 py-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button key={c} onClick={() => send(c)} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-terracotta hover:text-terracotta"><Sparkle className="size-3" />{c}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 rounded-2xl border border-input bg-card p-2 pl-4 focus-within:ring-2 focus-within:ring-ring">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tell NOVA what you'd like to change…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <button type="submit" disabled={!input.trim() || thinking} className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><ArrowUp className="size-4" /></button>
            </form>
          </div>
        </div>
      </main>

      {/* Right */}
      <aside className="hidden overflow-y-auto border-l border-border bg-card p-6 xl:block">
        <h2 className="font-display text-xl font-semibold">Your trip</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["5", "days"], ["2", "travelers"], ["2,500", "TND budget"]].map(([a, b]) => (
            <div key={b} className="rounded-xl bg-secondary p-3"><p className="font-display text-lg font-semibold">{a}</p><p className="text-[11px] text-muted-foreground">{b}</p></div>
          ))}
        </div>
        <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Destinations</p>
        <ul className="mt-3 space-y-2">
          {tripStops.map((s, i) => { const d = bySlug(s)!; return (
            <li key={s}><Link to="/explore/$slug" params={{ slug: s }} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-secondary">
              <img src={d.image} alt="" className="size-10 rounded-lg object-cover" loading="lazy" />
              <div className="flex-1"><p className="text-sm font-semibold">{d.name}</p><p className="text-xs text-muted-foreground">{d.duration}</p></div>
              <span className="grid size-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
            </Link></li>
          ); })}
        </ul>
        <RouteMap stops={tripStops} compact className="mt-4 h-44" />
        <div className="mt-7 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Estimated budget</p>
          <span className="rounded-full bg-sand/50 px-2 py-0.5 text-[10px] font-semibold">Estimated</span>
        </div>
        <div className="mt-3"><BudgetBar /></div>
        <ul className="mt-4 space-y-2 text-sm">
          {budget.map((b, i) => (
            <li key={b.label} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: budgetColors[i] }} />{b.label}<span className="ml-auto font-medium">{fmt(b.value)} TND</span></li>
          ))}
        </ul>
        <div className={cn("mt-4 flex items-baseline justify-between border-t border-border pt-4")}><span className="text-sm font-semibold">Total</span><span className="font-display text-2xl font-semibold">~{fmt(budgetTotal)} TND</span></div>
        <p className="mt-2 text-xs text-muted-foreground">AI estimate — actual prices may vary.</p>
      </aside>
    </div>
  );
}
