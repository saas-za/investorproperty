import { NextResponse } from "next/server";
import {
  calculateQuickValuation,
  productOptions,
  statusOptions,
  ValuationInputError,
  type LandStatus,
  type ProductType,
  type QuickValuationInput,
} from "@/lib/server/valuation-engine";
import { recordSubmission } from "@/lib/server/submissions";

export const runtime = "nodejs";

/**
 * GET returns only labels for the dropdowns — never the density defaults or
 * status percentages in bulk. A client-side <select> needs "Apartments —
 * standard" as text; it does not need every product's density default
 * sitting in one JSON payload where it can be read without running a single
 * calculation.
 */
export async function GET() {
  return NextResponse.json({
    products: productOptions(),
    statuses: statusOptions(),
  });
}

/**
 * Extremely small in-memory limiter — this is a single-instance Node
 * process, not a fleet, so a Map is enough to blunt casual scripted probing
 * of the twenty product×status combinations without adding infrastructure.
 * Replace with a real store (Upstash/Redis) once this runs on more than one
 * instance, since the map does not survive a restart or scale-out.
 */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
  }

  let body: Partial<QuickValuationInput> & {
    party?: string;
    municipality?: string;
    registrationDivision?: string;
    sellerExpectation?: number;
    expectationBasis?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const hasAbsoluteSplit =
    typeof body.developableHectares === "number" && typeof body.nonDevelopableHectares === "number";

  if (!hasAbsoluteSplit && typeof body.grossHectares !== "number") {
    return NextResponse.json(
      { error: "Supply grossHectares, or both developableHectares and nonDevelopableHectares" },
      { status: 400 },
    );
  }
  if (typeof body.productType !== "string" || typeof body.status !== "string") {
    return NextResponse.json({ error: "productType and status are required" }, { status: 400 });
  }
  if (body.productType === "basket_of_rights") {
    if (!Array.isArray(body.basket) || body.basket.length === 0) {
      return NextResponse.json(
        { error: "basket_of_rights requires at least one row in basket" },
        { status: 400 },
      );
    }
  } else if (typeof body.averageUnitPrice !== "number") {
    return NextResponse.json(
      { error: "averageUnitPrice is required unless productType is basket_of_rights" },
      { status: 400 },
    );
  }

  if (
    body.basis === "bulk" &&
    (typeof body.floorFactor !== "number" || typeof body.averageUnitSizeM2 !== "number")
  ) {
    return NextResponse.json(
      { error: "The bulk basis needs both a floor factor and an average unit size" },
      { status: 400 },
    );
  }

  try {
    const input: QuickValuationInput = {
      grossHectares: typeof body.grossHectares === "number" ? body.grossHectares : undefined,
      developableHectares: hasAbsoluteSplit ? body.developableHectares : undefined,
      nonDevelopableHectares: hasAbsoluteSplit ? body.nonDevelopableHectares : undefined,
      averageUnitPrice: typeof body.averageUnitPrice === "number" ? body.averageUnitPrice : undefined,
      basket: Array.isArray(body.basket) ? body.basket : undefined,
      productType: body.productType as ProductType,
      status: body.status as LandStatus,
      density: typeof body.density === "number" ? body.density : undefined,
      netRatio: typeof body.netRatio === "number" ? body.netRatio : undefined,
      basis: body.basis === "bulk" ? "bulk" : "density",
      floorFactor: typeof body.floorFactor === "number" ? body.floorFactor : undefined,
      averageUnitSizeM2:
        typeof body.averageUnitSizeM2 === "number" ? body.averageUnitSizeM2 : undefined,
      coverage: typeof body.coverage === "number" ? body.coverage : undefined,
      approvedOpportunities:
        typeof body.approvedOpportunities === "number" ? body.approvedOpportunities : undefined,
    };
    const result = calculateQuickValuation(input);

    // Fire-and-forget — see submissions.ts for what this does and doesn't
    // capture. Never awaited into the response: a slow or unreachable
    // research database must never be the reason someone waits longer for
    // their estimate, or sees it fail.
    void recordSubmission(input, result, {
      party: body.party === "seller" || body.party === "developer" ? body.party : undefined,
      municipality: typeof body.municipality === "string" ? body.municipality : undefined,
      registrationDivision:
        typeof body.registrationDivision === "string" ? body.registrationDivision : undefined,
      sellerExpectation:
        typeof body.sellerExpectation === "number" ? body.sellerExpectation : undefined,
      expectationBasis:
        typeof body.expectationBasis === "string" ? body.expectationBasis : undefined,
    });

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ValuationInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
