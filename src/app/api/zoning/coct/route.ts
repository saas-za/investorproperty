import { NextResponse } from "next/server";
import { bulkHeadroom, zoneOptions } from "@/lib/server/zoning-coct";

export const runtime = "nodejs";

/**
 * City of Cape Town zone limits. Unlike the valuation and DC engines, this is
 * public regulation text transcribed from the published scheme, not Morné's
 * own calibration — there is nothing to gate here, so unlike those two this
 * route can hand back the full table rather than one computed answer.
 */
export async function GET() {
  return NextResponse.json({ zones: zoneOptions() });
}

/**
 * How much of a zone's permitted bulk a proposed scheme actually uses.
 *
 *   POST { zoneCode, grossSiteM2, proposedFloorAreaM2, averageUnitSizeM2, proposedCoverageM2? }
 */
export async function POST(request: Request) {
  let body: {
    zoneCode?: string;
    grossSiteM2?: number;
    proposedFloorAreaM2?: number;
    averageUnitSizeM2?: number;
    proposedCoverageM2?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (
    typeof body.zoneCode !== "string" ||
    typeof body.grossSiteM2 !== "number" ||
    typeof body.proposedFloorAreaM2 !== "number" ||
    typeof body.averageUnitSizeM2 !== "number"
  ) {
    return NextResponse.json(
      { error: "zoneCode, grossSiteM2, proposedFloorAreaM2 and averageUnitSizeM2 are required" },
      { status: 400 },
    );
  }

  const result = bulkHeadroom(
    body.zoneCode,
    body.grossSiteM2,
    body.proposedFloorAreaM2,
    body.averageUnitSizeM2,
    body.proposedCoverageM2,
  );

  if (!result) {
    return NextResponse.json({ error: `Unknown zone code "${body.zoneCode}"` }, { status: 400 });
  }
  return NextResponse.json(result);
}
