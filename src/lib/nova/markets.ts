/**
 * Country rollout defaults for NOVA.
 * Supplier quotes must keep their own currency; this is only the launch-market default.
 */
export const NOVA_LAUNCH_MARKET = {
  countryCode: "TN",
  countryName: "Tunisia",
  defaultCurrency: "TND",
  timeZone: "Africa/Tunis",
  supportedLocales: ["ar-TN", "fr-TN", "en"],
} as const;
