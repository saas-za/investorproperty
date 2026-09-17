"use client";

import { useEffect, useState } from "react";

interface ZoneOption {
  value: string;
  label: string;
  family: string;
}

interface BulkHeadroomResult {
  zone: {
    code: string;
    label: string;
    floorFactor: number;
    coverage?: number;
    maxHeightM: number;
    primaryUses: string;
    consentUses: string;
  };
  permittedFloorAreaM2: number;
  proposedFloorAreaM2: number;
  unusedFloorAreaM2: number;
  utilisation: number;
  additionalOpportunities: number;
  coverageWithinLimit?: boolean;
  overBulk: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-ZA");

/**
 * Checks a proposed scheme against what the City of Cape Town's zoning
 * regulations actually permit on the land unit — the question that decides
 * whether an architect's scheme is leaving value on the table, or already
 * needs a departure. Cape Town only; other municipalities set their own
 * limits and none has been transcribed here yet.
 *
 * Deliberately opt-in rather than automatic: most people typing a floor
 * factor already got it from an approved SDP and don't need it re-derived
 * against a table they already satisfied.
 */
export default function CoctZoningCheck({
  grossSiteM2,
  proposedFloorAreaM2,
  averageUnitSizeM2,
  proposedCoverageM2,
}: {
  grossSiteM2: number;
  proposedFloorAreaM2: number;
  averageUnitSizeM2: number;
  proposedCoverageM2?: number;
}) {
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneCode, setZoneCode] = useState("");
  const [result, setResult] = useState<BulkHeadroomResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || zones.length) return;
    fetch("/api/zoning/coct")
      .then((r) => r.json())
      .then((d) => setZones(d.zones ?? []))
      .catch(() => setError("Could not load the zone list"));
  }, [open, zones.length]);

  async function check() {
    if (!zoneCode || grossSiteM2 <= 0) {
      setError("Enter the site area above and choose a zone");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/zoning/coct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoneCode,
          grossSiteM2,
          proposedFloorAreaM2,
          averageUnitSizeM2,
          proposedCoverageM2,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not check that zone");
        setResult(null);
        return;
      }
      setResult(data);
    } catch {
      setError("Could not reach the zoning check");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-gold-deep underline underline-offset-2"
      >
        Check this against Cape Town zoning (GR/GB subzones)
      </button>
    );
  }

  return (
    <div className="mt-3 rounded border border-navy/10 bg-navy/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={zoneCode}
          onChange={(e) => setZoneCode(e.target.value)}
          className="rounded border border-navy/20 px-2 py-1.5 text-xs"
        >
          <option value="">Choose a subzone…</option>
          {zones.map((z) => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={check}
          disabled={loading}
          className="rounded bg-navy px-3 py-1.5 text-xs text-shell disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto text-[11px] text-navy/40 hover:text-navy/60"
        >
          Hide
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-navy/70">
            <span>
              {result.zone.code} permits floor factor {result.zone.floorFactor.toFixed(2)}
              {result.zone.coverage !== undefined && ` · ${(result.zone.coverage * 100).toFixed(0)}% coverage`}
              {" · "}
              {result.zone.maxHeightM.toFixed(0)} m height
            </span>
          </div>
          <details className="rounded border border-navy/10 bg-white/60 px-2.5 py-2">
            <summary className="cursor-pointer text-navy/60">
              Primary and consent uses for {result.zone.code}
            </summary>
            <p className="mt-1.5 text-navy/70">
              <span className="font-medium text-navy">Primary (no application needed):</span>{" "}
              {result.zone.primaryUses}.
            </p>
            <p className="mt-1.5 text-navy/70">
              <span className="font-medium text-navy">Consent use (needs Council approval):</span>{" "}
              {result.zone.consentUses}.
            </p>
          </details>
          <div className="flex justify-between">
            <span className="text-navy/60">Permitted floor space at this zone</span>
            <span className="font-medium text-navy">{fmt(result.permittedFloorAreaM2)} m²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-navy/60">This scheme uses</span>
            <span className="font-medium text-navy">
              {fmt(result.proposedFloorAreaM2)} m² ({(result.utilisation * 100).toFixed(0)}%)
            </span>
          </div>

          {result.overBulk ? (
            <p className="rounded bg-red-50 px-2.5 py-2 text-red-800">
              This scheme exceeds what {result.zone.code} permits by{" "}
              {fmt(Math.abs(result.unusedFloorAreaM2))} m². It needs a departure or a rezoning to
              stand — the figures above are not yet a right the site carries.
            </p>
          ) : result.unusedFloorAreaM2 > 0 ? (
            <p className="rounded bg-amber-50 px-2.5 py-2 text-amber-900">
              {fmt(result.unusedFloorAreaM2)} m² of permitted bulk is unused —
              {averageUnitSizeM2 > 0
                ? ` roughly ${fmt(result.additionalOpportunities)} more units at this average size.`
                : " worth checking whether the scheme is leaving value on the table."}{" "}
              This is exactly what a seller usually does not know they are giving away.
            </p>
          ) : (
            <p className="rounded bg-emerald-50 px-2.5 py-2 text-emerald-900">
              This scheme uses the full permitted floor factor for {result.zone.code}.
            </p>
          )}

          {result.coverageWithinLimit === false && (
            <p className="rounded bg-red-50 px-2.5 py-2 text-red-800">
              The proposed coverage exceeds {result.zone.code}&apos;s limit — independent of the
              floor factor question above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
