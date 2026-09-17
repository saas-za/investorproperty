import "server-only";

/**
 * Floor factor and coverage limits from the City of Cape Town Zoning Scheme
 * Regulations, read directly from the published document rather than recalled.
 *
 * This settles a question worth recording: floor factor is **not** a
 * commercial-and-industrial idea. The scheme sets a floor factor for Single
 * Residential Zone 1, for every General Residential subzone GR2–GR6, and for
 * every General Business subzone GB1–GB7. The regulations are explicit that
 * "floor factor is determined in accordance with the area of the land unit" —
 * the whole land unit, which is why the estimate applies it to gross site area
 * and not to the net developable portion.
 *
 * Cape Town only, and deliberately so. Every municipality writes its own
 * scheme, and the same code means different things in each — GR3 in Cape Town
 * is not GR3 elsewhere. Nothing here should be shown for a site outside the
 * City without its own scheme being read first.
 */

export interface ZoneLimits {
  code: string;
  label: string;
  /** Maximum floor factor on the land unit. */
  floorFactor: number;
  /** Maximum coverage as a fraction, where the scheme sets one. */
  coverage?: number;
  /** Maximum height above base level to top of roof, in metres. */
  maxHeightM: number;
  family: "General Residential" | "General Business";
}

/**
 * Table of coverage, height and floor factor in General Residential Subzones
 * GR2–GR6. The scheme's own words: GR2 accommodates flats of relatively low
 * height and floor space, GR3 and GR4 cater for medium, GR5 and GR6 for
 * high-rise.
 */
const GENERAL_RESIDENTIAL: ZoneLimits[] = [
  { code: "GR2", label: "General Residential 2", floorFactor: 1.0, coverage: 0.6, maxHeightM: 15, family: "General Residential" },
  { code: "GR3", label: "General Residential 3", floorFactor: 1.0, coverage: 0.6, maxHeightM: 20, family: "General Residential" },
  { code: "GR4", label: "General Residential 4", floorFactor: 1.5, coverage: 0.6, maxHeightM: 24, family: "General Residential" },
  { code: "GR5", label: "General Residential 5", floorFactor: 2.5, coverage: 0.6, maxHeightM: 35, family: "General Residential" },
  { code: "GR6", label: "General Residential 6", floorFactor: 5.0, coverage: 0.6, maxHeightM: 50, family: "General Residential" },
];

/** Table of height and floor factor in General Business Zones. No coverage limit is set. */
const GENERAL_BUSINESS: ZoneLimits[] = [
  { code: "GB1", label: "General Business 1", floorFactor: 1.5, maxHeightM: 15, family: "General Business" },
  { code: "GB2", label: "General Business 2", floorFactor: 2.0, maxHeightM: 15, family: "General Business" },
  { code: "GB3", label: "General Business 3", floorFactor: 2.0, maxHeightM: 25, family: "General Business" },
  { code: "GB4", label: "General Business 4", floorFactor: 3.0, maxHeightM: 25, family: "General Business" },
  { code: "GB5", label: "General Business 5", floorFactor: 4.0, maxHeightM: 25, family: "General Business" },
  { code: "GB6", label: "General Business 6", floorFactor: 6.0, maxHeightM: 38, family: "General Business" },
  { code: "GB7", label: "General Business 7", floorFactor: 12.0, maxHeightM: 60, family: "General Business" },
];

const ALL = [...GENERAL_RESIDENTIAL, ...GENERAL_BUSINESS];

export function zoneOptions() {
  return ALL.map((z) => ({
    value: z.code,
    label: `${z.code} — ${z.label}`,
    family: z.family,
  }));
}

export function zoneLimits(code: string): ZoneLimits | undefined {
  return ALL.find((z) => z.code.toUpperCase() === code.toUpperCase());
}

export interface BulkHeadroom {
  zone: ZoneLimits;
  permittedFloorAreaM2: number;
  proposedFloorAreaM2: number;
  unusedFloorAreaM2: number;
  /** Share of the permitted bulk the scheme actually uses, 0–1. */
  utilisation: number;
  /** Extra opportunities the unused bulk would carry at the same unit size. */
  additionalOpportunities: number;
  coverageWithinLimit?: boolean;
  overBulk: boolean;
}

/**
 * How much of the permitted bulk a proposed scheme actually uses.
 *
 * This is the question a seller should be asking and usually is not: an
 * architect's scheme is frequently well under what the zoning already allows,
 * and unused bulk is value the seller is giving away without knowing it.
 * Equally, a scheme *over* the permitted factor is not a bonus — it needs a
 * departure, and a departure is planning risk with a timeline attached.
 */
export function bulkHeadroom(
  zoneCode: string,
  grossSiteM2: number,
  proposedFloorAreaM2: number,
  averageUnitSizeM2: number,
  proposedCoverageM2?: number,
): BulkHeadroom | null {
  const zone = zoneLimits(zoneCode);
  if (!zone || grossSiteM2 <= 0) return null;

  const permittedFloorAreaM2 = zone.floorFactor * grossSiteM2;
  const unused = permittedFloorAreaM2 - proposedFloorAreaM2;

  return {
    zone,
    permittedFloorAreaM2,
    proposedFloorAreaM2,
    unusedFloorAreaM2: unused,
    utilisation: permittedFloorAreaM2 > 0 ? proposedFloorAreaM2 / permittedFloorAreaM2 : 0,
    additionalOpportunities:
      averageUnitSizeM2 > 0 ? Math.max(0, unused) / averageUnitSizeM2 : 0,
    coverageWithinLimit:
      zone.coverage !== undefined && proposedCoverageM2 !== undefined
        ? proposedCoverageM2 / grossSiteM2 <= zone.coverage
        : undefined,
    overBulk: unused < 0,
  };
}
