"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { portal } from "@/config/platform";

interface Option {
  value: string;
  label: string;
}

interface QuickResult {
  netHectares: number;
  netRatioUsed: number;
  densityUsed: number;
  statusPctUsed: number;
  opportunities: number;
  landValue: number;
  valuePerHectare: number;
  valuePerOpportunity: number;
  netRatioWasDefaulted: boolean;
}

const rand = (n: number) =>
  `R${Math.round(n).toLocaleString("en-ZA")}`;

export default function ValuationPage() {
  const [products, setProducts] = useState<Option[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);

  const [hectares, setHectares] = useState("1");
  const [productType, setProductType] = useState("");
  const [status, setStatus] = useState("");
  const [unitPrice, setUnitPrice] = useState("1000000");
  const [netRatioOverride, setNetRatioOverride] = useState("");
  const [densityOverride, setDensityOverride] = useState("");

  const [result, setResult] = useState<QuickResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/valuation/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossHectares: Number(hectares),
          productType,
          status,
          averageUnitPrice: Number(unitPrice),
          netRatio: netRatioOverride ? Number(netRatioOverride) / 100 : undefined,
          density: densityOverride ? Number(densityOverride) : undefined,
        }),
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
        <Link href="/" className="text-xs uppercase tracking-[0.25em] text-gold-deep">
          {portal.name}
        </Link>
        <h1 className="mt-3 text-3xl font-light text-navy sm:text-4xl">
          Quick land value
        </h1>
        <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-navy/70">
          Four inputs, one number. This is the desktop pre-check — the thing that tells you
          whether it&apos;s worth commissioning a full feasibility, not a replacement for one.
        </p>

        <form onSubmit={calculate} className="mt-10 space-y-6 rounded-lg border border-navy/10 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Gross site area (hectares)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={hectares}
              onChange={(e) => setHectares(e.target.value)}
              className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
            />
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
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs text-navy/50">
                Override the density assumption
              </summary>
              <input
                type="number"
                min="1"
                placeholder="units per hectare — leave blank to use our default"
                value={densityOverride}
                onChange={(e) => setDensityOverride(e.target.value)}
                className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
              />
            </details>
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

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Average selling price per unit (ZAR)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
            />
          </div>

          <details>
            <summary className="cursor-pointer text-xs text-navy/50">
              Net developable area — not all of the site is sellable
            </summary>
            <div className="mt-2">
              <input
                type="number"
                min="1"
                max="100"
                placeholder="% — defaults to a conservative 60% if left blank"
                value={netRatioOverride}
                onChange={(e) => setNetRatioOverride(e.target.value)}
                className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-navy/50">
                Roads, communal areas and services typically consume 30–40% of a site. If you
                know your actual buildable footprint, enter it here — the default is a starting
                point, not a promise.
              </p>
            </div>
          </details>

          <button
            type="submit"
            disabled={loading || !productType || !status}
            className="w-full rounded-sm bg-navy px-6 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate land value"}
          </button>
        </form>

        {error && (
          <div className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 overflow-hidden rounded-lg border border-navy/10 bg-navy shadow-sm">
            <div className="p-6 text-shell">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-light/80">
                Estimated land value
              </p>
              <p className="mt-2 text-4xl font-light text-gold-gradient">
                {rand(result.landValue)}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-shell/10 pt-6 text-sm sm:grid-cols-3">
                <Metric label="Per hectare" value={rand(result.valuePerHectare)} />
                <Metric label="Per opportunity" value={rand(result.valuePerOpportunity)} />
                <Metric label="Opportunities" value={Math.round(result.opportunities).toLocaleString("en-ZA")} />
                <Metric label="Density used" value={`${result.densityUsed} units/ha`} />
                <Metric label="Status factor" value={`${(result.statusPctUsed * 100).toFixed(1)}%`} />
                <Metric label="Net developable" value={`${(result.netRatioUsed * 100).toFixed(0)}%`} />
              </div>
            </div>
            {result.netRatioWasDefaulted && (
              <div className="border-t border-shell/10 bg-navy-deep/40 px-6 py-3 text-xs text-shell/70">
                Net developable area was not supplied, so a conservative 60% default was used.
                Open &quot;Net developable area&quot; above to refine it with your actual site
                layout.
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-navy/40">
          This estimate is a starting point for discussion between buyer and seller, not a
          substitute for a full feasibility study, a survey, or professional advice. Assumptions
          are calibrated defaults and will not match every site.
        </p>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-shell/50">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
