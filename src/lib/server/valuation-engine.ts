import "server-only";

/**
 * The "Desktop Land Valuation" calculation from docs/VALUATION_MODEL.md and
 * docs/ROADMAP.md §2:
 *
 *   opportunities = density (units/ha) × net developable hectares
 *   land value    = average unit price × opportunities × status %
 *
 * Deliberately municipality-agnostic — the density defaults are Morné's own
 * rule-of-thumb ranges, not tied to any single scheme, so the tool travels
 * to any municipality without relabeling.
 *
 * This file is the calibrated IP — density defaults and the status ladder —
 * and it must never reach the browser in bulk. The route that calls this
 * returns only the computed figures for one specific request, never the
 * tables. See the memory note on why: the arithmetic is trivial, the
 * calibration is what is actually being sold.
 */

export type ProductType =
  | "single_residential"
  | "town_housing"
  | "apartments_standard"
  | "apartments_dense"
  | "apartments_high_density"
  | "basket_of_rights";

export type LandStatus = "raw_agricultural" | "approval_in_process" | "approval_granted" | "zoned_sdp_approved";

export const PRODUCT_LABELS: Record<ProductType, string> = {
  single_residential: "Single residential (houses)",
  town_housing: "Town housing / semi-detached",
  apartments_standard: "Apartments — standard",
  apartments_dense: "Apartments — dense / urban edge",
  apartments_high_density: "Apartments — high density",
  basket_of_rights: "Basket of rights (mixed unit types)",
};

export const STATUS_LABELS: Record<LandStatus, string> = {
  raw_agricultural: "Raw agricultural land",
  approval_in_process: "Approval process begun, not granted",
  approval_granted: "Approval granted for X opportunities",
  zoned_sdp_approved: "Zoned, SDP approved",
};

/**
 * Units per net hectare. Morné's own rule-of-thumb ranges, not tied to any
 * one municipality's scheme — deliberately generic so the tool travels.
 * `basket_of_rights` has no default: opportunities are supplied directly per
 * unit type instead of derived from a density.
 */
const DENSITY_DEFAULTS: Record<Exclude<ProductType, "basket_of_rights">, number> = {
  single_residential: 35,
  town_housing: 50,
  apartments_standard: 80,
  apartments_dense: 100,
  apartments_high_density: 120,
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

export interface BasketRow {
  unitType: string;
  opportunities: number;
  pricePerOpportunity: number;
}

/**
 * How the opportunity count is arrived at.
 *
 *  - `density` — units per net hectare, the rule-of-thumb route. What a broker
 *    reaches for when all that is known is "apartments, roughly this dense".
 *  - `bulk` — floor factor and average unit size, the route a town planner and
 *    an architect actually work in. A Cape Town GR3 site is granted a floor
 *    factor and a coverage, not a density, and back-solving a density from
 *    them is exactly the step that loses the argument with the planner.
 *
 * Both land in the same place: a number of opportunities on a net area. Which
 * one is honest depends on what the site's approval actually says, which is
 * why the tool asks rather than assuming.
 */
export type OpportunityBasis = "density" | "bulk";

export interface QuickValuationInput {
  /** Gross site area in hectares. Ignored if developable/nonDevelopable are both supplied. */
  grossHectares?: number;
  /** Direct % override, 0–1. Ignored if developable/nonDevelopable are both supplied. */
  netRatio?: number;
  /**
   * Absolute areas in hectares (already converted from m² client-side, since
   * that conversion is plain unit arithmetic, not part of the IP). When both
   * are supplied they take priority over grossHectares/netRatio entirely —
   * this is the "SDP shows 56%/44%, let me type the actual numbers" path.
   */
  developableHectares?: number;
  nonDevelopableHectares?: number;

  productType: ProductType;
  /** Defaults to `density`. Ignored for basket_of_rights, which supplies counts directly. */
  basis?: OpportunityBasis;
  /**
   * Bulk basis only. The floor factor (FAR/FSR) granted by the zoning, and the
   * average unit size it is to be divided into. Floor factor is quoted against
   * the *gross* site area in every South African scheme regulation seen so far,
   * which is why it multiplies gross rather than net here — getting this wrong
   * overstates a constrained site badly.
   */
  floorFactor?: number;
  averageUnitSizeM2?: number;
  /** Bulk basis, optional. Site coverage as a fraction — reported, not calculated from. */
  coverage?: number;
  /** Units/net-ha override. Ignored for basket_of_rights and on the bulk basis. */
  density?: number;
  /** Required unless productType is basket_of_rights. */
  averageUnitPrice?: number;
  /** Required when productType is basket_of_rights; ignored otherwise. */
  basket?: BasketRow[];
  status: LandStatus;
}

export interface QuickValuationResult {
  grossHectares: number;
  netHectares: number;
  nonDevelopableHectares: number;
  netRatioUsed: number;
  netRatioWasDefaulted: boolean;
  areaSplitMode: "ratio" | "absolute";

  basisUsed: OpportunityBasis | "basket";
  densityUsed: number;
  /** The inverse Morné asked for: opportunities per GROSS hectare, not net. */
  effectiveDensityPerGrossHectare: number;

  /** Bulk basis only — the workings the report shows instead of a density. */
  bulk?: {
    floorFactor: number;
    averageUnitSizeM2: number;
    totalFloorAreaM2: number;
    coverage?: number;
    /**
     * The density the bulk figures imply. Shown because it is the number that
     * tells a seller whether their architect's scheme is plausible — and it is
     * routinely far above any rule-of-thumb default.
     */
    impliedDensityPerNetHectare: number;
    /** Set when the implied density exceeds every default in the ladder. */
    exceedsDensityLadder: boolean;
  };

  statusPctUsed: number;
  opportunities: number;
  landValue: number;
  valuePerHectare: number;
  valuePerOpportunity: number;

  /** Present only for basket_of_rights — the per-row workings for the report. */
  basketBreakdown?: {
    unitType: string;
    opportunities: number;
    pricePerOpportunity: number;
    grossRealisation: number;
  }[];
}

export class ValuationInputError extends Error {}

function assertFinitePositive(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValuationInputError(`${field} must be a positive number`);
  }
}

export function calculateQuickValuation(input: QuickValuationInput): QuickValuationResult {
  if (!(input.productType in PRODUCT_LABELS)) {
    throw new ValuationInputError("Unknown productType");
  }
  if (!(input.status in STATUS_PERCENTAGES)) {
    throw new ValuationInputError("Unknown status");
  }

  // --- Area: absolute split takes priority over gross + ratio -------------
  const hasAbsoluteSplit =
    input.developableHectares !== undefined && input.nonDevelopableHectares !== undefined;

  let grossHectares: number;
  let netHectares: number;
  let netRatioUsed: number;
  let netRatioWasDefaulted: boolean;
  let nonDevelopableHectares: number;
  const areaSplitMode: "ratio" | "absolute" = hasAbsoluteSplit ? "absolute" : "ratio";

  if (hasAbsoluteSplit) {
    assertFinitePositive(input.developableHectares!, "developableHectares");
    if (!Number.isFinite(input.nonDevelopableHectares!) || input.nonDevelopableHectares! < 0) {
      throw new ValuationInputError("nonDevelopableHectares must be zero or a positive number");
    }
    netHectares = input.developableHectares!;
    nonDevelopableHectares = input.nonDevelopableHectares!;
    grossHectares = netHectares + nonDevelopableHectares;
    netRatioUsed = netHectares / grossHectares;
    netRatioWasDefaulted = false;
  } else {
    assertFinitePositive(input.grossHectares ?? NaN, "grossHectares");
    grossHectares = input.grossHectares!;
    netRatioWasDefaulted = input.netRatio === undefined;
    netRatioUsed = input.netRatio ?? DEFAULT_NET_RATIO;
    if (netRatioUsed <= 0 || netRatioUsed > 1) {
      throw new ValuationInputError("netRatio must be between 0 and 1");
    }
    netHectares = grossHectares * netRatioUsed;
    nonDevelopableHectares = grossHectares - netHectares;
  }

  const statusPctUsed = STATUS_PERCENTAGES[input.status];

  // --- Opportunities and value ---------------------------------------------
  let densityUsed: number;
  let opportunities: number;
  let landValue: number;
  let valuePerOpportunity: number;
  let basketBreakdown: QuickValuationResult["basketBreakdown"];
  let bulk: QuickValuationResult["bulk"];
  let basisUsed: QuickValuationResult["basisUsed"];

  if (input.productType === "basket_of_rights") {
    if (!input.basket || input.basket.length === 0) {
      throw new ValuationInputError("basket must contain at least one row");
    }
    let totalOpportunities = 0;
    let totalGrossRealisation = 0;
    basketBreakdown = input.basket.map((row) => {
      assertFinitePositive(row.opportunities, "basket row opportunities");
      assertFinitePositive(row.pricePerOpportunity, "basket row pricePerOpportunity");
      const grossRealisation = row.opportunities * row.pricePerOpportunity;
      totalOpportunities += row.opportunities;
      totalGrossRealisation += grossRealisation;
      return {
        unitType: row.unitType || "Unnamed unit type",
        opportunities: row.opportunities,
        pricePerOpportunity: row.pricePerOpportunity,
        grossRealisation,
      };
    });
    opportunities = totalOpportunities;
    landValue = totalGrossRealisation * statusPctUsed;
    valuePerOpportunity = totalGrossRealisation / totalOpportunities;
    densityUsed = totalOpportunities / netHectares;
    basisUsed = "basket";
  } else {
    assertFinitePositive(input.averageUnitPrice ?? NaN, "averageUnitPrice");
    basisUsed = input.basis ?? "density";

    if (basisUsed === "bulk") {
      assertFinitePositive(input.floorFactor ?? NaN, "floorFactor");
      assertFinitePositive(input.averageUnitSizeM2 ?? NaN, "averageUnitSizeM2");

      // Floor factor is granted against the gross site area, so the whole site
      // earns bulk — including the parts that cannot be built on. That is what
      // lets a site with half of it under conservation still carry a scheme,
      // and it is the single most common thing a density-only model gets wrong.
      const totalFloorAreaM2 = input.floorFactor! * grossHectares * 10_000;
      opportunities = totalFloorAreaM2 / input.averageUnitSizeM2!;
      densityUsed = opportunities / netHectares;

      bulk = {
        floorFactor: input.floorFactor!,
        averageUnitSizeM2: input.averageUnitSizeM2!,
        totalFloorAreaM2,
        coverage: input.coverage,
        impliedDensityPerNetHectare: densityUsed,
        exceedsDensityLadder:
          densityUsed > Math.max(...Object.values(DENSITY_DEFAULTS)),
      };
    } else {
      densityUsed = input.density ?? DENSITY_DEFAULTS[input.productType];
      assertFinitePositive(densityUsed, "density");
      opportunities = densityUsed * netHectares;
    }

    valuePerOpportunity = input.averageUnitPrice! * statusPctUsed;
    landValue = valuePerOpportunity * opportunities;
  }

  const valuePerHectare = landValue / grossHectares;
  const effectiveDensityPerGrossHectare = opportunities / grossHectares;

  return {
    grossHectares,
    netHectares,
    nonDevelopableHectares,
    netRatioUsed,
    netRatioWasDefaulted,
    areaSplitMode,
    basisUsed,
    densityUsed,
    effectiveDensityPerGrossHectare,
    bulk,
    statusPctUsed,
    opportunities,
    landValue,
    valuePerHectare,
    valuePerOpportunity,
    basketBreakdown,
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
