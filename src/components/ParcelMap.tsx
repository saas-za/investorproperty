"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Map as LeafletMap, Polygon as LeafletPolygon } from "leaflet";

export interface SelectedParcel {
  key: string;
  label: string;
  areaM2: number;
  areaHa: number;
  province: string;
  registrationDivision: string;
  rings: [number, number][][];
}

export interface Municipality {
  name: string;
  code: string;
  district: string;
  category: string;
}

interface Props {
  /** Parent owns the selection — the estimate and the CRM do different things with it. */
  selected: SelectedParcel[];
  onChange: (parcels: SelectedParcel[], municipality: Municipality | null) => void;
  /** One parcel for the CRM's land record; several for a consolidated site. */
  multiple?: boolean;
  className?: string;
}

/** Cape Town. Any South African city would do; a site is usually a search away. */
const DEFAULT_CENTRE: [number, number] = [-33.9249, 18.4241];

const NAVY = "#0f2740";
const GOLD = "#c8a45c";

export default function ParcelMap({
  selected,
  onChange,
  multiple = true,
  className = "",
}: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const shapes = useRef<Map<string, LeafletPolygon>>(new Map());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const mapId = useId();

  // `selected` is read inside the click handler, which is registered once. A
  // ref keeps that handler looking at the current selection without tearing
  // the map down and rebuilding it on every change.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Leaflet reaches for `window` at import time, so it cannot be bundled into
  // the server render. Importing it inside an effect is what keeps this page a
  // normal server-rendered route with an interactive island in it.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !holder.current || map.current) return;

      const m = L.map(holder.current, {
        center: DEFAULT_CENTRE,
        zoom: 15,
        // A stray scroll while reading the form should not throw the map
        // across the country. Ctrl+scroll and the +/− buttons still zoom.
        scrollWheelZoom: false,
      });

      // Satellite by default. On undeveloped land a street map shows almost
      // nothing — no roads, no buildings, no way to tell one blank rectangle
      // from the next — and undeveloped land is the whole point of the tool.
      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
      );
      const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      });
      // Place names over imagery — without them satellite view is beautiful
      // and unnavigable.
      const labels = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "" },
      );

      satellite.addTo(m);
      labels.addTo(m);
      L.control
        .layers({ Satellite: satellite, "Street map": streets }, {}, { position: "topright" })
        .addTo(m);

      // The label overlay belongs to imagery, not to streets, which draw their
      // own. Swapping base layers has to take it with them.
      m.on("baselayerchange", (e: { name?: string }) => {
        if (e.name === "Satellite") labels.addTo(m);
        else labels.remove();
      });

      m.on("click", async (e: { latlng: { lat: number; lng: number } }) => {
        setError(null);
        setBusy(true);
        try {
          const res = await fetch("/api/parcel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }),
          });
          const data = await res.json();

          if (!res.ok) {
            setError(data.error ?? "Lookup failed");
            return;
          }
          if (!data.parcel) {
            setError("No registered parcel at that point — try inside the boundary");
            return;
          }

          const parcel = data.parcel as SelectedParcel;
          const already = selectedRef.current.some((p) => p.key === parcel.key);

          // Clicking a selected parcel again removes it. That is the whole
          // deselect gesture — no separate mode, no modifier key.
          const next = already
            ? selectedRef.current.filter((p) => p.key !== parcel.key)
            : multiple
              ? [...selectedRef.current, parcel]
              : [parcel];

          onChangeRef.current(next, data.municipality ?? null);
        } catch {
          setError("Could not reach the cadastral service");
        } finally {
          setBusy(false);
        }
      });

      map.current = m;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      shapes.current.clear();
    };
  }, [multiple]);

  // Draw whatever the parent says is selected. Keyed by parcel key so a
  // re-render does not redraw polygons that have not changed.
  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      const m = map.current;
      if (cancelled || !m) return;

      const live = new Set(selected.map((p) => p.key));
      for (const [key, shape] of shapes.current) {
        if (!live.has(key)) {
          shape.remove();
          shapes.current.delete(key);
        }
      }

      for (const parcel of selected) {
        if (shapes.current.has(parcel.key) || parcel.rings.length === 0) continue;
        // Bright stroke, barely-there fill. Over satellite imagery a heavy
        // fill hides the very ground someone is trying to look at.
        const shape = L.polygon(parcel.rings, {
          color: GOLD,
          weight: 3,
          fillColor: NAVY,
          fillOpacity: 0.12,
        })
          .addTo(m)
          .bindTooltip(
            `${parcel.label} · ${Math.round(parcel.areaM2).toLocaleString("en-ZA")} m²`,
            { sticky: true },
          );
        shapes.current.set(parcel.key, shape);
      }

      // Frame everything selected, but only once there is something to frame —
      // fitting to a single click would zoom in hard enough to lose context.
      const drawn = [...shapes.current.values()];
      if (drawn.length > 0) {
        const bounds = drawn.reduce(
          (acc, s) => (acc ? acc.extend(s.getBounds()) : s.getBounds()),
          null as ReturnType<LeafletPolygon["getBounds"]> | null,
        );
        if (bounds) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected, ready]);

  /**
   * Nominatim is OpenStreetMap's own geocoder — free, no key, and asks only
   * that it is not hammered. It just moves the map; the parcel still comes
   * from the cadastre on click, so a vague search result costs nothing.
   */
  async function locate(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q || !map.current) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(q)}`,
      );
      const hits = (await res.json()) as { lat: string; lon: string }[];
      if (!hits.length) {
        setError(`Nothing found for "${q}"`);
        return;
      }
      map.current.setView([Number(hits[0].lat), Number(hits[0].lon)], 17);
    } catch {
      setError("Address search is unavailable — pan the map instead");
    } finally {
      setSearching(false);
    }
  }

  const totalM2 = selected.reduce((s, p) => s + p.areaM2, 0);

  return (
    <div className={className}>
      <form onSubmit={locate} className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a suburb or street — then click the parcel"
          aria-label="Search for a place"
          className="flex-1 rounded border border-navy/20 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching || !search.trim()}
          className="rounded bg-navy px-4 py-2 text-sm text-shell disabled:opacity-40"
        >
          {searching ? "Finding…" : "Find"}
        </button>
      </form>

      <div className="relative mt-2">
        <div
          id={mapId}
          ref={holder}
          className="h-[380px] w-full rounded border border-navy/20 bg-navy/5"
        />
        {busy && (
          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded bg-navy px-3 py-1.5 text-xs text-shell shadow">
            Looking up the parcel…
          </div>
        )}
        {!ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-navy/40">
            Loading map…
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {selected.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {selected.map((p) => (
            <div
              key={p.key}
              className="flex items-center gap-3 rounded border border-navy/10 bg-navy/[0.03] px-3 py-2 text-xs"
            >
              <span className="font-medium text-navy">{p.label}</span>
              <span className="text-navy/60">
                {Math.round(p.areaM2).toLocaleString("en-ZA")} m² ·{" "}
                {p.areaHa.toFixed(4)} ha
              </span>
              <span className="truncate text-navy/40">{p.registrationDivision}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x.key !== p.key), null)}
                className="ml-auto text-navy/40 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
          {selected.length > 1 && (
            <div className="px-3 pt-1 text-xs font-medium text-navy">
              {selected.length} parcels · {Math.round(totalM2).toLocaleString("en-ZA")} m² ·{" "}
              {(totalM2 / 10_000).toFixed(4)} ha
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-navy/50">
          Click inside a property to pull its {multiple ? "erf or farm number" : "erf number"} and
          registered extent from the national cadastre.
          {multiple && " Click more than one to consolidate a site."}
        </p>
      )}

      <p className="mt-2 text-[11px] text-navy/35">
        Cadastral boundaries: Council for Geoscience. Registered extent is the surveyed figure and
        may differ from what a site plan shows.
      </p>
    </div>
  );
}
