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

  let body: Partial<QuickValuationInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (
    typeof body.grossHectares !== "number" ||
    typeof body.averageUnitPrice !== "number" ||
    typeof body.productType !== "string" ||
    typeof body.status !== "string"
  ) {
    return NextResponse.json(
      { error: "grossHectares, averageUnitPrice, productType and status are required" },
      { status: 400 },
    );
  }

  try {
    const result = calculateQuickValuation({
      grossHectares: body.grossHectares,
      averageUnitPrice: body.averageUnitPrice,
      productType: body.productType as ProductType,
      status: body.status as LandStatus,
      density: typeof body.density === "number" ? body.density : undefined,
      netRatio: typeof body.netRatio === "number" ? body.netRatio : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ValuationInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
