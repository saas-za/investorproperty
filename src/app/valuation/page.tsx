"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import NumberInput from "@/components/NumberInput";
import { portal } from "@/config/platform";

interface Option {
  value: string;
  label: string;
}

interface BasketRow {
  unitType: string;
  opportunities: string;
  pricePerOpportunity: string;
}

interface BasketBreakdownRow {
  unitType: string;
  opportunities: number;
  pricePerOpportunity: number;
  grossRealisation: number;
}

interface QuickResult {
  grossHectares: number;
  netHectares: number;
  nonDevelopableHectares: number;
  netRatioUsed: number;
  netRatioWasDefaulted: boolean;
  areaSplitMode: "ratio" | "absolute";
  densityUsed: number;
  effectiveDensityPerGrossHectare: number;
  statusPctUsed: number;
  opportunities: number;
  landValue: number;
  valuePerHectare: number;
  valuePerOpportunity: number;
  basketBreakdown?: BasketBreakdownRow[];
}

/** Money, counts, densities — always thousands-separated, never decimals. */
const fmt = (n: number) => Math.round(n).toLocaleString("en-ZA");
const rand = (n: number) => `R${fmt(n)}`;
/** Areas keep decimal precision — a hectare figure is a measurement, not a count. */
const fmtHa = (n: number) => n.toLocaleString("en-ZA", { maximumFractionDigits: 2 });

const HA_TO_M2 = 10_000;
const PCT_EPSILON = 0.5;

const emptyBasketRow = (): BasketRow => ({ unitType: "", opportunities: "", pricePerOpportunity: "" });

export default function ValuationPage() {
  const [products, setProducts] = useState<Option[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);

  // Gross area — m² and ha kept in sync, either can be typed.
  const [areaM2, setAreaM2] = useState("10000");
  const [areaHa, setAreaHa] = useState("1");

  const [productType, setProductType] = useState("");
  const [status, setStatus] = useState("");
  const [unitPrice, setUnitPrice] = useState("1000000");
  const [densityOverride, setDensityOverride] = useState("");

  const [basket, setBasket] = useState<BasketRow[]>([emptyBasketRow()]);

  // Net developable area: a % pair, or a typed absolute-area pair. Both pairs
  // auto-balance to the total the first time the second field is empty, then
  // leave the user free to override — which is what the mismatch check below
  // is there to catch.
  const [splitMode, setSplitMode] = useState<"ratio" | "absolute">("ratio");
  const [developablePct, setDevelopablePct] = useState("");
  const [nonDevelopablePct, setNonDevelopablePct] = useState("");
  const [splitUnit, setSplitUnit] = useState<"ha" | "m2">("m2");
  const [developableArea, setDevelopableArea] = useState("");
  const [nonDevelopableArea, setNonDevelopableArea] = useState("");

  // Optional second scenario: what an architect/developer assumes is
  // achievable, compared against the primary (approved/documented) figures.
  const [compareAssumption, setCompareAssumption] = useState(false);
  const [assumedProductType, setAssumedProductType] = useState("");
  const [assumedDensityOverride, setAssumedDensityOverride] = useState("");
  const [assumedUnitPrice, setAssumedUnitPrice] = useState("");

  const [result, setResult] = useState<QuickResult | null>(null);
  const [assumedResult, setAssumedResult] = useState<QuickResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isBasket = productType === "basket_of_rights";

  useEffect(() => {
    fetch("/api/valuation/quick")
      .then((r) => r.json())
      .then((data: { products: Option[]; statuses: Option[] }) => {
        setProducts(data.products);
        setStatuses(data.statuses);
        const defaultProduct = data.products[2]?.value ?? data.products[0]?.value ?? "";
        setProductType(defaultProduct);
        setAssumedProductType(defaultProduct);
        setStatus(data.statuses[0]?.value ?? "");
      })
      .catch(() => setError("Could not load the form — refresh and try again"));
  }, []);

  function onAreaM2Change(v: string) {
    setAreaM2(v);
    const n = Number(v);
    if (v !== "" && Number.isFinite(n)) setAreaHa((n / HA_TO_M2).toString());
  }
  function onAreaHaChange(v: string) {
    setAreaHa(v);
    const n = Number(v);
    if (v !== "" && Number.isFinite(n)) setAreaM2((n * HA_TO_M2).toString());
  }

  // Percentage pair — auto-fills the other only while it's still blank.
  function onDevelopablePctChange(v: string) {
    setDevelopablePct(v);
    if (nonDevelopablePct === "" && v !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) setNonDevelopablePct(String(Math.max(0, Math.round((100 - n) * 10) / 10)));
    }
  }
  function onNonDevelopablePctChange(v: string) {
    setNonDevelopablePct(v);
    if (developablePct === "" && v !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) setDevelopablePct(String(Math.max(0, Math.round((100 - n) * 10) / 10)));
    }
  }
  const pctMismatch =
    splitMode === "ratio" &&
    developablePct !== "" &&
    nonDevelopablePct !== "" &&
    Math.abs(Number(developablePct) + Number(nonDevelopablePct) - 100) > PCT_EPSILON;

  // Absolute-area pair — auto-fills the other against the top gross-area
  // total (converted into whichever unit the split is being entered in),
  // only while that other field is still blank.
  function totalInSplitUnit() {
    const ha = Number(areaHa);
    if (!Number.isFinite(ha)) return NaN;
    return splitUnit === "ha" ? ha : ha * HA_TO_M2;
  }
  function onDevelopableAreaChange(v: string) {
    setDevelopableArea(v);
    if (nonDevelopableArea === "" && v !== "") {
      const total = totalInSplitUnit();
      const n = Number(v);
      if (Number.isFinite(total) && Number.isFinite(n)) {
        setNonDevelopableArea(String(Math.max(0, Math.round((total - n) * 100) / 100)));
      }
    }
  }
  function onNonDevelopableAreaChange(v: string) {
    setNonDevelopableArea(v);
    if (developableArea === "" && v !== "") {
      const total = totalInSplitUnit();
      const n = Number(v);
      if (Number.isFinite(total) && Number.isFinite(n)) {
        setDevelopableArea(String(Math.max(0, Math.round((total - n) * 100) / 100)));
      }
    }
  }
  const areaSplitTolerance = splitUnit === "ha" ? 0.01 : 1;
  const areaMismatch =
    splitMode === "absolute" &&
    developableArea !== "" &&
    nonDevelopableArea !== "" &&
    Number.isFinite(totalInSplitUnit()) &&
    Math.abs(Number(developableArea) + Number(nonDevelopableArea) - totalInSplitUnit()) > areaSplitTolerance;

  function updateBasketRow(i: number, patch: Partial<BasketRow>) {
    setBasket((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addBasketRow() {
    setBasket((prev) => [...prev, emptyBasketRow()]);
  }
  function removeBasketRow(i: number) {
    setBasket((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function baseBody(): Record<string, unknown> {
    const body: Record<string, unknown> = { status };
    if (splitMode === "absolute" && developableArea && nonDevelopableArea) {
      const toHa = (v: string) => (splitUnit === "ha" ? Number(v) : Number(v) / HA_TO_M2);
      body.developableHectares = toHa(developableArea);
      body.nonDevelopableHectares = toHa(nonDevelopableArea);
    } else {
      body.grossHectares = Number(areaHa);
      if (developablePct) body.netRatio = Number(developablePct) / 100;
    }
    return body;
  }

  async function runCalc(body: Record<string, unknown>): Promise<QuickResult> {
    const res = await fetch("/api/valuation/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Something went wrong");
    return data as QuickResult;
  }

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setAssumedResult(null);

    try {
      const approvedBody: Record<string, unknown> = { ...baseBody(), productType };
      if (isBasket) {
        approvedBody.basket = basket
          .filter((r) => r.unitType && r.opportunities && r.pricePerOpportunity)
          .map((r) => ({
            unitType: r.unitType,
            opportunities: Number(r.opportunities),
            pricePerOpportunity: Number(r.pricePerOpportunity),
          }));
      } else {
        approvedBody.averageUnitPrice = Number(unitPrice);
        if (densityOverride) approvedBody.density = Number(densityOverride);
      }

      const approved = await runCalc(approvedBody);
      setResult(approved);

      if (compareAssumption && !isBasket) {
        const assumedBody: Record<string, unknown> = {
          ...baseBody(),
          productType: assumedProductType,
          averageUnitPrice: Number(assumedUnitPrice || unitPrice),
        };
        if (assumedDensityOverride) assumedBody.density = Number(assumedDensityOverride);
        const assumed = await runCalc(assumedBody);
        setAssumedResult(assumed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the calculator");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 bg-shell">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Title left, logo right — two columns, no subtitle. */}
        <div className="no-print flex items-center justify-between gap-6">
          <div>
            <Link href="/" className="text-xs uppercase tracking-[0.2em] text-gold-deep">
              {portal.name}
            </Link>
            <h1 className="mt-1 text-xl font-normal text-navy sm:text-2xl">
              Desktop Land Estimate
            </h1>
          </div>
          <Image
            src="/logo.png"
            alt="Investor Property"
            width={200}
            height={200}
            className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
          />
        </div>

        <form onSubmit={calculate} className="no-print mt-8 space-y-6 rounded-lg border border-navy/10 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Gross site area
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <div>
                <NumberInput
                  decimals={0} required
                  value={areaM2}
                  onChange={onAreaM2Change}
                  invalid={areaMismatch}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">m²</span>
              </div>
              <div>
                <NumberInput
                  decimals={2} required
                  value={areaHa}
                  onChange={onAreaHaChange}
                  invalid={areaMismatch}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">hectares</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                What can be built there?
                {compareAssumption && !isBasket ? " — approved / documented rights" : ""}
              </label>
            </div>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
            >
              {products.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {!isBasket && (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-xs text-navy/50">
                  Override the density assumption
                </summary>
                <NumberInput
                  decimals={0}
                  placeholder="units per net hectare — leave blank to use our default"
                  value={densityOverride}
                  onChange={setDensityOverride}
                  className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
              </details>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Status of the opportunity
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {isBasket ? (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Basket of rights
              </label>
              <p className="mt-1 text-xs text-navy/50">
                One row per unit type. Price per opportunity is the average selling price for
                that type — the same figure the single-product field asks for, just broken down.
              </p>
              <div className="mt-2 overflow-hidden rounded border border-navy/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy/5 text-left text-[11px] uppercase tracking-wide text-navy/50">
                      <th className="px-2 py-2 font-medium">Unit type</th>
                      <th className="px-2 py-2 font-medium">Opportunities</th>
                      <th className="px-2 py-2 font-medium">Price per Opportunity</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {basket.map((row, i) => (
                      <tr key={i} className="border-t border-navy/10">
                        <td className="p-1">
                          <input
                            value={row.unitType}
                            onChange={(e) => updateBasketRow(i, { unitType: e.target.value })}
                            placeholder="e.g. 2-bed apartment"
                            className="w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="p-1">
                          <NumberInput
                            decimals={0}
                            value={row.opportunities}
                            onChange={(v) => updateBasketRow(i, { opportunities: v })}
                            className="w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="p-1">
                          <NumberInput
                            decimals={0}
                            value={row.pricePerOpportunity}
                            onChange={(v) => updateBasketRow(i, { pricePerOpportunity: v })}
                            className="w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeBasketRow(i)}
                            className="text-navy/30 hover:text-red-500"
                            aria-label="Remove row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addBasketRow}
                className="mt-2 text-xs text-gold-deep underline underline-offset-2"
              >
                + Add unit type
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Average selling price per unit (ZAR)
              </label>
              <NumberInput
                decimals={0} required
                value={unitPrice}
                onChange={setUnitPrice}
                className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Net developable area — not all of the site is sellable
            </label>
            <div className="mt-2 flex gap-1 rounded-md bg-navy/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSplitMode("ratio")}
                className={`flex-1 rounded px-2 py-1.5 transition ${splitMode === "ratio" ? "bg-white shadow-sm font-medium text-navy" : "text-navy/50"}`}
              >
                Enter as %
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("absolute")}
                className={`flex-1 rounded px-2 py-1.5 transition ${splitMode === "absolute" ? "bg-white shadow-sm font-medium text-navy" : "text-navy/50"}`}
              >
                Enter as areas
              </button>
            </div>

            {splitMode === "ratio" ? (
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <NumberInput
                      decimals={1}
                      placeholder="e.g. 44"
                      value={developablePct}
                      onChange={onDevelopablePctChange}
                      invalid={pctMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">Developable %</span>
                  </div>
                  <div>
                    <NumberInput
                      decimals={1}
                      placeholder="e.g. 56"
                      value={nonDevelopablePct}
                      onChange={onNonDevelopablePctChange}
                      invalid={pctMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">Non-developable %</span>
                  </div>
                </div>
                {pctMismatch && (
                  <p className="mt-1.5 text-xs text-red-600">
                    These don&apos;t add up to 100% — check the split.
                  </p>
                )}
                <p className="mt-1.5 text-xs leading-relaxed text-navy/50">
                  Type one and the other fills in automatically. Leave both blank for a
                  conservative 60% default. Roads, communal areas and services typically consume
                  30–40% of a site.
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSplitUnit("m2")}
                    className={`rounded px-2 py-1 ${splitUnit === "m2" ? "bg-navy text-shell" : "bg-navy/5 text-navy/60"}`}
                  >
                    m²
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitUnit("ha")}
                    className={`rounded px-2 py-1 ${splitUnit === "ha" ? "bg-navy text-shell" : "bg-navy/5 text-navy/60"}`}
                  >
                    ha
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <NumberInput
                      decimals={splitUnit === "ha" ? 2 : 0}
                      placeholder={splitUnit === "ha" ? "e.g. 0.44" : "e.g. 4400"}
                      value={developableArea}
                      onChange={onDevelopableAreaChange}
                      invalid={areaMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">Developable</span>
                  </div>
                  <div>
                    <NumberInput
                      decimals={splitUnit === "ha" ? 2 : 0}
                      placeholder={splitUnit === "ha" ? "e.g. 0.56" : "e.g. 5600"}
                      value={nonDevelopableArea}
                      onChange={onNonDevelopableAreaChange}
                      invalid={areaMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">
                      Non-developable (nature reserve, roads, servitudes…)
                    </span>
                  </div>
                </div>
                {areaMismatch && (
                  <p className="text-xs text-red-600">
                    Developable + non-developable ({fmt(Number(developableArea) + Number(nonDevelopableArea))}
                    {splitUnit === "ha" ? " ha" : " m²"}) doesn&apos;t match the gross site area
                    above ({fmt(totalInSplitUnit())}{splitUnit === "ha" ? " ha" : " m²"}) — check
                    both.
                  </p>
                )}
                <p className="text-xs leading-relaxed text-navy/50">
                  Type one and the other fills in against the gross area above.
                </p>
              </div>
            )}
          </div>

          {!isBasket && (
            <div className="rounded border border-navy/10 bg-navy/[0.02] p-4">
              <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-navy/70">
                <input
                  type="checkbox"
                  checked={compareAssumption}
                  onChange={(e) => setCompareAssumption(e.target.checked)}
                  className="mt-0.5"
                />
                Compare against an unverified assumption (e.g. from an architect, before
                town-planning or traffic-impact review)
              </label>

              {compareAssumption && (
                <div className="mt-4 space-y-4 border-t border-navy/10 pt-4">
                  <p className="text-xs leading-relaxed text-navy/50">
                    This is where sellers get misled — an architect quotes the maximum a site
                    could theoretically hold, without checking with the town planner or
                    considering traffic impact. Enter that assumption here to see the gap.
                  </p>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                      Developer&apos;s / architect&apos;s assumption
                    </label>
                    <select
                      value={assumedProductType}
                      onChange={(e) => setAssumedProductType(e.target.value)}
                      className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    >
                      {products.filter((p) => p.value !== "basket_of_rights").map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs text-navy/50">
                        Override the density assumption
                      </summary>
                      <NumberInput
                        decimals={0}
                        placeholder="units per net hectare"
                        value={assumedDensityOverride}
                        onChange={setAssumedDensityOverride}
                        className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                      />
                    </details>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                      Assumed selling price per unit (ZAR)
                    </label>
                    <NumberInput
                      decimals={0}
                      placeholder={`leave blank to reuse R${fmt(Number(unitPrice) || 0)}`}
                      value={assumedUnitPrice}
                      onChange={setAssumedUnitPrice}
                      className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !productType || !status}
            className="w-full rounded-sm bg-navy px-6 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate land estimate"}
          </button>
        </form>

        {error && (
          <div className="no-print mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <>
            <div className="mt-8 flex justify-end gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="rounded-sm border border-navy/20 px-4 py-2 text-xs font-medium text-navy hover:bg-navy/5"
              >
                Download / print report (PDF)
              </button>
            </div>
            <Report
              result={result}
              productLabel={products.find((p) => p.value === productType)?.label ?? ""}
              statusLabel={statuses.find((s) => s.value === status)?.label ?? ""}
              assumedResult={assumedResult}
              assumedProductLabel={products.find((p) => p.value === assumedProductType)?.label ?? ""}
            />
          </>
        )}

        <p className="no-print mt-8 text-xs leading-relaxed text-navy/40">
          This is an estimate, not a valuation — only a registered professional valuer may
          provide a valuation. It is a starting point for discussion between buyer and seller,
          not a substitute for a full feasibility study, a survey, or professional advice.
          Assumptions are calibrated defaults and will not match every site.
        </p>

        <div className="no-print mt-10 flex justify-center pb-4">
          <a
            href="https://serviceai.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-navy/40 transition hover:text-navy/60"
          >
            powered by <span className="font-medium text-gold-deep">Propello</span>
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * The presentable report — full workings, logo, meant to be printed or
 * screen-shared with a seller. Deliberately shows the density and status
 * factor actually used: a report built to convince a seller has to show its
 * work, and both figures are already recoverable from the visible inputs and
 * result by simple division, so withholding them would cost trust for
 * nothing. See the memory note on IP gating for the reasoning in full.
 */
function Report({
  result,
  productLabel,
  statusLabel,
  assumedResult,
  assumedProductLabel,
}: {
  result: QuickResult;
  productLabel: string;
  statusLabel: string;
  assumedResult: QuickResult | null;
  assumedProductLabel: string;
}) {
  const today = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
  const gapValue = assumedResult ? assumedResult.landValue - result.landValue : 0;
  const gapPct = assumedResult && result.landValue > 0 ? (gapValue / result.landValue) * 100 : 0;

  return (
    <div className="print-sheet mt-8 overflow-hidden rounded-lg border border-navy/10 bg-white shadow-sm">
      <div className="print-pad p-6">
        <div className="flex items-center justify-between border-b border-navy/10 pb-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Investor Property" width={200} height={200} className="h-14 w-14 object-contain" />
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-navy">Investor Property</div>
              <div className="text-xs text-navy/50">Desktop Land Estimate</div>
            </div>
          </div>
          <div className="text-right text-xs text-navy/50">{today}</div>
        </div>
        <div className="mt-4 h-1 rule-gold" />

        {assumedResult ? (
          <>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-gold-deep">
              Approved vs. assumed — the gap that misleads sellers
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="rounded border border-navy/10 p-4">
                <p className="text-[11px] uppercase tracking-wide text-navy/40">Approved / documented</p>
                <p className="mt-1 text-2xl font-light text-navy">{rand(result.landValue)}</p>
                <p className="mt-1 text-xs text-navy/50">{productLabel}</p>
                <p className="text-xs text-navy/50">{fmt(result.opportunities)} opportunities</p>
              </div>
              <div className="rounded border border-amber-300 bg-amber-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-amber-700">Architect&apos;s / developer&apos;s assumption</p>
                <p className="mt-1 text-2xl font-light text-amber-800">{rand(assumedResult.landValue)}</p>
                <p className="mt-1 text-xs text-amber-700/70">{assumedProductLabel}</p>
                <p className="text-xs text-amber-700/70">{fmt(assumedResult.opportunities)} opportunities</p>
              </div>
            </div>
            <div className="mt-3 rounded bg-red-50 px-4 py-3 text-sm text-red-800">
              Gap: <strong>{rand(Math.abs(gapValue))}</strong> ({gapPct >= 0 ? "+" : ""}{gapPct.toFixed(0)}%)
              {gapValue > 0
                ? " — the assumption is worth more than what's approved. Unverified, this is exactly the number a seller fixates on."
                : " — the assumption is worth less than what's approved."}
              {" "}Get the higher figure confirmed with the town planner before it's used in a
              price expectation.
            </div>
          </>
        ) : (
          <>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-gold-deep">Estimated land value</p>
            <p className="mt-2 text-4xl font-light text-gold-gradient">{rand(result.landValue)}</p>
          </>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-navy/10 pt-6 text-sm sm:grid-cols-4">
          <Metric label="Per hectare" value={rand(result.valuePerHectare)} />
          <Metric label="Per opportunity" value={rand(result.valuePerOpportunity)} />
          <Metric label="Opportunities" value={fmt(result.opportunities)} />
          <Metric label="Status factor" value={`${(result.statusPctUsed * 100).toFixed(1)}%`} />
          <Metric label="Density (per net ha)" value={`${fmt(result.densityUsed)} units/ha`} />
          <Metric label="Density (per gross ha)" value={`${fmt(result.effectiveDensityPerGrossHectare)} units/ha`} />
          <Metric label="Net developable" value={`${(result.netRatioUsed * 100).toFixed(0)}%`} />
          <Metric label="Non-developable" value={`${fmtHa(result.nonDevelopableHectares)} ha`} />
        </div>

        <h2 className="mt-8 border-t border-navy/10 pt-6 text-sm font-medium uppercase tracking-wide text-navy/60">
          The workings{assumedResult ? " — approved scenario" : ""}
        </h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <Row label="Gross site area" value={`${fmtHa(result.grossHectares)} ha`} />
            <Row
              label={`Less: non-developable area (${result.areaSplitMode === "absolute" ? "as supplied" : "estimated"})`}
              value={`${fmtHa(result.nonDevelopableHectares)} ha`}
            />
            <Row label="= Net developable area" value={`${fmtHa(result.netHectares)} ha`} strong />
            <Row label="What can be built" value={productLabel} />
            {!result.basketBreakdown && (
              <Row label="× Density" value={`${fmt(result.densityUsed)} units per net hectare`} />
            )}
            <Row label="= Opportunities" value={fmt(result.opportunities)} strong />
            {!result.basketBreakdown && (
              <Row label="× Average selling price per unit" value={rand(result.valuePerOpportunity / result.statusPctUsed)} />
            )}
            <Row label="× Status of the opportunity" value={`${statusLabel} (${(result.statusPctUsed * 100).toFixed(1)}%)`} />
            <Row label="= Estimated land value" value={rand(result.landValue)} strong final />
          </tbody>
        </table>

        {assumedResult && (
          <table className="mt-4 w-full text-sm">
            <tbody>
              <tr className="border-t-2 border-amber-200">
                <td colSpan={2} className="py-1.5 text-xs font-medium uppercase tracking-wide text-amber-700">
                  Assumption scenario
                </td>
              </tr>
              <Row label="What the architect assumes can be built" value={assumedProductLabel} />
              <Row label="× Density (assumed)" value={`${fmt(assumedResult.densityUsed)} units per net hectare`} />
              <Row label="= Opportunities (assumed)" value={fmt(assumedResult.opportunities)} strong />
              <Row label="× Assumed selling price per unit" value={rand(assumedResult.valuePerOpportunity / assumedResult.statusPctUsed)} />
              <Row label="= Estimated land value (assumed)" value={rand(assumedResult.landValue)} strong final />
            </tbody>
          </table>
        )}

        {result.basketBreakdown && (
          <>
            <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-navy/50">
              Basket of rights — by unit type
            </h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-[11px] uppercase tracking-wide text-navy/40">
                  <th className="py-1.5 font-medium">Unit type</th>
                  <th className="py-1.5 text-right font-medium">Opportunities</th>
                  <th className="py-1.5 text-right font-medium">Price per Opportunity</th>
                  <th className="py-1.5 text-right font-medium">Gross realisation</th>
                </tr>
              </thead>
              <tbody>
                {result.basketBreakdown.map((row) => (
                  <tr key={row.unitType} className="border-b border-navy/5">
                    <td className="py-1.5">{row.unitType}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(row.opportunities)}</td>
                    <td className="py-1.5 text-right tabular-nums">{rand(row.pricePerOpportunity)}</td>
                    <td className="py-1.5 text-right tabular-nums">{rand(row.grossRealisation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {result.netRatioWasDefaulted && (
          <p className="mt-6 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Net developable area was not supplied, so a conservative 60% default was used.
          </p>
        )}

        <p className="mt-6 border-t border-navy/10 pt-4 text-[11px] leading-relaxed text-navy/40">
          Prepared by Investor Property as a discussion starting point for both parties. This is
          an estimate, not a valuation — only a registered professional valuer may provide a
          valuation. It is not a substitute for a full feasibility study, a land survey, or
          professional advice. Figures are calibrated assumptions and will not match every site
          exactly.
        </p>
        <p className="mt-2 text-center text-[10px] text-navy/30">powered by Propello</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-navy/40">{label}</p>
      <p className="mt-0.5 font-medium text-navy">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  final: isFinal,
}: {
  label: string;
  value: string;
  strong?: boolean;
  final?: boolean;
}) {
  return (
    <tr className={isFinal ? "border-t-2 border-navy/20" : "border-t border-navy/5"}>
      <td className={`py-1.5 ${strong ? "font-medium text-navy" : "text-navy/60"}`}>{label}</td>
      <td className={`py-1.5 text-right tabular-nums ${strong ? "font-semibold text-navy" : "text-navy/70"} ${isFinal ? "text-lg" : ""}`}>
        {value}
      </td>
    </tr>
  );
}
