/**
 * The conveyancing/sales platform name is not finalised (ConveyAssist vs Propello
 * vs something else). Every user-facing reference reads from here so renaming it
 * later is a one-line change rather than a find-and-replace across the codebase.
 */
export const platform = {
  name: "Propello",
  tagline: "Sales & transfer management for developments",
  url: "https://conveyassist.co.za",
  enabled: false,
} as const;

export const portal = {
  name: "Investor Property",
  product: "Desktop Land Estimate",
} as const;
