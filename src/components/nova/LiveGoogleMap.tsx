import { useMemo, useState } from "react";
import { resolveDestination } from "@/components/nova/RouteMap";
import { cn } from "@/lib/utils";
import { ExternalLink, Layers, MapPin, Navigation, Maximize2 } from "lucide-react";

export interface LiveGoogleMapProps {
  stops: string[];
  activeDestination?: string | undefined;
  className?: string | undefined;
  title?: string | undefined;
  height?: string | number | undefined;
}

/**
 * Live Google Map component.
 * Embeds a real interactive Google Maps iframe with actual coordinates of the user's chosen destinations.
 * Provides direct one-click navigation links to Google Maps Directions and Street View.
 */
export function LiveGoogleMap({
  stops,
  activeDestination,
  className,
  title = "Live Google Route Map",
  height = "380px",
}: LiveGoogleMapProps) {
  const [mapType, setMapType] = useState<"m" | "k">("m"); // m = standard roadmap, k = satellite
  const [zoomLevel, setZoomLevel] = useState<number>(7);

  // Resolve all stops to destinations with real coordinates
  const resolvedStops = useMemo(() => {
    return stops
      .map((s) => resolveDestination(s))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [stops]);

  // Remove duplicate adjacent stops
  const uniqueStops = useMemo(() => {
    return resolvedStops.filter((p, i) => i === 0 || p.slug !== resolvedStops[i - 1]?.slug);
  }, [resolvedStops]);

  // Center coordinate: prefer active destination, then first stop, or Tunisia center
  const center = useMemo(() => {
    if (activeDestination) {
      const act = resolveDestination(activeDestination);
      if (act) return { lat: act.lat, lng: act.lng, name: act.name };
    }
    const first = uniqueStops[0];
    if (first) {
      return { lat: first.lat, lng: first.lng, name: first.name };
    }
    return { lat: 35.8256, lng: 10.1815, name: "Tunisia" };
  }, [activeDestination, uniqueStops]);

  // Build the embed query
  const embedUrl = useMemo(() => {
    if (uniqueStops.length === 0) {
      // General Tunisia map centered
      return `https://maps.google.com/maps?q=Tunisia&t=${mapType}&z=6&ie=UTF8&iwloc=&output=embed`;
    }

    const first = uniqueStops[0];
    if (uniqueStops.length === 1 && first) {
      return `https://maps.google.com/maps?q=${first.lat},${first.lng}&t=${mapType}&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;
    }

    // When multiple stops exist, search query includes all cities for routing context
    const routeQuery = uniqueStops.map((s) => s.name).join("+to+");
    return `https://maps.google.com/maps?q=${routeQuery}&t=${mapType}&z=${zoomLevel}&ie=UTF8&iwloc=&output=embed`;
  }, [uniqueStops, mapType, zoomLevel]);

  // Google Maps Directions link for the real user route
  const googleDirectionsUrl = useMemo(() => {
    const first = uniqueStops[0];
    const last = uniqueStops[uniqueStops.length - 1];

    if (uniqueStops.length === 0 || !first) {
      return "https://www.google.com/maps/place/Tunisia";
    }
    if (uniqueStops.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(first.name + ", Tunisia")}`;
    }
    const origin = encodeURIComponent(`${first.name}, Tunisia`);
    const destination = encodeURIComponent(`${last ? last.name : first.name}, Tunisia`);
    const waypoints = uniqueStops
      .slice(1, -1)
      .map((s) => encodeURIComponent(`${s.name}, Tunisia`))
      .join("%7C");

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ""
    }&travelmode=driving`;
  }, [uniqueStops]);

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-soft", className)}>
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/50 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="size-3.5 text-accent shrink-0 animate-bounce" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground truncate sm:text-xs">
            {title}
          </span>
          {uniqueStops.length > 0 && (
            <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent sm:text-[10px]">
              {uniqueStops.length} Stop{uniqueStops.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle Satellite / Roadmap */}
          <button
            type="button"
            onClick={() => setMapType((prev) => (prev === "m" ? "k" : "m"))}
            title={mapType === "m" ? "Switch to Satellite" : "Switch to Roadmap"}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground sm:text-[11px] sm:py-1"
          >
            <Layers className="size-3" />
            {mapType === "m" ? "Satellite" : "Map"}
          </button>

          {/* Open full route in Google Maps */}
          <a
            href={googleDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/20 sm:text-[11px] sm:px-2.5 sm:py-1"
          >
            <Navigation className="size-3" />
            Directions
            <ExternalLink className="size-2.5 sm:size-3" />
          </a>
        </div>
      </div>

      {/* Real Interactive Google Maps Iframe */}
      <div className="relative w-full bg-muted" style={{ height }}>
        <iframe
          title="Google Map of Real Destinations"
          src={embedUrl}
          className="size-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Live overlay badge for current stops */}
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex flex-col gap-1.5 rounded-xl bg-background/90 p-2 text-xs backdrop-blur-md border border-border/80 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 font-medium text-foreground text-[11px]">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="shrink-0 font-semibold">Active Destinations:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {uniqueStops.length > 0 ? (
              uniqueStops.map((stop, i) => (
                <span
                  key={stop.slug}
                  className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-foreground border border-border/50"
                >
                  <strong className="text-accent">{i + 1}.</strong> {stop.name}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Awaiting destination choices
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
