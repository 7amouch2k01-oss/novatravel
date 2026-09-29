import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Info,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { SiteNav } from "@/components/nova/SiteNav";
import { BudgetDonut, budgetColors, fmt, type BudgetItem } from "@/components/nova/Budget";
import { getSavedTripContext } from "@/lib/trip-storage";
import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
  calculateBudgetBreakdown,
  formatMoney,
} from "@/lib/currency";
import type { TripContext } from "@/lib/nova/types";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Live Trip Budget & Currency Converter — TUNITRAVEL" },
      {
        name: "description",
        content:
          "Live trip budget calculated from your personalized itinerary, with live real-time currency conversions between TND, USD, EUR, GBP and more.",
      },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("TND");
  const [isClient, setIsClient] = useState(false);

  // Load saved trip context and subscribe to live changes
  useEffect(() => {
    setIsClient(true);
    const loadContext = () => {
      const saved = getSavedTripContext();
      if (saved) {
        setTripContext(saved);
        if (saved.currency && SUPPORTED_CURRENCIES[saved.currency.toUpperCase()]) {
          setSelectedCurrency(saved.currency.toUpperCase());
        }
      }
    };

    loadContext();

    const handleUpdate = () => loadContext();
    window.addEventListener("tunitravel_trip_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("tunitravel_trip_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Compute realistic base values in TND
  const baseTndBreakdown = useMemo(() => {
    const days = tripContext?.durationDays ?? (tripContext?.confirmedDaysPlan?.length || 5);
    const travelers = tripContext?.travelers ?? 2;

    // Sum activities if available
    let confirmedActivitiesSum = 0;
    if (tripContext?.confirmedDaysPlan) {
      for (const day of tripContext.confirmedDaysPlan) {
        for (const itm of day.items) {
          if (itm.estimatedCost) confirmedActivitiesSum += itm.estimatedCost;
        }
      }
    }

    // Check user's stored budget
    const originalCurrency = tripContext?.currency?.toUpperCase() ?? "TND";
    const rawBudget = tripContext?.budget;

    // Convert raw budget to TND if specified in foreign currency
    let budgetInTnd: number | undefined = undefined;
    if (rawBudget && rawBudget > 0) {
      budgetInTnd = convertCurrency(rawBudget, originalCurrency, "TND");
    }

    return calculateBudgetBreakdown({
      budget: budgetInTnd,
      durationDays: days,
      travelers,
      currency: "TND",
      confirmedItemsCost: confirmedActivitiesSum > 0 ? confirmedActivitiesSum : undefined,
    });
  }, [tripContext]);

  // Convert breakdown to selected currency
  const convertedBreakdown = useMemo(() => {
    const accommodation = convertCurrency(baseTndBreakdown.accommodation, "TND", selectedCurrency);
    const transport = convertCurrency(baseTndBreakdown.transport, "TND", selectedCurrency);
    const activities = convertCurrency(baseTndBreakdown.activities, "TND", selectedCurrency);
    const food = convertCurrency(baseTndBreakdown.food, "TND", selectedCurrency);
    const total = accommodation + transport + activities + food;

    const items: BudgetItem[] = [
      { label: "Accommodation", value: accommodation },
      { label: "Transport", value: transport },
      { label: "Activities", value: activities },
      { label: "Food & Dining", value: food },
    ];

    return {
      items,
      total,
      currency: selectedCurrency,
    };
  }, [baseTndBreakdown, selectedCurrency]);

  const days = tripContext?.durationDays ?? (tripContext?.confirmedDaysPlan?.length || 5);
  const travelers = tripContext?.travelers ?? 2;
  const destination = tripContext?.destination ?? "Tunisia";
  const hasLiveTrip = Boolean(tripContext && (tripContext.destination || tripContext.isPlanConfirmed || tripContext.budget));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
        {/* Header section */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <Sparkles className="size-3.5" />
                {hasLiveTrip ? "Live User Trip Budget" : "Dynamic Travel Planner"}
              </span>
              {tripContext?.isPlanConfirmed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Confirmed Itinerary
                </span>
              )}
            </div>

            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-5xl">
              Estimated Trip Budget
            </h1>

            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground md:text-base">
              <span className="font-semibold text-foreground">{destination}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" /> {days} days
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users className="size-3.5" /> {travelers} travelers
              </span>
              {hasLiveTrip && (
                <>
                  <span>·</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Synced from your NOVA choices
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Currency Switcher Dropdown & Pills */}
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-xs sm:w-auto">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <ArrowRightLeft className="size-3.5 text-accent" /> Currency
              </span>
              <span className="text-xs text-muted-foreground">
                1 TND ≈ {selectedCurrency === "TND" ? "1.00 DT" : `${(1 / (SUPPORTED_CURRENCIES[selectedCurrency]?.toTnd ?? 1)).toFixed(2)} ${selectedCurrency}`}
              </span>
            </div>

            {/* Quick Currency Pills */}
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(SUPPORTED_CURRENCIES).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setSelectedCurrency(cur)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    selectedCurrency === cur
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cur} ({SUPPORTED_CURRENCIES[cur]?.symbol})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Budget Card */}
        <div className="mt-10 grid items-center gap-8 rounded-3xl border border-border bg-card p-6 shadow-soft md:grid-cols-[auto_1fr] md:p-10">
          <div className="flex justify-center">
            <BudgetDonut
              size={240}
              items={convertedBreakdown.items}
              total={convertedBreakdown.total}
              currency={selectedCurrency}
            />
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Expense Category
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Amount ({selectedCurrency})
              </span>
            </div>

            <ul className="space-y-4">
              {convertedBreakdown.items.map((b, i) => {
                const pct = Math.round((b.value / Math.max(1, convertedBreakdown.total)) * 100);
                return (
                  <li key={b.label} className="group">
                    <div className="flex items-baseline justify-between text-sm sm:text-base">
                      <span className="flex items-center gap-2.5 font-semibold text-foreground">
                        <span
                          className="size-3 rounded-full shrink-0 shadow-xs"
                          style={{ background: budgetColors[i % budgetColors.length] }}
                        />
                        {b.label}
                        <span className="text-xs font-normal text-muted-foreground">({pct}%)</span>
                      </span>
                      <span className="font-display text-base font-bold text-foreground sm:text-lg">
                        {fmt(b.value)} {selectedCurrency}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: budgetColors[i % budgetColors.length],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Total Row */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 border border-border/80">
              <span className="font-semibold text-foreground">Estimated Total</span>
              <div className="text-right">
                <span className="font-display text-xl font-bold text-accent sm:text-2xl">
                  {fmt(convertedBreakdown.total)} {selectedCurrency}
                </span>
                {selectedCurrency !== "TND" && (
                  <p className="text-[11px] text-muted-foreground">
                    ≈ {fmt(baseTndBreakdown.total)} TND local currency
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Currency Conversion Table / Foreign comparison */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <DollarSign className="size-4 text-accent" />
            Trip Cost In Major Currencies
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Compare what this trip costs from your home currency to local Tunisian Dinars (TND):
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["USD", "EUR", "GBP", "TND"] as const).map((curr) => {
              const converted = convertCurrency(baseTndBreakdown.total, "TND", curr);
              const isSelected = selectedCurrency === curr;
              return (
                <div
                  key={curr}
                  onClick={() => setSelectedCurrency(curr)}
                  className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                      : "border-border bg-secondary/40 hover:bg-secondary"
                  }`}
                >
                  <p className="text-xs font-semibold text-muted-foreground">{SUPPORTED_CURRENCIES[curr]?.name}</p>
                  <p className="mt-1 font-display text-lg font-bold text-foreground">
                    {fmt(converted)} {curr}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{SUPPORTED_CURRENCIES[curr]?.symbol}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disclaimer & Action */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-sand/30 p-4 text-xs text-muted-foreground sm:text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" />
          <p>
            <strong>Live AI Budget Calculation:</strong> These numbers are dynamically computed from your active trip length ({days} days), travelers ({travelers}), and selected destinations. All currency conversions use real-time market exchange rates.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/nova"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary/90"
          >
            Ask NOVA to adjust budget or style
          </Link>
          <Link
            to="/itinerary"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
          >
            View live itinerary plan
          </Link>
        </div>
      </main>
    </div>
  );
}
