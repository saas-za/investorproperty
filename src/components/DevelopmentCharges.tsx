"use client";

import { useEffect, useState } from "react";
import NumberInput from "@/components/NumberInput";

interface LandUseOption {
  value: string;
  label: string;
  per: "unit" | "m2" | "room" | "bed" | "learner";
  category: string;
}

interface DcLineResult {
  code: string;
  label: string;
  per: LandUseOption["per"];
  newRight: number;
  existingRight: number;
  additionalDemand: number;
  ratePerUnit: number;
  charge: number;
}

interface DcResult {
  municipalityName: string;
  rateYear: string;
  projectedRates: boolean;
  pt2: boolean;
  lines: DcLineResult[];
  bulkServices: number;
  linkServices: number;
  vat: number;
  total: number;
  pt2Saving?: number;
  notes: string[];
  comparison?: {
    rows: { code: string; label: string; perUnit: number; total: number }[];
    spread: number;
  };
}

interface Row {
  code: string;
  newRight: string;
  existingRight: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-ZA");
const rand = (n: number) => `R${fmt(n)}`;

const PER_LABEL: Record<LandUseOption["per"], string> = {
  unit: "units",
  m2: "m² GLA",
  room: "rooms",
  bed: "beds",
  learner: "learners",
};

interface Props {
  /**
   * Set when the map put the site in a municipality. Cape Town opens the panel
   * on its own; anywhere else says plainly that no rate set exists yet.
   */
  municipalityCode?: string;
  municipalityName?: string;
  /** Seeds the first row, so the panel opens already carrying the scheme. */
  suggestedUnits?: number;
  className?: string;
}

export default function DevelopmentCharges({
  municipalityCode,
  municipalityName,
  suggestedUnits,
  className = "",
}: Props) {
  const inCapeTown = municipalityCode === "CPT";
  // The map is authoritative when it has spoken. When it has not — because the
  // area was typed in by hand — the checkbox is the fallback the brief asked
  // for, rather than hiding the whole module behind a map click.
  const [manualCapeTown, setManualCapeTown] = useState(false);
  const active = inCapeTown || manualCapeTown;

  const [landUses, setLandUses] = useState<LandUseOption[]>([]);
  const [rateYears, setRateYears] = useState<{ value: string; label: string }[]>([]);
  const [rateYear, setRateYear] = useState("");
  const [rows, setRows] = useState<Row[]>([{ code: "A11", newRight: "", existingRight: "" }]);
  const [pt2, setPt2] = useState(false);
  const [linkServices, setLinkServices] = useState("");
  const [result, setResult] = useState<DcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || landUses.length) return;
    fetch("/api/development-charges?municipality=CPT")
      .then((r) => r.json())
      .then((d) => {
        setLandUses(d.landUses ?? []);
        setRateYears(d.rateYears ?? []);
        setRateYear(d.defaultRateYear ?? "");
      })
      .catch(() => setError("Could not load the land use list"));
  }, [active, landUses.length]);

  // Pre-fill the unit count from the estimate above, but only while the field
  // is untouched — retyping it should not be undone by a recalculation.
  useEffect(() => {
    if (!suggestedUnits) return;
    setRows((prev) =>
      prev.length === 1 && prev[0].newRight === ""
        ? [{ ...prev[0], newRight: String(Math.round(suggestedUnits)) }]
        : prev,
    );
  }, [suggestedUnits]);

  async function calculate() {
    setError(null);
    setLoading(true);
    const lines = rows
      .filter((r) => r.code && Number(r.newRight) > 0)
      .map((r) => ({
        code: r.code,
        newRight: Number(r.newRight),
        existingRight: r.existingRight === "" ? 0 : Number(r.existingRight),
      }));

    if (lines.length === 0) {
      setError("Add at least one land use with a quantity");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/development-charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipality: "CPT",
          lines,
          pt2,
          rateYear,
          linkServices: linkServices === "" ? 0 : Number(linkServices),
          compareTypologiesForUnits: lines[0].newRight,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Calculation failed");
        setResult(null);
        return;
      }
      setResult(data);
    } catch {
      setError("Could not reach the calculator");
    } finally {
      setLoading(false);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  const knownMunicipality = Boolean(municipalityCode);

  return (
    <div className={`rounded-lg border border-navy/10 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-navy">Development charges</h2>
        {inCapeTown ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-800 ring-1 ring-emerald-200">
            {municipalityName} — rates loaded
          </span>
        ) : knownMunicipality ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800 ring-1 ring-amber-200">
            {municipalityName} — no rate set yet
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-xs leading-relaxed text-navy/50">
        What the municipality charges for the extra demand a development puts on bulk services.
        Only the City of Cape Town&apos;s rates have been extracted so far — other municipalities
        work the same way but publish different factors.
      </p>

      {!inCapeTown && (
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-navy/70">
          <input
            type="checkbox"
            checked={manualCapeTown}
            onChange={(e) => setManualCapeTown(e.target.checked)}
            className="mt-0.5"
          />
          {knownMunicipality
            ? `Calculate anyway using City of Cape Town rates (this site is in ${municipalityName})`
            : "This site is in the City of Cape Town"}
        </label>
      )}

      {/* Picking the site on the map makes this automatic. Saying so is worth
          more than silently working either way. */}
      {!knownMunicipality && !manualCapeTown && (
        <p className="mt-2 text-[11px] text-navy/40">
          Pick the site on the map above and this opens by itself when it falls in Cape Town.
        </p>
      )}

      {manualCapeTown && knownMunicipality && !inCapeTown && (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          The map puts this site in {municipalityName}, not Cape Town. The figure below will be
          Cape Town&apos;s charge for the same scheme — useful as an order of magnitude, not as
          what {municipalityName} will actually invoice.
        </p>
      )}

      {active && (
        <>
          <div className="mt-4 space-y-2">
            {rows.map((row, i) => {
              const use = landUses.find((u) => u.value === row.code);
              return (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <select
                    value={row.code}
                    onChange={(e) => update(i, { code: e.target.value })}
                    className="col-span-6 rounded border border-navy/20 px-2 py-2 text-xs"
                  >
                    {landUses.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                  <div className="col-span-3">
                    <NumberInput
                      decimals={0}
                      placeholder="New"
                      value={row.newRight}
                      onChange={(v) => update(i, { newRight: v })}
                      className="w-full rounded border border-navy/20 px-2 py-2 text-xs"
                    />
                    <span className="mt-0.5 block text-[10px] text-navy/40">
                      New right{use ? ` (${PER_LABEL[use.per]})` : ""}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <NumberInput
                      decimals={0}
                      placeholder="0"
                      value={row.existingRight}
                      onChange={(v) => update(i, { existingRight: v })}
                      className="w-full rounded border border-navy/20 px-2 py-2 text-xs"
                    />
                    <span className="mt-0.5 block text-[10px] text-navy/40">Existing right</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setRows((p) => [...p, { code: "C3", newRight: "", existingRight: "" }])}
            className="mt-2 text-xs text-gold-deep underline underline-offset-2"
          >
            + Add a land use
          </button>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-[11px] text-navy/50">Rate year</label>
              <select
                value={rateYear}
                onChange={(e) => setRateYear(e.target.value)}
                className="mt-1 w-full rounded border border-navy/20 px-2 py-2 text-xs"
              >
                {rateYears.map((y) => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-navy/50">Link services (ZAR)</label>
              <NumberInput
                decimals={0}
                placeholder="From your engineer"
                value={linkServices}
                onChange={setLinkServices}
                className="mt-1 w-full rounded border border-navy/20 px-2 py-2 text-xs"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-xs text-navy/70">
              <input type="checkbox" checked={pt2} onChange={(e) => setPt2(e.target.checked)} />
              In a PT2 transport zone
            </label>
          </div>

          <button
            type="button"
            onClick={calculate}
            disabled={loading}
            className="mt-4 rounded bg-navy px-5 py-2.5 text-sm text-shell disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate development charges"}
          </button>

          {error && (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          {result && <DcReport result={result} />}
        </>
      )}
    </div>
  );
}

function DcReport({ result }: { result: DcResult }) {
  return (
    <div className="mt-5 border-t border-navy/10 pt-5">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-navy/10 text-left text-[10px] uppercase tracking-wide text-navy/40">
            <th className="py-2 font-medium">Land use</th>
            <th className="py-2 text-right font-medium">New</th>
            <th className="py-2 text-right font-medium">Existing</th>
            <th className="py-2 text-right font-medium">Charged on</th>
            <th className="py-2 text-right font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Charge</th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((l) => (
            <tr key={l.code} className="border-b border-navy/5">
              <td className="py-2 pr-2">
                <span className="font-medium text-navy">{l.code}</span>
                <span className="ml-1.5 text-navy/50">{l.label}</span>
              </td>
              <td className="py-2 text-right tabular-nums">{fmt(l.newRight)}</td>
              <td className="py-2 text-right tabular-nums text-navy/50">
                {l.existingRight ? fmt(l.existingRight) : "—"}
              </td>
              <td className="py-2 text-right tabular-nums font-medium">
                {fmt(l.additionalDemand)}
              </td>
              <td className="py-2 text-right tabular-nums text-navy/60">{rand(l.ratePerUnit)}</td>
              <td className="py-2 text-right tabular-nums">{rand(l.charge)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-navy/70">
          <tr>
            <td colSpan={5} className="py-1.5 text-right">Bulk services</td>
            <td className="py-1.5 text-right tabular-nums">{rand(result.bulkServices)}</td>
          </tr>
          {result.linkServices > 0 && (
            <tr>
              <td colSpan={5} className="py-1.5 text-right">Link services</td>
              <td className="py-1.5 text-right tabular-nums">{rand(result.linkServices)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={5} className="py-1.5 text-right">VAT</td>
            <td className="py-1.5 text-right tabular-nums">{rand(result.vat)}</td>
          </tr>
          <tr className="border-t border-navy/20 text-sm font-medium text-navy">
            <td colSpan={5} className="py-2.5 text-right">
              Total payable to {result.municipalityName}
            </td>
            <td className="py-2.5 text-right tabular-nums">{rand(result.total)}</td>
          </tr>
        </tfoot>
      </table>

      {result.pt2Saving !== undefined && result.pt2Saving > 0 && (
        <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Being in a PT2 transport zone saves {rand(result.pt2Saving)} against the standard roads
          rate.
        </p>
      )}

      {result.comparison && (
        <div className="mt-5">
          <h3 className="text-xs font-medium text-navy">
            The same {fmt(result.lines[0].newRight)} units, by typology
          </h3>
          {/* This is the part developers do not price at concept stage: unit
              size alone moves the charge by millions. */}
          <p className="mt-1 text-[11px] leading-relaxed text-navy/50">
            Unit size and typology alone move the charge by{" "}
            <span className="font-medium text-navy">{rand(result.comparison.spread)}</span> on this
            scheme — before a single design decision about anything else.
          </p>
          <div className="mt-2 space-y-1">
            {result.comparison.rows.map((r) => {
              const max = Math.max(...result.comparison!.rows.map((x) => x.total));
              return (
                <div key={r.code} className="flex items-center gap-2 text-[11px]">
                  <span className="w-8 shrink-0 font-medium text-navy/70">{r.code}</span>
                  <span className="w-48 shrink-0 truncate text-navy/50">{r.label}</span>
                  <div className="h-2.5 flex-1 rounded-sm bg-navy/5">
                    <div
                      className="h-full rounded-sm bg-gold"
                      style={{ width: `${max > 0 ? (r.total / max) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right tabular-nums text-navy/70">
                    {rand(r.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-1 border-t border-navy/10 pt-3 text-[11px] leading-relaxed text-navy/45">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
