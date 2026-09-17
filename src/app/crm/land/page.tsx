"use client";

import { Fragment, useEffect, useState } from "react";
import ParcelMap, { type Municipality, type SelectedParcel } from "@/components/ParcelMap";
import {
  developers,
  landDeveloperInterest as seedInterest,
  landOpportunities as seedLand,
} from "@/lib/crm/seed";
import {
  DEVELOPER_INTEREST_STYLES,
  LAND_STAGE_STYLES,
  type AttachedParcel,
  type LandDeveloperInterest,
  type LandOpportunity,
  type LandStage,
} from "@/lib/crm/types";

const STAGES: LandStage[] = [
  "Sourcing", "Owner contacted", "Under negotiation", "Packaged", "Under offer", "Sold", "Withdrawn",
];

const rand = (n?: number) => (n ? `R${n.toLocaleString("en-ZA")}` : "—");

function toAttached(p: SelectedParcel): AttachedParcel {
  return {
    key: p.key,
    lpi: p.lpi,
    label: p.label,
    areaM2: p.areaM2,
    province: p.province,
    registrationDivision: p.registrationDivision,
    centroid: p.centroid,
  };
}

/**
 * Which existing opportunities already hold any of these parcels.
 *
 * Matched on the Surveyor-General parcel key rather than on name, area or erf
 * number. Names get typed differently every time, areas come from whatever the
 * seller said, and erf numbers repeat across registration divisions — the
 * parcel key is the only thing that identifies a piece of ground uniquely.
 */
function findDuplicates(
  rows: LandOpportunity[],
  parcels: AttachedParcel[],
  ignoreId?: string,
) {
  const keys = new Set(parcels.map((p) => p.key));
  return rows
    .filter((l) => l.id !== ignoreId)
    .map((l) => ({
      row: l,
      shared: (l.parcels ?? []).filter((p) => keys.has(p.key)),
    }))
    .filter((m) => m.shared.length > 0);
}

export default function DevelopmentLandPage() {
  const [rows, setRows] = useState<LandOpportunity[]>(seedLand);
  const [expanded, setExpanded] = useState<string | null>(null);
  /** Which row the map drawer is attaching parcels to. "new" creates one. */
  const [picking, setPicking] = useState<string | null>(null);
  const [draft, setDraft] = useState<SelectedParcel[]>([]);
  const [draftMuni, setDraftMuni] = useState<Municipality | null>(null);
  const [interest, setInterest] = useState<LandDeveloperInterest[]>(seedInterest);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function sendToDeveloper(land: LandOpportunity, developerId: string) {
    const dev = developers.find((d) => d.id === developerId);
    if (!dev) return;
    const key = `${land.id}:${developerId}`;
    setSendingTo(key);
    try {
      const res = await fetch("/api/land-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: {
            name: land.name,
            location: land.location,
            askingPrice: land.askingPrice,
            erfNo: land.erfNo,
            lpiCode: land.lpiCode,
            areaM2: land.areaHa * 10_000,
            currentZoning: land.currentZoning,
            proposedZoning: land.proposedZoning,
            description: land.notes,
            // The stored centroids, not boundaries — the send route
            // re-derives each parcel's current shape from the cadastre
            // right before generating the map.
            centroids: (land.parcels ?? []).map((p) => p.centroid),
          },
          recipient: {
            name: dev.name,
            language: dev.language,
            emails: [dev.contact1Email, dev.contact2Email].filter((e): e is string => Boolean(e)),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToast(data.error ?? "Could not send that email");
        return;
      }
      setInterest((prev) => {
        const existing = prev.find((r) => r.landId === land.id && r.developerId === developerId);
        const next = { landId: land.id, developerId, status: "Mailed" as const, mailedAt: today() };
        return existing
          ? prev.map((r) => (r === existing ? next : r))
          : [...prev, next];
      });
      setToast(
        data.simulated
          ? `Simulated — no RESEND_API_KEY configured. Would have mailed ${dev.name}.`
          : `Mailed ${dev.name}`,
      );
    } catch {
      setToast("Could not reach the send endpoint");
    } finally {
      setSendingTo(null);
    }
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function setStage(id: string, stage: LandStage) {
    setRows((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  }

  function openPicker(id: string) {
    setPicking(id);
    const existing = id === "new" ? [] : (rows.find((l) => l.id === id)?.parcels ?? []);
    // Boundaries are not stored on the row — only the identity and extent are,
    // because a stored polygon goes stale the moment a subdivision registers.
    // Reopening the picker therefore starts from a clean map.
    setDraft(existing.map((p) => ({ ...p, areaHa: p.areaM2 / 10_000, rings: [] })));
    setDraftMuni(null);
  }

  const draftDuplicates = picking
    ? findDuplicates(rows, draft.map(toAttached), picking === "new" ? undefined : picking)
    : [];

  function applyPicker() {
    if (!picking) return;
    const parcels = draft.map(toAttached);
    const totalM2 = parcels.reduce((s, p) => s + p.areaM2, 0);

    if (picking === "new") {
      const first = parcels[0];
      setRows((prev) => [
        {
          id: `land-${Date.now()}`,
          // Named off the cadastre so a new row is never a blank "Untitled".
          name: first ? first.label : "New land opportunity",
          location: draftMuni?.name ?? first?.registrationDivision ?? "",
          erfNo: first?.label.replace(/^Erf /, ""),
          lpiCode: first?.lpi || undefined,
          areaHa: Number((totalM2 / 10_000).toFixed(4)),
          currentZoning: "Unconfirmed",
          stage: "Sourcing",
          parcels,
          municipality: draftMuni?.name,
          municipalityCode: draftMuni?.code,
        },
        ...prev,
      ]);
    } else {
      setRows((prev) =>
        prev.map((l) =>
          l.id !== picking
            ? l
            : {
                ...l,
                parcels,
                areaHa: totalM2 > 0 ? Number((totalM2 / 10_000).toFixed(4)) : l.areaHa,
                erfNo: parcels[0]?.label.replace(/^Erf /, "") ?? l.erfNo,
                lpiCode: parcels[0]?.lpi || l.lpiCode,
                municipality: draftMuni?.name ?? l.municipality,
                municipalityCode: draftMuni?.code ?? l.municipalityCode,
              },
        ),
      );
    }
    setPicking(null);
    setDraft([]);
    setDraftMuni(null);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Development Land</h1>
          <p className="mt-1 text-sm text-navy/60">
            Sites you&apos;re sourcing and packaging for a developer — its own pipeline, not tied to
            a listing. Erf and zoning detail is what makes this different from a normal property
            record.
          </p>
        </div>
        <button
          onClick={() => openPicker("new")}
          className="rounded bg-navy px-4 py-2 text-sm text-shell hover:bg-navy-deep"
        >
          Add from map
        </button>
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
              const verified = (l.parcels?.length ?? 0) > 0;
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
                      <div className="flex items-center gap-1.5">
                        {l.erfNo ? `Erf ${l.erfNo}` : "—"}
                        {/* Confirmed against the cadastre beats typed off a
                            listing — that distinction is the whole point. */}
                        {verified && (
                          <span
                            title={`${l.parcels!.length} parcel${l.parcels!.length > 1 ? "s" : ""} confirmed against the national cadastre`}
                            className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 ring-1 ring-emerald-200"
                          >
                            {l.parcels!.length > 1 ? `${l.parcels!.length} parcels` : "verified"}
                          </span>
                        )}
                      </div>
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
                        <div className="grid gap-4 sm:grid-cols-4">
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
                            <div className="text-xs uppercase tracking-wide text-navy/40">
                              Cadastre
                            </div>
                            {verified ? (
                              <ul className="mt-1 space-y-0.5 text-xs">
                                {l.parcels!.map((p) => (
                                  <li key={p.key}>
                                    {p.label} ·{" "}
                                    {Math.round(p.areaM2).toLocaleString("en-ZA")} m²
                                  </li>
                                ))}
                                {l.municipality && (
                                  <li className="text-navy/50">{l.municipality}</li>
                                )}
                              </ul>
                            ) : (
                              <div className="mt-1 text-xs text-navy/50">Not confirmed</div>
                            )}
                            <button
                              onClick={() => openPicker(l.id)}
                              className="mt-1.5 text-xs text-gold-deep underline underline-offset-2"
                            >
                              {verified ? "Change on the map" : "Pick on the map"}
                            </button>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-navy/40">Notes</div>
                            <div className="mt-1">{l.notes ?? "—"}</div>
                          </div>
                        </div>

                        {/* The part that was missing entirely — a site could
                            be added and then nothing further done with it. */}
                        <div className="mt-4 border-t border-navy/10 pt-4">
                          <div className="text-xs uppercase tracking-wide text-navy/40">
                            Send to developer
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {developers.map((dev) => {
                              const rec = interest.find(
                                (r) => r.landId === l.id && r.developerId === dev.id,
                              );
                              const status = rec?.status ?? "Not mailed";
                              const key = `${l.id}:${dev.id}`;
                              return (
                                <div key={dev.id} className="flex items-center gap-2 text-xs">
                                  <span className="w-48 shrink-0 text-navy">{dev.name}</span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 ring-1 ${DEVELOPER_INTEREST_STYLES[status]}`}
                                  >
                                    {status}
                                    {rec?.mailedAt && status === "Mailed" ? ` · ${rec.mailedAt}` : ""}
                                  </span>
                                  <button
                                    onClick={() => sendToDeveloper(l, dev.id)}
                                    disabled={sendingTo === key}
                                    className="ml-auto rounded bg-navy px-2.5 py-1 text-[11px] font-medium text-shell hover:bg-navy-deep disabled:opacity-50"
                                  >
                                    {sendingTo === key
                                      ? "Sending…"
                                      : status === "Not mailed"
                                        ? "Mail"
                                        : "Re-send"}
                                  </button>
                                </div>
                              );
                            })}
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
        Erf number, area and municipality come straight from the Council for Geoscience cadastre on
        a map click, so they are the registered figures rather than whatever a listing claimed.
        Zoning still has to be confirmed with the municipality — no national zoning layer exists.
      </p>

      {picking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setPicking(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium text-navy">
              {picking === "new" ? "Add a site from the map" : "Confirm the parcels"}
            </h2>
            <p className="mt-1 text-xs text-navy/50">
              Click each parcel that makes up the site. Several can be selected where a site is
              being consolidated — the area on the row is their total.
            </p>

            <ParcelMap
              className="mt-4"
              selected={draft}
              onChange={(next, muni) => {
                setDraft(next);
                if (muni) setDraftMuni(muni);
              }}
            />

            {/* Caught before the row is created, not after. The same piece of
                ground arriving twice under two different names is the thing
                the parcel key exists to prevent. */}
            {draftDuplicates.length > 0 && (
              <div className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                <p className="font-medium">
                  {draftDuplicates.length === 1
                    ? "This land is already on the board."
                    : "This land is already on the board more than once."}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {draftDuplicates.map((m) => (
                    <li key={m.row.id}>
                      <span className="font-medium">{m.row.name}</span> ({m.row.stage}) — shares{" "}
                      {m.shared.map((p) => p.label).join(", ")}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-amber-800/80">
                  Matched on the Surveyor-General parcel key, so this holds even where the name,
                  area or erf number was captured differently.
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPicking(null)}
                className="rounded px-4 py-2 text-sm text-navy/60 hover:bg-navy/5"
              >
                Cancel
              </button>
              <button
                onClick={applyPicker}
                disabled={draft.length === 0}
                className={`rounded px-4 py-2 text-sm text-shell disabled:cursor-not-allowed disabled:opacity-40 ${
                  draftDuplicates.length > 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-navy"
                }`}
              >
                {draftDuplicates.length > 0
                  ? "Add anyway"
                  : picking === "new"
                    ? `Create from ${draft.length} parcel${draft.length === 1 ? "" : "s"}`
                    : "Attach to this opportunity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-navy px-5 py-3 text-sm text-shell shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
