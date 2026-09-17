"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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

  // Net developable area: a plain % ratio, or typed absolute areas.
  const [splitMode, setSplitMode] = useState<"ratio" | "absolute">("ratio");
  const [netRatioOverride, setNetRatioOverride] = useState("");
  const [splitUnit, setSplitUnit] = useState<"ha" | "m2">("m2");
  const [developableArea, setDevelopableArea] = useState("");
  const [nonDevelopableArea, setNonDevelopableArea] = useState("");

  const [result, setResult] = useState<QuickResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isBasket = productType === "basket_of_rights";

  useEffect(() => {
    fetch("/api/valuation/quick")
      .then((r) => r.json())
      .then((data: { products: Option[]; statuses: Option[] }) => {
        setProducts(data.products);
        setStatuses(data.statuses);
        setProductType(data.products[2]?.value ?? data.products[0]?.value ?? "");
        setStatus(data.statuses[0]?.value ?? "");
      })
      .catch(() => setError("Could not load the form — refresh and try again"));
  }, []);

  function onAreaM2Change(v: string) {
    setAreaM2(v);
    const n = Number(v);
    if (Number.isFinite(n)) setAreaHa((n / HA_TO_M2).toString());
  }
  function onAreaHaChange(v: string) {
    setAreaHa(v);
    const n = Number(v);
    if (Number.isFinite(n)) setAreaM2((n * HA_TO_M2).toString());
  }

  function updateBasketRow(i: number, patch: Partial<BasketRow>) {
    setBasket((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addBasketRow() {
    setBasket((prev) => [...prev, emptyBasketRow()]);
  }
  function removeBasketRow(i: number) {
    setBasket((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const toHa = (v: string) => (splitUnit === "ha" ? Number(v) : Number(v) / HA_TO_M2);

    const body: Record<string, unknown> = {
      productType,
      status,
    };

    if (splitMode === "absolute" && developableArea && nonDevelopableArea) {
      body.developableHectares = toHa(developableArea);
      body.nonDevelopableHectares = toHa(nonDevelopableArea);
    } else {
      body.grossHectares = Number(areaHa);
      if (netRatioOverride) body.netRatio = Number(netRatioOverride) / 100;
    }

    if (isBasket) {
      body.basket = basket
        .filter((r) => r.unitType && r.opportunities && r.pricePerOpportunity)
        .map((r) => ({
          unitType: r.unitType,
          opportunities: Number(r.opportunities),
          pricePerOpportunity: Number(r.pricePerOpportunity),
        }));
    } else {
      body.averageUnitPrice = Number(unitPrice);
      if (densityOverride) body.density = Number(densityOverride);
    }

    try {
      const res = await fetch("/api/valuation/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not reach the calculator — check your connection and try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 bg-shell">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="no-print flex items-center gap-3">
          <Image src="/logo.png" alt="Investor Property" width={40} height={40} className="rounded-sm" />
          <Link href="/" className="text-xs uppercase tracking-[0.25em] text-gold-deep">
            {portal.name}
          </Link>
        </div>
        <h1 className="mt-3 text-3xl font-light text-navy sm:text-4xl">
          Desktop Land Valuation
        </h1>
        <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-navy/70">
          The desktop pre-check — the thing that tells you whether it&apos;s worth commissioning a
          full feasibility, not a replacement for one.
        </p>

        <form onSubmit={calculate} className="no-print mt-10 space-y-6 rounded-lg border border-navy/10 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Gross site area
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number" min="0" step="1" required
                  value={areaM2}
                  onChange={(e) => onAreaM2Change(e.target.value)}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">m²</span>
              </div>
              <div>
                <input
                  type="number" min="0" step="0.01" required
                  value={areaHa}
                  onChange={(e) => onAreaHaChange(e.target.value)}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">hectares</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              What can be built there?
            </label>
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
                <input
                  type="number" min="1"
                  placeholder="units per net hectare — leave blank to use our default"
                  value={densityOverride}
                  onChange={(e) => setDensityOverride(e.target.value)}
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
                      <th className="px-2 py-2 font-medium">Opps</th>
                      <th className="px-2 py-2 font-medium">Price per Opp</th>
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
                          <input
                            type="number" min="0"
                            value={row.opportunities}
                            onChange={(e) => updateBasketRow(i, { opportunities: e.target.value })}
                            className="w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number" min="0"
                            value={row.pricePerOpportunity}
                            onChange={(e) => updateBasketRow(i, { pricePerOpportunity: e.target.value })}
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
              <input
                type="number" min="0" step="1000" required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
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
                <input
                  type="number" min="1" max="100"
                  placeholder="% — defaults to a conservative 60% if left blank"
                  value={netRatioOverride}
                  onChange={(e) => setNetRatioOverride(e.target.value)}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <p className="mt-1.5 text-xs leading-relaxed text-navy/50">
                  Roads, communal areas and services typically consume 30–40% of a site.
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
                    <input
                      type="number" min="0"
                      placeholder="e.g. 4400"
                      value={developableArea}
                      onChange={(e) => setDevelopableArea(e.target.value)}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">Developable</span>
                  </div>
                  <div>
                    <input
                      type="number" min="0"
                      placeholder="e.g. 5600"
                      value={nonDevelopableArea}
                      onChange={(e) => setNonDevelopableArea(e.target.value)}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">
                      Non-developable (nature reserve, roads, servitudes…)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !productType || !status}
            className="w-full rounded-sm bg-navy px-6 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate land value"}
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
            <Report result={result} productLabel={products.find((p) => p.value === productType)?.label ?? ""} statusLabel={statuses.find((s) => s.value === status)?.label ?? ""} />
          </>
        )}

        <p className="no-print mt-8 text-xs leading-relaxed text-navy/40">
          This estimate is a starting point for discussion between buyer and seller, not a
          substitute for a full feasibility study, a survey, or professional advice. Assumptions
          are calibrated defaults and will not match every site.
        </p>
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
}: {
  result: QuickResult;
  productLabel: string;
  statusLabel: string;
}) {
  const today = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="print-sheet mt-8 overflow-hidden rounded-lg border border-navy/10 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-navy px-6 py-5 text-shell">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Investor Property" width={44} height={44} className="rounded-sm bg-shell/10 p-1" />
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide">Investor Property</div>
            <div className="text-xs text-shell/60">Desktop Land Valuation</div>
          </div>
        </div>
        <div className="text-right text-xs text-shell/60">
          <div>{today}</div>
        </div>
      </div>
      <div className="h-1 rule-gold" />

      <div className="p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Estimated land value</p>
        <p className="mt-2 text-4xl font-light text-gold-gradient">{rand(result.landValue)}</p>

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
          The workings
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
                  <th className="py-1.5 text-right font-medium">Price per opp</th>
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
          Prepared by Investor Property as a discussion starting point for both parties. This is a
          desktop estimate, not a substitute for a full feasibility study, a land survey, or
          professional advice. Figures are calibrated assumptions and will not match every site
          exactly.
        </p>
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
