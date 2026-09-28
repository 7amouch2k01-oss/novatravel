import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Car } from "lucide-react";
import { SiteNav } from "@/components/nova/SiteNav";
import { RouteMap } from "@/components/nova/RouteMap";
import { NovaMark } from "@/components/nova/NovaMark";
import { bySlug, itinerary } from "@/lib/tunisia";

export const Route = createFileRoute("/itinerary")({
  head: () => ({
    meta: [
      { title: "Your Tunisia journey — 5-day itinerary by NOVA | TUNITRAVEL" },
      { name: "description", content: "A day-by-day personalized Tunisia itinerary: Tunis, Carthage, Sidi Bou Said, Hammamet and El Jem." },
      { property: "og:title", content: "Your Tunisia journey — TUNITRAVEL" },
      { property: "og:description", content: "5 days · 2 travelers · Personalized by NOVA" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Itinerary,
});

function Itinerary() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><NovaMark className="size-5" /> Personalized by NOVA</div>
        <h1 className="mt-3 text-4xl font-semibold md:text-6xl">Your Tunisia journey</h1>
        <p className="mt-3 text-lg text-muted-foreground">5 days · 2 travelers · Personalized by NOVA</p>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_380px]">
          <div className="space-y-16">
            {itinerary.map((day) => (
              <section key={day.day} className="animate-rise">
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-sm font-bold tracking-[0.2em] text-terracotta">DAY {day.day}</span>
                  <h2 className="text-3xl font-semibold">{day.city}</h2>
                </div>
                <p className="mt-1 text-muted-foreground">{day.theme}</p>
                <ol className="relative mt-8 space-y-4 border-l border-dashed border-border pl-8">
                  {day.items.map((a, i) => { const d = bySlug(a.slug)!; return (
                    <li key={i} className="relative">
                      <span className="absolute -left-[39px] top-6 size-3.5 rounded-full border-2 border-background bg-accent ring-2 ring-accent/30" />
                      <Link to="/explore/$slug" params={{ slug: a.slug }} className="group flex gap-5 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft">
                        <img src={d.image} alt={a.place} loading="lazy" width={1200} height={912} className="size-24 shrink-0 rounded-xl object-cover md:size-28" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><span className="text-accent">{a.time}</span>{a.slot}</div>
                          <h3 className="mt-1 text-lg font-semibold">{a.place}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3" />{a.duration}</p>
                        </div>
                      </Link>
                      {a.next && <p className="mt-3 flex items-center gap-2 pl-2 text-xs font-medium text-terracotta"><Car className="size-3.5" />{a.next} to next stop</p>}
                    </li>
                  ); })}
                </ol>
              </section>
            ))}
            <p className="text-sm text-muted-foreground">Days 4–5 are flexible — ask NOVA to fill them with beaches, culture or a desert extension.</p>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <RouteMap stops={["tunis", "carthage", "sidi-bou-said", "hammamet", "el-jem"]} className="aspect-[10/9]" />
            <Link to="/nova" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground">Refine with NOVA</Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
