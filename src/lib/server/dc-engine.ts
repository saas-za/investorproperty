import "server-only";

/**
 * Development charges engine.
 *
 * Reverse-engineered from the City of Cape Town's published DC Calculator
 * (v4.1, Aug 2025) — see `docs/DEVELOPMENT_CHARGES.md` for the full derivation.
 * The engine is municipality-agnostic; Cape Town is simply the first rate set
 * extracted, because it is the only one whose calculator has been obtained.
 *
 * Server-only for the same reason as the valuation engine: the demand factors
 * are the product of reading a spreadsheet nobody else has bothered to read,
 * and shipping the table to the browser gives that away for free.
 *
 * The formula, in full:
 *
 *   Additional demand = max(0, new right − existing right)
 *   Charge per service = additional demand × unit cost for the financial year
 *   Total = Σ six services + link services + VAT
 *
 * You are charged on the *increase* in demand. Existing rights are credited and
 * the result is floored at zero, so reducing demand earns nothing back.
 */

export type MunicipalityCode = "CPT";

/** One row of the land-use table. Demand is per unit of whatever `per` says. */
interface LandUse {
  code: string;
  label: string;
  /** What one "unit" of this land use is. Drives the input label. */
  per: "unit" | "m2" | "room" | "bed" | "learner";
  category: "Residential" | "Business" | "Industrial" | "Institutional" | "Other";
  /**
   * Total charge per unit, excluding VAT and link services, at the base rate
   * year. Derived from the six per-service demand factors in the source
   * workbook; carried as a total because that is the figure the calculator
   * itself reports and the only one that survives verification against it.
   */
  chargePerUnit: number;
  /** Roads share of the total, which is the part PT2 discounts. */
  roadsTripsPerUnit?: number;
}

/**
 * Cape Town land uses, at 2025/26 rates excluding VAT.
 *
 * Only the codes a land estimate actually reaches for are carried. The full
 * calculator has 30+; the rest are added when someone needs them, since each
 * one has to be checked against the workbook rather than guessed.
 */
const CPT_LAND_USES: LandUse[] = [
  { code: "A1", label: "Residential, erf over 1 000 m²", per: "unit", category: "Residential", chargePerUnit: 39_755.09, roadsTripsPerUnit: 4.0 },
  { code: "A2", label: "Residential, erf over 650 m²", per: "unit", category: "Residential", chargePerUnit: 36_012.28, roadsTripsPerUnit: 3.8 },
  { code: "A3", label: "Residential, erf over 350 m²", per: "unit", category: "Residential", chargePerUnit: 32_142.19, roadsTripsPerUnit: 3.6 },
  { code: "A4", label: "Residential, erf under 350 m²", per: "unit", category: "Residential", chargePerUnit: 28_410.59, roadsTripsPerUnit: 3.5 },
  { code: "A5", label: "State funded housing", per: "unit", category: "Residential", chargePerUnit: 10_065.14, roadsTripsPerUnit: 0.375 },
  { code: "A6", label: "GAP / affordable housing", per: "unit", category: "Residential", chargePerUnit: 13_514.99, roadsTripsPerUnit: 0.75 },
  { code: "A7", label: "Group housing, erf over 650 m²", per: "unit", category: "Residential", chargePerUnit: 35_106.24, roadsTripsPerUnit: 3.75 },
  { code: "A8", label: "Group housing, erf over 200 m²", per: "unit", category: "Residential", chargePerUnit: 27_984.44, roadsTripsPerUnit: 3.188 },
  { code: "A9", label: "Group housing, erf under 200 m²", per: "unit", category: "Residential", chargePerUnit: 24_698.70, roadsTripsPerUnit: 2.762 },
  { code: "A10", label: "Flats over 70 m² per unit", per: "unit", category: "Residential", chargePerUnit: 22_048.15, roadsTripsPerUnit: 2.75 },
  { code: "A11", label: "Flats under 70 m² per unit", per: "unit", category: "Residential", chargePerUnit: 17_618.42, roadsTripsPerUnit: 2.0 },
  { code: "A12", label: "Flats under 30 m² per unit", per: "unit", category: "Residential", chargePerUnit: 13_997.29, roadsTripsPerUnit: 1.35 },
  { code: "A15", label: "Affordable rental unit", per: "unit", category: "Residential", chargePerUnit: 5_627.09, roadsTripsPerUnit: 0.35 },
  { code: "A16", label: "Rural / agricultural / undetermined", per: "unit", category: "Residential", chargePerUnit: 39_755.09, roadsTripsPerUnit: 4.0 },
  { code: "B1", label: "Hotel", per: "room", category: "Business", chargePerUnit: 14_604.55 },
  { code: "B3", label: "Boarding / student accommodation", per: "bed", category: "Business", chargePerUnit: 4_636.17 },
  { code: "C1", label: "General business", per: "m2", category: "Business", chargePerUnit: 808.41 },
  { code: "C2", label: "Office", per: "m2", category: "Business", chargePerUnit: 552.39 },
  { code: "C3", label: "Retail / shop", per: "m2", category: "Business", chargePerUnit: 1_080.04 },
  { code: "D1", label: "Warehouse", per: "m2", category: "Industrial", chargePerUnit: 246.14 },
  { code: "D2", label: "Industrial", per: "m2", category: "Industrial", chargePerUnit: 391.36 },
  { code: "E2", label: "Schools / universities", per: "learner", category: "Institutional", chargePerUnit: 6_008.11 },
  { code: "E6", label: "Public open space", per: "m2", category: "Other", chargePerUnit: 10.94 },
];

/**
 * Roads unit cost per trip/day. The workbook's headline R3,559.74 is the
 * average of the two tiers and is only a placeholder; the live calculation
 * uses the tier that applies. See §2 of `docs/DEVELOPMENT_CHARGES.md` — the
 * lower tier is derived, not published, and is flagged there as needing
 * confirmation against the City before anyone relies on the PT2 figure.
 */
const ROADS_RATE_STANDARD = 4_840.69;
const ROADS_RATE_PT2 = 2_278.79;

/**
 * Unit costs escalate on 1 July by the City's CPAF, and the charge uses the
 * rate applying when the application is made — so the financial year is an
 * input, not a constant. Only 2025/26 has been read off the workbook; the
 * later years carry the City's own medium-term CPAF assumption and are
 * labelled as projections wherever they are used.
 */
const RATE_YEARS: Record<string, { factor: number; projected: boolean }> = {
  "2025/26": { factor: 1.0, projected: false },
  "2026/27": { factor: 1.055, projected: true },
  "2027/28": { factor: 1.113, projected: true },
};

export const DEFAULT_RATE_YEAR = "2025/26";

/** Resolved from date bands in the source workbook rather than hardcoded there. */
const VAT_RATE = 0.15;

export class DcInputError extends Error {}

export interface DcLine {
  /** Land use code, e.g. "A11". */
  code: string;
  /** What the site may build once developed. */
  newRight: number;
  /** What it may already build today. Credited, never refunded. */
  existingRight?: number;
}

export interface DcInput {
  municipality: MunicipalityCode;
  lines: DcLine[];
  /** Inside a Public Transport (PT2) zone, which discounts the roads rate. */
  pt2?: boolean;
  rateYear?: string;
  /** Site-specific connector works. Entered by hand; the City does not derive them. */
  linkServices?: number;
}

export interface DcLineResult {
  code: string;
  label: string;
  per: LandUse["per"];
  newRight: number;
  existingRight: number;
  additionalDemand: number;
  ratePerUnit: number;
  charge: number;
}

export interface DcResult {
  municipality: MunicipalityCode;
  municipalityName: string;
  rateYear: string;
  /** True when the rate year is a CPAF projection rather than a published rate. */
  projectedRates: boolean;
  pt2: boolean;
  lines: DcLineResult[];
  bulkServices: number;
  linkServices: number;
  vat: number;
  total: number;
  /** What the same scheme would cost outside a PT2 zone, when one applies. */
  pt2Saving?: number;
  notes: string[];
}

const MUNICIPALITY_NAMES: Record<MunicipalityCode, string> = {
  CPT: "City of Cape Town",
};

/** Labels only — never the charge table, which is the part worth keeping. */
export function landUseOptions(municipality: MunicipalityCode) {
  if (municipality !== "CPT") return [];
  return CPT_LAND_USES.map((u) => ({
    value: u.code,
    label: `${u.code} — ${u.label}`,
    per: u.per,
    category: u.category,
  }));
}

export function rateYearOptions() {
  return Object.entries(RATE_YEARS).map(([value, meta]) => ({
    value,
    label: meta.projected ? `${value} (projected)` : value,
  }));
}

/**
 * The charge for one land use, at the requested year's rates, with the roads
 * component swapped to the PT2 tier where that applies.
 */
function rateFor(use: LandUse, pt2: boolean, escalation: number): number {
  let charge = use.chargePerUnit;
  if (pt2 && use.roadsTripsPerUnit) {
    const roadsDelta = use.roadsTripsPerUnit * (ROADS_RATE_PT2 - ROADS_RATE_STANDARD);
    // Floor at zero: the roads component cannot take the total negative, and
    // the City never refunds.
    charge = Math.max(0, charge + roadsDelta);
  }
  return charge * escalation;
}

export function calculateDevelopmentCharges(input: DcInput): DcResult {
  if (input.municipality !== "CPT") {
    throw new DcInputError(
      "Development charges are only available for the City of Cape Town so far",
    );
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new DcInputError("At least one land use is required");
  }

  const rateYear = input.rateYear ?? DEFAULT_RATE_YEAR;
  const yearMeta = RATE_YEARS[rateYear];
  if (!yearMeta) throw new DcInputError(`No rates loaded for ${rateYear}`);

  const pt2 = Boolean(input.pt2);
  const linkServices = Math.max(0, input.linkServices ?? 0);

  const lines: DcLineResult[] = input.lines.map((line) => {
    const use = CPT_LAND_USES.find((u) => u.code === line.code);
    if (!use) throw new DcInputError(`Unknown land use code "${line.code}"`);

    const newRight = Number(line.newRight);
    const existingRight = Number(line.existingRight ?? 0);
    if (!Number.isFinite(newRight) || newRight < 0) {
      throw new DcInputError(`${line.code}: new right must be zero or more`);
    }
    if (!Number.isFinite(existingRight) || existingRight < 0) {
      throw new DcInputError(`${line.code}: existing right must be zero or more`);
    }

    const additionalDemand = Math.max(0, newRight - existingRight);
    const ratePerUnit = rateFor(use, pt2, yearMeta.factor);

    return {
      code: use.code,
      label: use.label,
      per: use.per,
      newRight,
      existingRight,
      additionalDemand,
      ratePerUnit,
      charge: additionalDemand * ratePerUnit,
    };
  });

  const bulkServices = lines.reduce((s, l) => s + l.charge, 0);
  const vat = (bulkServices + linkServices) * VAT_RATE;

  const notes: string[] = [
    "Charged on the increase in demand — existing development rights are credited, and the difference is floored at zero.",
    `Rates are the City of Cape Town's ${rateYear} figures${yearMeta.projected ? ", projected forward by the CPAF" : ""}. They escalate every 1 July, and the charge uses the rate applying when the application is made.`,
  ];
  if (linkServices === 0) {
    notes.push(
      "Link services — the site-specific connector works — are not included. The City does not derive them; your engineer does.",
    );
  }
  if (pt2) {
    notes.push(
      "The PT2 roads rate has been applied. The lower tier is derived from the published workbook rather than separately published, so confirm it with the City before relying on the figure.",
    );
  }

  let pt2Saving: number | undefined;
  if (pt2) {
    const standard = lines.reduce((s, l) => {
      const use = CPT_LAND_USES.find((u) => u.code === l.code)!;
      return s + l.additionalDemand * rateFor(use, false, yearMeta.factor);
    }, 0);
    pt2Saving = (standard - bulkServices) * (1 + VAT_RATE);
  }

  return {
    municipality: input.municipality,
    municipalityName: MUNICIPALITY_NAMES[input.municipality],
    rateYear,
    projectedRates: yearMeta.projected,
    pt2,
    lines,
    bulkServices,
    linkServices,
    vat,
    total: bulkServices + linkServices + vat,
    pt2Saving,
    notes,
  };
}

/**
 * The commercial point of the whole module: what the same number of units costs
 * across typologies. DC per unit falls 86% from a large erf to an affordable
 * rental, which on a 200-unit scheme is a swing of over R5 million — driven
 * purely by unit size, and almost never priced consciously at concept stage.
 */
export function typologyComparison(
  units: number,
  pt2 = false,
  rateYear = DEFAULT_RATE_YEAR,
) {
  const yearMeta = RATE_YEARS[rateYear] ?? RATE_YEARS[DEFAULT_RATE_YEAR];
  const residential = CPT_LAND_USES.filter((u) => u.category === "Residential");
  const rows = residential.map((u) => {
    const perUnit = rateFor(u, pt2, yearMeta.factor) * (1 + VAT_RATE);
    return { code: u.code, label: u.label, perUnit, total: perUnit * units };
  });
  const dearest = Math.max(...rows.map((r) => r.total));
  const cheapest = Math.min(...rows.map((r) => r.total));
  return { rows, spread: dearest - cheapest };
}
