import { NextResponse } from "next/server";
import {
  appraise,
  CapexInputError,
  productOptions,
  residualLandValue,
  servicedErfExit,
  type BuildProduct,
  type CapexInput,
} from "@/lib/server/capex-engine";
import { callerKey, rateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/** Labels only. The build rates and the cost cascade stay on this side. */
export async function GET() {
  return NextResponse.json({ products: productOptions() });
}

export async function POST(request: Request) {
  if (rateLimited("capex", callerKey(request), 30)) {
    return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
  }

  let body: Partial<CapexInput> & {
    /** "appraise" takes a land cost; "residual" solves for one. */
    mode?: "appraise" | "residual";
    targetMarginPct?: number;
    /** Optional second exit: service the land and sell erven instead. */
    servicedErf?: { netDevelopableM2: number; erfSellingRatePerM2: number };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (typeof body.product !== "string") {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const input: CapexInput = {
    product: body.product as BuildProduct,
    sellableAreaM2: Number(body.sellableAreaM2),
    units: Number(body.units),
    buildRatePerM2:
      typeof body.buildRatePerM2 === "number" ? body.buildRatePerM2 : undefined,
    sellingRatePerM2:
      typeof body.sellingRatePerM2 === "number" ? body.sellingRatePerM2 : undefined,
    landCost: typeof body.landCost === "number" ? body.landCost : undefined,
    developmentCharges:
      typeof body.developmentCharges === "number" ? body.developmentCharges : undefined,
  };

  try {
    const result =
      body.mode === "residual"
        ? residualLandValue(input, Number(body.targetMarginPct ?? 0.18))
        : { appraisal: appraise(input) };

    const servicedErf =
      body.servicedErf && typeof body.servicedErf.netDevelopableM2 === "number"
        ? servicedErfExit(
            body.servicedErf.netDevelopableM2,
            // Servicing cost is not something a desktop estimate can guess —
            // it comes off the engineer's estimate. Defaulted to the source
            // model's rate and labelled as such wherever it is shown.
            body.servicingCostPerM2 ?? 850,
            body.servicedErf.erfSellingRatePerM2,
          )
        : undefined;

    return NextResponse.json({ ...result, servicedErf });
  } catch (e) {
    if (e instanceof CapexInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}
