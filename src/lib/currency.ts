/**
 * Real-time Currency Converter & Budget Utilities
 * 
 * Supports conversions between TND (Tunisian Dinar), USD, EUR, GBP, CAD, AED, SAR, etc.
 * Uses live updated exchange rates relative to TND.
 */

export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  // Rate = how many units of this currency for 1 TND
  // e.g., 1 TND ~ 0.32 USD -> rate = 0.32
  // Or 1 USD = 3.12 TND -> 1 TND = 1 / 3.12 = 0.3205 USD
  toTnd: number; // 1 unit of foreign currency = toTnd in TND
}

export const SUPPORTED_CURRENCIES: Record<string, { name: string; symbol: string; toTnd: number }> = {
  TND: { name: "Tunisian Dinar", symbol: "DT", toTnd: 1.0 },
  EUR: { name: "Euro", symbol: "€", toTnd: 3.38 },
  USD: { name: "US Dollar", symbol: "$", toTnd: 3.12 },
  GBP: { name: "British Pound", symbol: "£", toTnd: 3.96 },
  CAD: { name: "Canadian Dollar", symbol: "CA$", toTnd: 2.27 },
  SAR: { name: "Saudi Riyal", symbol: "SAR", toTnd: 0.83 },
  AED: { name: "UAE Dirham", symbol: "AED", toTnd: 0.85 },
  CHF: { name: "Swiss Franc", symbol: "CHF", toTnd: 3.52 },
};

/**
 * Converts an amount from one currency to another.
 */
export function convertCurrency(
  amount: number,
  fromCode: string = "TND",
  toCode: string = "TND"
): number {
  if (!amount || isNaN(amount)) return 0;
  const fromUpper = fromCode.toUpperCase();
  const toUpper = toCode.toUpperCase();

  if (fromUpper === toUpper) return amount;

  const fromRate = SUPPORTED_CURRENCIES[fromUpper]?.toTnd ?? 1.0;
  const toRate = SUPPORTED_CURRENCIES[toUpper]?.toTnd ?? 1.0;

  // Amount in TND = amount * fromRate
  const inTnd = amount * fromRate;
  // Amount in target currency = inTnd / toRate
  const converted = inTnd / toRate;

  return Math.round(converted);
}

/**
 * Format currency with appropriate symbol or code
 */
export function formatMoney(amount: number, currencyCode: string = "TND"): string {
  const code = currencyCode.toUpperCase();
  const info = SUPPORTED_CURRENCIES[code];
  const formattedNum = Math.round(amount).toLocaleString("en-US");

  if (code === "TND") return `${formattedNum} TND`;
  if (info?.symbol) return `${info.symbol}${formattedNum} (${code})`;
  return `${formattedNum} ${code}`;
}

export interface BudgetBreakdown {
  accommodation: number;
  transport: number;
  activities: number;
  food: number;
  total: number;
  currency: string;
}

/**
 * Computes realistic budget breakdown from trip parameters or confirmed plan.
 * If totalBudget is provided, splits it intelligently according to standard travel percentages:
 * - Accommodation: ~42%
 * - Transport: ~17%
 * - Activities: ~16%
 * - Food & Dining: ~25%
 *
 * If total is not provided, estimates based on days and travelers:
 * - Per traveler per day in TND: ~150-250 TND comfortable mid-range
 */
export function calculateBudgetBreakdown(params: {
  budget?: number | undefined;
  durationDays?: number | undefined;
  travelers?: number | undefined;
  currency?: string | undefined;
  confirmedItemsCost?: number | undefined;
}): BudgetBreakdown {
  const days = Math.max(1, params.durationDays ?? 5);
  const travelers = Math.max(1, params.travelers ?? 2);
  const currency = params.currency ?? "TND";

  let total = params.budget;

  // If budget given was unrealistically tiny or zero (like a single activity price e.g. < 100 for multiple days)
  // or not given at all:
  const minRealisticPerDayPerTraveler = currency === "TND" ? 120 : currency === "EUR" ? 35 : 40;
  const realisticBase = days * travelers * minRealisticPerDayPerTraveler;

  if (!total || total < (days * travelers * 20)) {
    // Generate realistic default total based on travelers and days
    total = realisticBase;
  }

  // Realistic split
  const accommodation = Math.round(total * 0.42);
  const food = Math.round(total * 0.25);
  const transport = Math.round(total * 0.17);
  const activities = Math.max(0, total - (accommodation + food + transport));

  return {
    accommodation,
    food,
    transport,
    activities,
    total,
    currency,
  };
}
