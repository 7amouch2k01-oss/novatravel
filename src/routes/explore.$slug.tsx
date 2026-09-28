import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Plus, MapPin, Clock, Check } from "lucide-react";
import { SiteNav } from "@/components/nova/SiteNav";
import { NovaMark } from "@/components/nova/NovaMark";
import { RouteMap } from "@/components/nova/RouteMap";
import { bySlug } from "@/lib/tunisia";

export const Route = createFileRoute("/explore/$slug")({
  loader: ({ params }) => {
    const d = bySlug(params.slug);
    if (!d) throw notFound();
    return { slug: d.slug, name: d.name, blurb: d.blurb };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.name}, Tunisia — Why NOVA recommends it | TUNITRAVEL` },
      { name: "description", content: loaderData.blurb },
      { property: "og:title", content: `${loaderData.name} — TUNITRAVEL` },
      { property: "og:description", content: loaderData.blurb },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ] : [],
  }),
  component: Detail,
});

function Detail() {
  const { slug } = Route.useLoaderData();
  const d = bySlug(slug)!;
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="relative h-[62vh] overflow-hidden">
        <img src={d.image} alt={d.name} width={1200} height={912} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
        <div className="absolute bottom-0 mx-auto w-full max-w-7xl px-5 pb-10 text-primary-foreground md:px-8 left-1/2 -translate-x-1/2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand">{d.category} · {d.region}</p>
          <h1 className="mt-2 text-5xl font-semibold md:text-7xl">{d.name}</h1>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="rounded-3xl border border-border bg-card p-7">
            <div className="flex items-center gap-3"><NovaMark className="size-8" /><h2 className="text-lg font-semibold">Why NOVA recommends it</h2><span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{d.match}% match</span></div>
            <p className="mt-4 font-display text-2xl leading-snug">“{d.why}”</p>
          </div>
          <h3 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Best for</h3>
          <div className="mt-3 flex flex-wrap gap-2">{d.bestFor.map((b) => <span key={b} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">{b}</span>)}</div>
          <h3 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nearby places</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {d.nearby.map((n) => { const x = bySlug(n)!; return (
              <Link key={n} to="/explore/$slug" params={{ slug: n }} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 hover:shadow-soft">
                <img src={x.image} alt={x.name} loading="lazy" className="size-16 rounded-xl object-cover" />
                <div><p className="font-semibold">{x.name}</p><p className="text-xs text-muted-foreground">{x.category}</p></div>
              </Link>
            ); })}
          </div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 text-sm">
            <p className="flex items-center gap-2"><MapPin className="size-4 text-accent" />{d.region}</p>
            <p className="mt-3 flex items-center gap-2"><Clock className="size-4 text-accent" />Suggested: {d.duration}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setSaved(!saved)} className="flex items-center justify-center gap-2 rounded-full border border-border py-2.5 font-semibold hover:border-tunis-red"><Heart className={saved ? "size-4 fill-tunis-red text-tunis-red" : "size-4"} />{saved ? "Saved" : "Save"}</button>
              <button onClick={() => setAdded(true)} className="flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 font-semibold text-primary-foreground">{added ? <Check className="size-4" /> : <Plus className="size-4" />}{added ? "Added" : "Add to trip"}</button>
            </div>
          </div>
          <RouteMap stops={[d.slug, ...d.nearby]} className="aspect-[10/9]" />
        </aside>
      </div>
    </div>
  );
}
