"use client";

import { useMemo, useState } from "react";
import { brokerDeals as seedDeals, properties } from "@/lib/crm/seed";
import {
  BROKER_TASKS,
  TASK_STATE_ORDER,
  TASK_STYLES,
  type BrokerDeal,
  type BrokerTaskState,
} from "@/lib/crm/types";

const rand = (n: number) => `R${n.toLocaleString("en-ZA")}`;

export default function CrmDealsPage() {
  const [rows, setRows] = useState<BrokerDeal[]>(seedDeals);
  const [propertyId, setPropertyId] = useState("all");

  const visible = useMemo(
    () => (propertyId === "all" ? rows : rows.filter((d) => d.propertyId === propertyId)),
    [rows, propertyId],
  );

  function cycle(dealId: string, taskKey: string) {
    setRows((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        const current = d.tasks[taskKey] ?? "not_started";
        const i = TASK_STATE_ORDER.indexOf(current);
        const next = TASK_STATE_ORDER[(i + 1) % TASK_STATE_ORDER.length];
        return { ...d, tasks: { ...d.tasks, [taskKey]: next } };
      }),
    );
  }

  function progress(d: BrokerDeal) {
    const done = BROKER_TASKS.filter((t) => d.tasks[t.key] === "done").length;
    return Math.round((done / BROKER_TASKS.length) * 100);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Deals</h1>
          <p className="mt-1 text-sm text-navy/60">
            Offer through to registration — your own brokerage checklist, click to progress.
          </p>
        </div>
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
                Deal
              </th>
              {BROKER_TASKS.map((t) => (
                <th
                  key={t.key}
                  title={t.label}
                  className="border-l border-navy/10 bg-shell px-2 py-3 text-center text-[11px] font-medium text-navy/60 min-w-[78px]"
                >
                  {t.short}
                </th>
              ))}
              <th className="border-l border-navy/10 bg-shell px-3 py-3 text-right text-xs font-medium text-navy/60">
                Commission
              </th>
              <th className="border-l border-navy/10 bg-shell px-3 py-3 text-center text-xs font-medium text-navy/60">
                Progress
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => {
              const property = properties.find((p) => p.id === d.propertyId);
              return (
                <tr key={d.id} className="border-b border-navy/5 last:border-0">
                  <td className="matrix-sticky bg-white px-4 py-3">
                    <div className="font-medium text-navy">{d.counterparty}</div>
                    <div className="text-xs text-navy/50">{property?.name}</div>
                    <div className="text-[11px] text-navy/40">{rand(d.agreedPrice)}</div>
                  </td>
                  {BROKER_TASKS.map((t) => {
                    const state: BrokerTaskState = d.tasks[t.key] ?? "not_started";
                    const style = TASK_STYLES[state];
                    return (
                      <td key={t.key} className="border-l border-navy/5 p-0 text-center">
                        <button
                          onClick={() => cycle(d.id, t.key)}
                          title={`${t.label}: ${style.label}`}
                          className={`flex h-full w-full items-center justify-center py-4 transition ${style.cell}`}
                        >
                          <span className={`h-3 w-3 rounded-full ${style.dot}`} />
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-l border-navy/5 px-3 py-3 text-right tabular-nums text-navy">
                    {d.commissionValue ? rand(d.commissionValue) : "—"}
                  </td>
                  <td className="border-l border-navy/5 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy/10">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${progress(d)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-navy/50">{progress(d)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={BROKER_TASKS.length + 3} className="px-4 py-12 text-center text-sm text-navy/50">
                  No deals for this property yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
