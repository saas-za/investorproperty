import { NextResponse } from "next/server";
import {
  calculateDevelopmentCharges,
  DcInputError,
  DEFAULT_RATE_YEAR,
  landUseOptions,
  rateYearOptions,
  typologyComparison,
  type DcLine,
  type MunicipalityCode,
} from "@/lib/server/dc-engine";
import { callerKey, rateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * GET returns dropdown labels only — never the charge table. The demand
 * factors came out of a spreadsheet nobody else has read; handing the whole
 * table over in one payload gives that away without a single calculation
 * being run. Same rule as the valuation engine's dropdowns.
 */
export async function GET(request: Request) {
  const municipality = (new URL(request.url).searchParams.get("municipality") ??
    "CPT") as MunicipalityCode;
  return NextResponse.json({
    landUses: landUseOptions(municipality),
    rateYears: rateYearOptions(),
    defaultRateYear: DEFAULT_RATE_YEAR,
  });
}

export async function POST(request: Request) {
  if (rateLimited("dc", callerKey(request), 30)) {
    return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
  }

  let body: {
    municipality?: string;
    lines?: DcLine[];
    pt2?: boolean;
    rateYear?: string;
    linkServices?: number;
    /** When set, the response also carries the typology comparison. */
    compareTypologiesForUnits?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  try {
    const result = calculateDevelopmentCharges({
      municipality: (body.municipality ?? "CPT") as MunicipalityCode,
      lines: body.lines ?? [],
      pt2: body.pt2,
      rateYear: body.rateYear,
      linkServices: body.linkServices,
    });

    const units = Number(body.compareTypologiesForUnits);
    const comparison =
      Number.isFinite(units) && units > 0
        ? typologyComparison(units, Boolean(body.pt2), result.rateYear)
        : undefined;

    return NextResponse.json({ ...result, comparison });
  } catch (e) {
    if (e instanceof DcInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
