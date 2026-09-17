"use client";

import { Fragment, useState } from "react";
import { landOpportunities as seedLand } from "@/lib/crm/seed";
import { LAND_STAGE_STYLES, type LandOpportunity, type LandStage } from "@/lib/crm/types";

const STAGES: LandStage[] = [
  "Sourcing", "Owner contacted", "Under negotiation", "Packaged", "Under offer", "Sold", "Withdrawn",
];

const rand = (n?: number) => (n ? `R${n.toLocaleString("en-ZA")}` : "—");

export default function DevelopmentLandPage() {
  const [rows, setRows] = useState<LandOpportunity[]>(seedLand);
  const [expanded, setExpanded] = useState<string | null>(null);

  function setStage(id: string, stage: LandStage) {
    setRows((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-navy">Development Land</h1>
        <p className="mt-1 text-sm text-navy/60">
          Sites you&apos;re sourcing and packaging for a developer — its own pipeline, not tied to
          a listing. Erf and zoning detail is what makes this different from a normal property
          record.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <span key={s} className={`rounded-full px-3 py-1 text-xs ring-1 ${LAND_STAGE_STYLES[s]}`}>
            {s} · {rows.filter((l) => l.stage === s).length}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-navy/10 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="matrix-sticky bg-shell px-4 py-3 text-left font-medium text-navy min-w-[220px]">
                Opportunity
              </th>
              <th className="bg-shell px-3 py-3 text-left text-xs font-medium text-navy/60">Erf / LPI</th>
              <th className="bg-shell px-3 py-3 text-right text-xs font-medium text-navy/60">Area (ha)</th>
              <th className="bg-shell px-3 py-3 text-left text-xs font-medium text-navy/60">Current zoning</th>
              <th className="bg-shell px-3 py-3 text-left text-xs font-medium text-navy/60">Proposed zoning</th>
              <th className="bg-shell px-3 py-3 text-right text-xs font-medium text-navy/60">Asking price</th>
              <th className="bg-shell px-3 py-3 text-left text-xs font-medium text-navy/60">Developer interest</th>
              <th className="bg-shell px-3 py-3 text-center text-xs font-medium text-navy/60">Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const open = expanded === l.id;
              return (
                <Fragment key={l.id}>
                  <tr className="border-b border-navy/5">
                    <td className="matrix-sticky bg-white px-4 py-3">
                      <button onClick={() => setExpanded(open ? null : l.id)} className="text-left">
                        <div className="font-medium text-navy">
                          <span className="mr-1 text-navy/40">{open ? "▾" : "▸"}</span>
                          {l.name}
                        </div>
                        <div className="text-xs text-navy/50">{l.location}</div>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-navy/60">
                      {l.erfNo ? `Erf ${l.erfNo}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-navy/70">{l.areaHa}</td>
                    <td className="px-3 py-3 text-navy/70">{l.currentZoning}</td>
                    <td className="px-3 py-3 text-navy/70">{l.proposedZoning ?? "—"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-navy">{rand(l.askingPrice)}</td>
                    <td className="px-3 py-3 text-navy/70">{l.developerInterest ?? "—"}</td>
                    <td className="px-3 py-3 text-center">
                      <select
                        value={l.stage}
                        onChange={(e) => setStage(l.id, e.target.value as LandStage)}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs ring-1 ${LAND_STAGE_STYLES[l.stage]}`}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-navy/5 bg-gold/5">
                      <td colSpan={8} className="px-6 py-4 text-sm text-navy/70">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-navy/40">Owner</div>
                            <div className="mt-1">{l.ownerName ?? "—"}</div>
                            <div className="text-xs text-navy/50">{l.ownerContact ?? ""}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-navy/40">LPI code</div>
                            <div className="mt-1 font-mono text-xs">{l.lpiCode ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-navy/40">Notes</div>
                            <div className="mt-1">{l.notes ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-navy/50">
        This is the same shape as the parser already in{" "}
        <code className="rounded bg-navy/5 px-1">New Listing.js</code> — erf number, LPI code,
        area, current vs proposed zoning. Pasting a Cape Farm Mapper result here to auto-fill a new
        row is the natural next step rather than typing these by hand.
      </p>
    </div>
  );
}
