import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Route as RouteIcon, Wallet, MapPin } from "lucide-react";
import hero from "@/assets/sidi-bou-said.jpg";
import { SiteNav } from "@/components/nova/SiteNav";
import { NovaMark } from "@/components/nova/NovaMark";
import { destinations } from "@/lib/tunisia";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TUNITRAVEL — Discover Tunisia with NOVA, your AI travel agent" },
      { name: "description", content: "NOVA plans personalized journeys across Tunisia around what you love, how you travel, and your budget in TND." },
      { property: "og:title", content: "TUNITRAVEL — Discover Tunisia. Your way." },
      { property: "og:description", content: "Meet NOVA, the intelligent guide to Tunisia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const prompts = ["Plan a 5-day Tunisia trip", "Best places for couples", "Explore the Sahara", "Weekend in Tunis"];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-[92vh] overflow-hidden">
        <SiteNav overlay />
        <img src={hero} alt="Sidi Bou Said at sunset above the Mediterranean" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/45 to-transparent" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-36 md:px-8 lg:grid-cols-[1.2fr_1fr] lg:pt-44">
          <div className="animate-rise text-primary-foreground">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]">
              <span className="size-1.5 rounded-full bg-tunis-red" /> The intelligent guide to Tunisia
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] md:text-7xl">Discover Tunisia.<br /><span className="text-sand">Your way.</span></h1>
            <p className="mt-6 max-w-lg text-lg text-primary-foreground/85">NOVA plans personalized journeys across Tunisia around what you love, how you travel, and what matters to you.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/nova" className="inline-flex items-center gap-2 rounded-full bg-tunis-red px-6 py-3.5 font-semibold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">Plan my trip <ArrowRight className="size-4" /></Link>
              <Link to="/explore" className="rounded-full border border-primary-foreground/40 px-6 py-3.5 font-semibold backdrop-blur-sm transition-colors hover:bg-primary-foreground/10">Explore Tunisia</Link>
            </div>
          </div>
          <div className="animate-rise self-end rounded-3xl bg-card/95 p-6 text-card-foreground shadow-soft backdrop-blur [animation-delay:200ms] lg:ml-auto lg:w-[400px]">
            <div className="flex items-center gap-3">
              <NovaMark className="size-10" spinning />
              <div>
                <p className="font-display font-semibold">NOVA</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-accent" /> Ready to plan</p>
              </div>
            </div>
            <p className="mt-5 font-display text-2xl leading-snug">Hi, I'm NOVA.<br />Where would you like to go?</p>
            <div className="mt-5 grid gap-2">
              {prompts.map((p) => (
                <Link key={p} to="/nova" className="group flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-accent hover:bg-secondary">
                  {p} <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">How NOVA works</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-semibold md:text-5xl">From inspiration to an actionable plan.</h2>
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4">
          {[
            { i: Compass, t: "Understands you", d: "Interests, pace, travel style and who you travel with." },
            { i: MapPin, t: "Finds the right places", d: "Grounded knowledge of Tunisia's regions and hidden corners." },
            { i: RouteIcon, t: "Optimizes your route", d: "Orders stops to cut backtracking and long drives." },
            { i: Wallet, t: "Estimates in TND", d: "Clear budget estimates — never presented as live prices." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="bg-card p-7">
              <Icon className="size-6 text-accent" />
              <h3 className="mt-6 text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-4xl font-semibold">Where NOVA would start</h2>
          <Link to="/explore" className="hidden text-sm font-semibold text-accent md:block">All destinations →</Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {destinations.slice(0, 4).map((d) => (
            <Link key={d.slug} to="/explore/$slug" params={{ slug: d.slug }} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
              <img src={d.image} alt={d.name} loading="lazy" width={1200} height={912} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/85 to-transparent" />
              <div className="absolute bottom-0 p-5 text-primary-foreground">
                <p className="text-xs uppercase tracking-widest opacity-80">{d.category}</p>
                <p className="font-display text-2xl font-semibold">{d.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">TUNITRAVEL · NOVA — concept preview</footer>
    </div>
  );
}
