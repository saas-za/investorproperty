import "server-only";

/**
 * Method A — the "quick land value" calculation from docs/VALUATION_MODEL.md
 * and docs/ROADMAP.md §2:
 *
 *   opportunities = density (units/ha) × net developable hectares
 *   land value    = average unit price × opportunities × status %
 *
 * This file is the calibrated IP — density defaults, the status ladder, and
 * the net-developable ratio — and it must never reach the browser. The route
 * that calls this returns only the computed figures, never these tables. See
 * the memory note on why: the arithmetic is trivial, the calibration is what
 * is actually being sold.
 */

export type ProductType =
  | "single_residential"
  | "town_housing"
  | "apartments_standard"
  | "apartments_dense"
  | "apartments_cpt_high_density";

export type LandStatus = "raw_agricultural" | "approval_in_process" | "approval_granted" | "zoned_sdp_approved";

export const PRODUCT_LABELS: Record<ProductType, string> = {
  single_residential: "Single residential (houses)",
  town_housing: "Town housing / semi-detached",
  apartments_standard: "Apartments — standard",
  apartments_dense: "Apartments — dense / urban edge",
  apartments_cpt_high_density: "Apartments — high density (City of Cape Town)",
};

export const STATUS_LABELS: Record<LandStatus, string> = {
  raw_agricultural: "Raw agricultural land",
  approval_in_process: "Approval process begun, not granted",
  approval_granted: "Approval granted for X opportunities",
  zoned_sdp_approved: "Zoned, SDP approved",
};

/** Units per hectare. Midpoints of the ranges Morné gave, not hard limits. */
const DENSITY_DEFAULTS: Record<ProductType, number> = {
  single_residential: 30,
  town_housing: 50,
  apartments_standard: 80,
  apartments_dense: 110,
  apartments_cpt_high_density: 140,
};

/**
 * The status ladder — % of the eventual unit price attributable to the raw
 * opportunity. Midpoints where Morné gave a range. This is the single most
 * commercially valuable number in the model: it converts planning risk into
 * a figure, which is exactly what a developer cannot do on an envelope and a
 * seller systematically gets wrong.
 */
const STATUS_PERCENTAGES: Record<LandStatus, number> = {
  raw_agricultural: 0.065,
  approval_in_process: 0.10,
  approval_granted: 0.12,
  zoned_sdp_approved: 0.15,
};

/**
 * Default land efficiency — the 60/40 split Morné described (60% usable,
 * 40% roads/communal/services). Deliberately conservative and always
 * overridable; see docs/ROADMAP.md §9.2 for why this varies by land use.
 */
export const DEFAULT_NET_RATIO = 0.6;

export interface QuickValuationInput {
  grossHectares: number;
  productType: ProductType;
  /** Units/ha override. Falls back to the product default when omitted. */
  density?: number;
  /** Share of gross area that is actually developable/sellable, 0–1. */
  netRatio?: number;
  averageUnitPrice: number;
  status: LandStatus;
}

export interface QuickValuationResult {
  netHectares: number;
  netRatioUsed: number;
  densityUsed: number;
  statusPctUsed: number;
  opportunities: number;
  landValue: number;
  valuePerHectare: number;
  valuePerOpportunity: number;
  /** Set when the net ratio was defaulted rather than supplied, so the UI can warn. */
  netRatioWasDefaulted: boolean;
}

export class ValuationInputError extends Error {}

function assertFinitePositive(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValuationInputError(`${field} must be a positive number`);
  }
}

export function calculateQuickValuation(input: QuickValuationInput): QuickValuationResult {
  assertFinitePositive(input.grossHectares, "grossHectares");
  assertFinitePositive(input.averageUnitPrice, "averageUnitPrice");

  if (!(input.productType in DENSITY_DEFAULTS)) {
    throw new ValuationInputError("Unknown productType");
  }
  if (!(input.status in STATUS_PERCENTAGES)) {
    throw new ValuationInputError("Unknown status");
  }

  const netRatioWasDefaulted = input.netRatio === undefined;
  const netRatioUsed = input.netRatio ?? DEFAULT_NET_RATIO;
  if (netRatioUsed <= 0 || netRatioUsed > 1) {
    throw new ValuationInputError("netRatio must be between 0 and 1");
  }

  const densityUsed = input.density ?? DENSITY_DEFAULTS[input.productType];
  assertFinitePositive(densityUsed, "density");

  const statusPctUsed = STATUS_PERCENTAGES[input.status];

  const netHectares = input.grossHectares * netRatioUsed;
  const opportunities = densityUsed * netHectares;
  const valuePerOpportunity = input.averageUnitPrice * statusPctUsed;
  const landValue = valuePerOpportunity * opportunities;
  const valuePerHectare = landValue / input.grossHectares;

  return {
    netHectares,
    netRatioUsed,
    densityUsed,
    statusPctUsed,
    opportunities,
    landValue,
    valuePerHectare,
    valuePerOpportunity,
    netRatioWasDefaulted,
  };
}

/** Exposed only for populating the UI's dropdowns — labels, not the maths. */
export function productOptions() {
  return (Object.keys(PRODUCT_LABELS) as ProductType[]).map((value) => ({
    value,
    label: PRODUCT_LABELS[value],
  }));
}

export function statusOptions() {
  return (Object.keys(STATUS_LABELS) as LandStatus[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  }));
}

/**
 * The density default IS the IP, so it is never sent to the browser directly
 * for display next to an editable field — that would just be the assumption
 * table with extra steps. Instead the route returns it embedded only inside
 * a computed result, after a calculation has actually been run.
 */
export function densityDefaultFor(productType: ProductType): number {
  return DENSITY_DEFAULTS[productType];
}
