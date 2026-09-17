import "server-only";

/**
 * Development CAPEX appraisal.
 *
 * Calibrated against the Oliphantskop (Langebaan) model — 21 structurally
 * identical phase sheets, worked through in `docs/VALUATION_MODEL.md`. The
 * reference implementation is Phase 1 Town Housing: 28 units, 3 828 m², which
 * the source workbook takes from R47.4m of building cost to R14.1m of profit
 * at an 18% margin. Those figures are what this engine is checked against.
 *
 * Server-only. The cost cascade and its cash-flow factors are the calibration,
 * and the calibration is the product.
 *
 * Two entry points, one engine:
 *
 *   - appraise    — land cost in, profit out. What the source model does.
 *   - residual    — target margin in, affordable land cost out. What a broker
 *                   actually needs: "what can I pay for this land?"
 */

export class CapexInputError extends Error {}

export type BuildProduct = "town_housing" | "apartments" | "single_residential";

/**
 * Defaults per product, from the source model's Data Sheet. Build rate is the
 * headline R10 000/m² typical; the R17 000 seen on some Phase 4 product is the
 * upper end of the same range, not a separate product.
 */
const PRODUCT_DEFAULTS: Record<
  BuildProduct,
  { buildRatePerM2: number; sellingRatePerM2: number; label: string }
> = {
  town_housing: { buildRatePerM2: 10_000, sellingRatePerM2: 24_000, label: "Town housing" },
  apartments: { buildRatePerM2: 12_000, sellingRatePerM2: 26_000, label: "Apartments" },
  single_residential: { buildRatePerM2: 11_000, sellingRatePerM2: 25_000, label: "Single residential" },
};

/**
 * The cost cascade's own constants, all read off the source workbook. These
 * are the numbers a naive feasibility gets wrong.
 */
const MODEL = {
  /**
   * Everything that is built but is not the building: parking bays, vibrecrete
   * walls, boundary, internal and external civils, entrance gate, electrical
   * installation, landscaping and irrigation. The source model carries each as
   * its own line; together they run 20.2% on top of the headline build rate,
   * which is why Phase 1's R10 000/m² rate produces a R12 381/m² building cost.
   * A feasibility that uses the build rate alone understates cost by a fifth.
   */
  siteWorksPct: 0.202,
  /** Design and risk contingencies, on building cost plus site works. */
  contingencies: 0.03,
  /**
   * Professional fees — structural engineer, architect, transfer, advertising,
   * security, land surveyor and civil engineer — as a share of the escalated
   * building cost, excluding VAT.
   *
   * The source Data Sheet lists the civil engineer at 8%, but 8% of the whole
   * build would be R4m on Phase 1 against total professional fees of R1.88m
   * including VAT. That 8% is therefore a fee on the civils package, not on
   * total build cost. This figure is calibrated to reproduce the benchmark
   * instead of transcribing a percentage that does not reconcile — see
   * `verifyAgainstBenchmark` below.
   */
  professionalFeesPct: 0.0325,
  escalationPerMonth: 0.008,
  preContractMonths: 6,
  contractMonths: 3.5,
  /**
   * Costs are incurred progressively, not on day one. Dropping these factors
   * is the single most common way a feasibility overstates cost — the source
   * model applies escalation to half the construction cost and then scales it
   * again by 0.51.
   */
  contractCashFlowFactor: 0.51,
  financeRatePerYear: 0.12,
  financeMonthsBuilding: 5,
  financeMonthsDevelopment: 5,
  financeMonthsVat: 2,
  vat: 0.15,
  /** Development costs — plan approval, NHBRC, bulk connections, commission,
   *  interim rates — as a share of escalated building cost. Phase 1 runs
   *  R10.7m excl VAT against R50.4m of escalated building cost. */
  developmentCostPct: 0.212,
  /** Agent commission and marketing, inside the development cost above. */
  commissionPct: 0.03,
};

export interface CapexInput {
  product: BuildProduct;
  /** Sellable floor area in m². */
  sellableAreaM2: number;
  units: number;
  /** Overrides the product default. */
  buildRatePerM2?: number;
  sellingRatePerM2?: number;
  /** Land cost. Required for `appraise`, solved for by `residual`. */
  landCost?: number;
  /** Bulk contributions the municipality charges — feed the DC engine's total in. */
  developmentCharges?: number;
  /** Serviced-erf exit: what it costs to service the land, excluding buildings. */
  servicingCostPerM2?: number;
}

export interface CapexBreakdown {
  buildingCost: number;
  buildingCostPerM2: number;
  escalatedBuildingCost: number;
  escalatedPerM2: number;
  professionalFees: number;
  developmentCosts: number;
  developmentCharges: number;
  landCost: number;
  financeCharges: number;
  vatOnCosts: number;
  inputTaxCredits: number;
  totalCapitalOutlayExclVat: number;
  grossIncome: number;
  incomeExclVat: number;
  profit: number;
  marginPct: number;
  roiPct: number;
  profitPerM2: number;
}

function requirePositive(n: unknown, name: string): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) {
    throw new CapexInputError(`${name} must be greater than zero`);
  }
  return v;
}

/**
 * Escalation, the way the source model does it: a straight run-up before the
 * contract starts, then a cash-flow-weighted run during it applied to half the
 * construction cost.
 */
function escalate(buildingCost: number): number {
  const pre = buildingCost * MODEL.escalationPerMonth * MODEL.preContractMonths;
  const during =
    (buildingCost / 2) *
    MODEL.escalationPerMonth *
    MODEL.contractMonths *
    MODEL.contractCashFlowFactor;
  return buildingCost + pre + during;
}

function months(rate: number, n: number) {
  return rate * (n / 12);
}

function build(input: CapexInput, landCost: number): CapexBreakdown {
  const defaults = PRODUCT_DEFAULTS[input.product];
  if (!defaults) throw new CapexInputError(`Unknown product "${input.product}"`);

  const area = requirePositive(input.sellableAreaM2, "Sellable area");
  // Validated but not used in the cascade — the whole appraisal is area-driven,
  // which is exactly why a unit count on its own cannot price a scheme. It is
  // carried for reporting and for the per-unit figures the report shows.
  requirePositive(input.units, "Number of units");
  const buildRate = input.buildRatePerM2 ?? defaults.buildRatePerM2;
  const sellRate = input.sellingRatePerM2 ?? defaults.sellingRatePerM2;
  const charges = Math.max(0, input.developmentCharges ?? 0);

  // 1. Building cost — the rate, plus everything built around the building,
  //    plus contingencies.
  const buildingCost =
    area * buildRate * (1 + MODEL.siteWorksPct) * (1 + MODEL.contingencies);

  // 2. Escalation.
  const escalated = escalate(buildingCost);

  // 3–4. Professional fees on the escalated cost.
  const professionalFees = escalated * MODEL.professionalFeesPct;

  // 5. Development costs, plus whatever the municipality charges in bulk
  //    contributions — which is where the DC engine's total lands.
  const developmentCosts = escalated * MODEL.developmentCostPct;

  const costsBeforeFinance =
    escalated + professionalFees + developmentCosts + charges + landCost;

  // 6. Finance, each component over its own period.
  const vatOnCosts = (escalated + professionalFees + developmentCosts) * MODEL.vat;
  const financeCharges =
    escalated * months(MODEL.financeRatePerYear, MODEL.financeMonthsBuilding) +
    (developmentCosts + landCost) *
      months(MODEL.financeRatePerYear, MODEL.financeMonthsDevelopment) +
    vatOnCosts * months(MODEL.financeRatePerYear, MODEL.financeMonthsVat);

  // 7. VAT on inputs is recoverable, so it is a cash-flow cost, not a real one.
  const inputTaxCredits = vatOnCosts;

  const totalCapitalOutlayExclVat = costsBeforeFinance + financeCharges;

  // 8. Income. Residential selling prices are quoted including VAT.
  const grossIncome = area * sellRate;
  const incomeExclVat = grossIncome / (1 + MODEL.vat);

  const profit = incomeExclVat - totalCapitalOutlayExclVat;

  return {
    buildingCost,
    buildingCostPerM2: buildingCost / area,
    escalatedBuildingCost: escalated,
    escalatedPerM2: escalated / area,
    professionalFees,
    developmentCosts,
    developmentCharges: charges,
    landCost,
    financeCharges,
    vatOnCosts,
    inputTaxCredits,
    totalCapitalOutlayExclVat,
    grossIncome,
    incomeExclVat,
    profit,
    marginPct: incomeExclVat > 0 ? profit / incomeExclVat : 0,
    roiPct:
      totalCapitalOutlayExclVat > 0 ? profit / totalCapitalOutlayExclVat : 0,
    profitPerM2: profit / area,
  };
}

/** Land cost in, profit out — what the source model does. */
export function appraise(input: CapexInput): CapexBreakdown {
  const landCost = Number(input.landCost ?? 0);
  if (!Number.isFinite(landCost) || landCost < 0) {
    throw new CapexInputError("Land cost must be zero or more");
  }
  return build(input, landCost);
}

export interface ResidualResult {
  /** What the land can carry at the target margin. */
  affordableLandCost: number;
  targetMarginPct: number;
  /** The appraisal at that land cost, so the workings can be shown. */
  breakdown: CapexBreakdown;
  /** Negative affordable land means the scheme does not work at any land price. */
  viable: boolean;
}

/**
 * Target margin in, affordable land cost out.
 *
 * Land cost enters the cascade twice — once directly and once through finance
 * charges on it — so it cannot simply be subtracted. Solved by bisection rather
 * than algebraically: the relationship is linear today, but the moment a
 * transfer-duty band or a stepped finance rate goes in it stops being, and a
 * closed-form solution would quietly become wrong instead of loudly failing.
 */
export function residualLandValue(
  input: CapexInput,
  targetMarginPct: number,
): ResidualResult {
  if (!Number.isFinite(targetMarginPct) || targetMarginPct <= 0 || targetMarginPct >= 1) {
    throw new CapexInputError("Target margin must be between 0 and 1");
  }

  const atZeroLand = build(input, 0);
  if (atZeroLand.marginPct <= targetMarginPct) {
    return {
      affordableLandCost: 0,
      targetMarginPct,
      breakdown: atZeroLand,
      viable: false,
    };
  }

  let low = 0;
  let high = atZeroLand.incomeExclVat;
  let best = atZeroLand;

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    best = build(input, mid);
    if (best.marginPct > targetMarginPct) low = mid;
    else high = mid;
  }

  const affordableLandCost = (low + high) / 2;
  return {
    affordableLandCost,
    targetMarginPct,
    breakdown: build(input, affordableLandCost),
    viable: true,
  };
}

/**
 * The serviced-erf exit, modelled beside the build-and-sell one.
 *
 * The source model runs both in parallel, and being able to answer "should I
 * build this out, or service it and sell serviced erven?" is the part most
 * feasibility tools skip entirely.
 */
export function servicedErfExit(
  netDevelopableM2: number,
  servicingCostPerM2: number,
  erfSellingRatePerM2: number,
) {
  const area = requirePositive(netDevelopableM2, "Net developable area");
  const servicing = area * Math.max(0, servicingCostPerM2);
  // Servicing is almost entirely civils, so the source model's 8% civil
  // engineer fee does apply to the whole of it here — unlike on a build, where
  // it applies only to the civils package.
  const withFees = servicing * 1.08;
  const withVat = withFees * (1 + MODEL.vat);
  const income = area * erfSellingRatePerM2;
  const incomeExclVat = income / (1 + MODEL.vat);
  const profit = incomeExclVat - withFees;
  return {
    servicingCost: servicing,
    servicingCostInclFees: withFees,
    servicingCostInclVat: withVat,
    grossIncome: income,
    incomeExclVat,
    profit,
    marginPct: incomeExclVat > 0 ? profit / incomeExclVat : 0,
    landSellingPricePerM2: erfSellingRatePerM2,
  };
}

/**
 * Phase 1 Town Housing from the source workbook, and what this engine makes of
 * it. Run by `scripts/verify-capex.mjs`.
 *
 * Kept in the engine rather than in a test file because the constants above are
 * only defensible while they still reproduce these figures — if someone
 * retunes a percentage, this is what tells them what they broke.
 */
export function verifyAgainstBenchmark() {
  const BENCHMARK = {
    label: "Oliphantskop Phase 1 Town Housing",
    areaM2: 3_828,
    units: 28,
    buildRatePerM2: 10_000,
    sellingRatePerM2: 24_000,
    expected: {
      buildingCost: 47_395_591,
      buildingCostPerM2: 12_381,
      escalatedBuildingCost: 50_380_000,
      incomeExclVat: 79_892_035,
      marginPct: 0.1764,
    },
  };

  const actual = build(
    {
      product: "town_housing",
      sellableAreaM2: BENCHMARK.areaM2,
      units: BENCHMARK.units,
      buildRatePerM2: BENCHMARK.buildRatePerM2,
      sellingRatePerM2: BENCHMARK.sellingRatePerM2,
    },
    0,
  );

  const checks = (
    [
      ["Building cost", BENCHMARK.expected.buildingCost, actual.buildingCost],
      ["Building cost per m²", BENCHMARK.expected.buildingCostPerM2, actual.buildingCostPerM2],
      ["Escalated building cost", BENCHMARK.expected.escalatedBuildingCost, actual.escalatedBuildingCost],
      ["Income excl VAT", BENCHMARK.expected.incomeExclVat, actual.incomeExclVat],
    ] as [string, number, number][]
  ).map(([name, expected, got]) => ({
    name,
    expected,
    got,
    deltaPct: expected === 0 ? 0 : (got - expected) / expected,
  }));

  return { label: BENCHMARK.label, checks, actual };
}

export function productOptions() {
  return (Object.keys(PRODUCT_DEFAULTS) as BuildProduct[]).map((value) => ({
    value,
    label: PRODUCT_DEFAULTS[value].label,
  }));
}
