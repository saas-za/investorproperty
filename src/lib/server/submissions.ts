import "server-only";
import type { QuickValuationInput, QuickValuationResult } from "./valuation-engine";
import { supabaseAdmin } from "./supabase";

export interface SubmissionContext {
  party?: "developer" | "seller";
  municipality?: string;
  registrationDivision?: string;
  sellerExpectation?: number;
  expectationBasis?: string;
}

/**
 * Records one calculation for Morné's own market research — see the comment
 * at the top of `supabase/schema.sql` for exactly what is and isn't
 * captured, and why.
 *
 * Deliberately fire-and-forget from the route's point of view: this is
 * analytics, not the product. A person waiting on their land estimate should
 * never see it fail, or even slow down, because a research database happened
 * to be unreachable. Every failure is swallowed here, after being logged.
 */
export async function recordSubmission(
  input: QuickValuationInput,
  result: QuickValuationResult,
  context: SubmissionContext,
): Promise<void> {
  const db = supabaseAdmin();
  // Not configured — a normal, expected state before Supabase is wired up,
  // not an error.
  if (!db) return;

  try {
    const { error } = await db.from("estimate_submissions").insert({
      party: context.party,
      municipality: context.municipality,
      registration_division: context.registrationDivision,

      gross_hectares: result.grossHectares,
      net_hectares: result.netHectares,
      net_ratio: result.netRatioUsed,
      net_ratio_was_defaulted: result.netRatioWasDefaulted,

      product_type: input.productType,
      basis: result.basisUsed,
      density_used: result.densityUsed,
      floor_factor: result.bulk?.floorFactor,
      average_unit_size_m2: result.bulk?.averageUnitSizeM2,
      coverage: result.bulk?.coverage,

      status: input.status,
      average_unit_price: input.averageUnitPrice,
      opportunities: result.opportunities,
      land_value: result.landValue,

      seller_expectation: context.sellerExpectation,
      expectation_basis: context.expectationBasis,
    });
    if (error) console.error("[submissions] insert failed:", error.message);
  } catch (e) {
    console.error("[submissions] insert threw:", e instanceof Error ? e.message : e);
  }
}
