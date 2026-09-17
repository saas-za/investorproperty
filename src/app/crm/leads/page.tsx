"use client";

import { useMemo, useState } from "react";
import { crmLeads as seedLeads, properties } from "@/lib/crm/seed";
import {
  CAMPAIGN_STEPS,
  STEP_STATE_ORDER,
  STEP_STYLES,
  TEMPERATURE_STYLES,
  type CrmLead,
  type Temperature,
} from "@/lib/crm/types";

const TEMPERATURES: Temperature[] = ["New", "Warm", "Hot", "Lost"];

export default function CrmLeadsPage() {
  const [rows, setRows] = useState<CrmLead[]>(seedLeads);
  const [propertyId, setPropertyId] = useState("all");

  const visible = useMemo(
    () => (propertyId === "all" ? rows : rows.filter((l) => l.propertyId === propertyId)),
    [rows, propertyId],
  );

  function cycleStep(leadId: string, stepKey: string) {
    setRows((prev) =>
      prev.map((l) => {
        if (l.id !== leadId) return l;
        const current = l.steps[stepKey] ?? "pending";
        const i = STEP_STATE_ORDER.indexOf(current);
        const next = STEP_STATE_ORDER[(i + 1) % STEP_STATE_ORDER.length];
        return { ...l, steps: { ...l.steps, [stepKey]: next } };
      }),
    );
  }

  function setTemperature(leadId: string, temperature: Temperature) {
    setRows((prev) => prev.map((l) => (l.id === leadId ? { ...l, temperature } : l)));
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Leads</h1>
          <p className="mt-1 text-sm text-navy/60">
            Too many properties for tabs, so pick one from the dropdown instead.
          </p>
        </div>
        {/* Dropdown, not a slider — there can be many more properties than developments. */}
        <select
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="rounded border border-navy/20 px-3 py-2 text-sm"
        >
          <option value="all">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-navy/10 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-navy/10">
              <th className="matrix-sticky bg-shell px-4 py-3 text-left font-medium text-navy min-w-[240px]">
                Lead
              </th>
              <th className="bg-shell px-3 py-3 text-left text-xs font-medium text-navy/60 min-w-[220px]">
                Property
              </th>
              {CAMPAIGN_STEPS.map((s) => (
                <th
                  key={s.key}
                  className="border-l border-navy/10 bg-shell px-2 py-3 text-center text-xs font-medium text-navy/60 min-w-[100px]"
                >
                  {s.order}. {s.label}
                </th>
              ))}
              <th className="border-l border-navy/10 bg-shell px-3 py-3 text-center text-xs font-medium text-navy/60">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => {
              const property = properties.find((p) => p.id === l.propertyId);
              return (
                <tr key={l.id} className="border-b border-navy/5 last:border-0">
                  <td className="matrix-sticky bg-white px-4 py-3">
                    <div className="font-medium text-navy">{l.name}</div>
                    <div className="text-xs text-navy/50">
                      {l.email}
                      {l.phone && ` · ${l.phone}`}
                    </div>
                    <div className="text-[11px] text-navy/40">{l.source}</div>
                  </td>
                  <td className="px-3 py-3 text-xs text-navy/70">{property?.name}</td>
                  {CAMPAIGN_STEPS.map((s) => {
                    const state = l.steps[s.key] ?? "pending";
                    const style = STEP_STYLES[state];
                    return (
                      <td key={s.key} className="border-l border-navy/5 p-0 text-center">
                        <button
                          onClick={() => cycleStep(l.id, s.key)}
                          title={`${s.label}: ${style.label}`}
                          className={`flex h-full w-full items-center justify-center py-4 transition ${style.cell}`}
                        >
                          <span className={`h-3 w-3 rounded-full ${style.dot}`} />
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-l border-navy/5 px-3 py-3 text-center">
                    <select
                      value={l.temperature}
                      onChange={(e) => setTemperature(l.id, e.target.value as Temperature)}
                      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs ring-1 ${TEMPERATURE_STYLES[l.temperature]}`}
                    >
                      {TEMPERATURES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={CAMPAIGN_STEPS.length + 3} className="px-4 py-12 text-center text-sm text-navy/50">
                  No leads for this property yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
