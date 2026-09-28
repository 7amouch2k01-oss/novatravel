import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/nova/SiteNav";
import { NovaMark } from "@/components/nova/NovaMark";
import { destinations, filters } from "@/lib/tunisia";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explore/")({
  head: () => ({
    meta: [
      { title: "Explore Tunisia — Destinations picked by NOVA | TUNITRAVEL" },
      { name: "description", content: "Discover Tunis, Carthage, Sidi Bou Said, Hammamet, Djerba, Tozeur, El Jem and the Sahara." },
      { property: "og:title", content: "Explore Tunisia — TUNITRAVEL" },
      { property: "og:description", content: "Editorial destination guides with NOVA match scores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [active, setActive] = useState<string | null>(null);
  const list = active ? destinations.filter((d) => d.tags.includes(active)) : destinations;
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <h1 className="text-4xl font-semibold md:text-6xl">Explore Tunisia</h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">From Mediterranean villages to Saharan dunes — each ranked for how well it fits you.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <button onClick={() => setActive(null)} className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors", !active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}>All</button>
          {filters.map((f) => (
            <button key={f} onClick={() => setActive(f)} className={cn("rounded-full border px-4 py-2 text-sm font-medium transition-colors", active === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}>{f}</button>
          ))}
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d, i) => (
            <Link key={d.slug} to="/explore/$slug" params={{ slug: d.slug }} className={cn("group animate-rise overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-soft", i === 0 && !active && "lg:col-span-2")} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={d.image} alt={d.name} loading="lazy" width={1200} height={912} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-card/95 py-1 pl-1 pr-3 text-xs font-semibold backdrop-blur"><NovaMark className="size-5" />{d.match}% match</span>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">{d.category}</p>
                <h2 className="mt-1 text-2xl font-semibold">{d.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{d.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
