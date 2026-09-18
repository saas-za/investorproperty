/**
 * The conveyancing/sales platform, renamed from Propello to Parcelo — the
 * .com/.co.za/.app domains all came back unclaimed, where propello.co.za did
 * not, and it names the actual differentiator (verified cadastral parcels)
 * rather than a generic momentum word. Every user-facing reference reads
 * from here so a further rename stays a one-line change.
 */
export const platform = {
  name: "Parcelo",
  tagline: "Sales & transfer management for developments",
  url: "https://conveyassist.co.za",
  enabled: false,
} as const;

export const portal = {
  name: "Investor Property",
  product: "Desktop Land Estimate",
} as const;
