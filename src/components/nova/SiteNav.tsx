import { Link } from "@tanstack/react-router";
import { NovaMark, Wordmark } from "./NovaMark";
import { cn } from "@/lib/utils";

const links = [
  { to: "/explore", label: "Explore" },
  { to: "/itinerary", label: "My trip" },
  { to: "/budget", label: "Budget" },
] as const;

export function SiteNav({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={cn("z-30 w-full", overlay ? "absolute top-0 text-primary-foreground" : "sticky top-0 border-b border-border bg-background/85 backdrop-blur")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <NovaMark className="size-7" />
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="opacity-80 transition-opacity hover:opacity-100" activeProps={{ className: "opacity-100" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link to="/nova" className={cn("rounded-full px-4 py-2 text-sm font-semibold transition-colors", overlay ? "bg-primary-foreground text-primary hover:bg-sand" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
          Talk to NOVA
        </Link>
      </div>
    </header>
  );
}
