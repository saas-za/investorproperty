import "server-only";

/**
 * Cadastral lookup against the Council for Geoscience's public ArcGIS service.
 *
 * Verified working against the live service — see `docs/GIS_INTEGRATION.md` for
 * how this source was chosen over CapeFarmMapper. National coverage, no
 * authentication, no licence.
 *
 * It runs server-side for three reasons, in order of importance:
 *
 *  1. Which layers are queried, in what order, and how a parcel is turned into
 *     a municipality is the part worth keeping — the same reasoning that keeps
 *     the valuation engine off the client.
 *  2. It lets one lookup be rate-limited as one unit rather than the browser
 *     hammering a free government service.
 *  3. The browser never has to deal with the service being CORS-hostile or
 *     slow; a failure here degrades to "type the area in by hand".
 */

const BASE =
  "https://maps.geoscience.org.za/hosting/rest/services/Administrative_Boundaries_and_Cadastral_Data/MapServer";

/**
 * National layers, tried in this order. A point falls in exactly one cadastral
 * parcel, but which *kind* varies: urban sites are erven, peri-urban ones are
 * agricultural holdings, and anything rural is a farm portion. Erf first
 * because that is what a development site usually is.
 */
const PARCEL_LAYERS = [
  { id: 6, kind: "Erf" },
  { id: 7, kind: "Holding" },
  { id: 8, kind: "Farm portion" },
  { id: 9, kind: "Parent farm" },
] as const;

const MUNICIPALITY_LAYER = 1;

const TIMEOUT_MS = 12_000;

export type ParcelKind = (typeof PARCEL_LAYERS)[number]["kind"];

export interface Parcel {
  /** Surveyor-General's 26-character parcel key — the stable identifier. */
  key: string;
  kind: ParcelKind;
  /** Erf 4651, or Farm 512 Portion 3. Built for reading, not for matching. */
  label: string;
  parcelNo: number | null;
  portion: number | null;
  /** Registered extent in m², straight from the cadastral geometry. */
  areaM2: number;
  areaHa: number;
  province: string;
  /** Cadastral administrative district ("CAPE TOWN"), not the municipality. */
  registrationDivision: string;
  /** Sectional scheme name, when the parcel is one. */
  schemeName?: string;
  /** Boundary as [lat, lng] rings, ready for Leaflet without conversion. */
  rings: [number, number][][];
}

export interface Municipality {
  /** "City of Cape Town". */
  name: string;
  /** "CPT" — what the development-charge rate set is keyed on. */
  code: string;
  district: string;
  category: string;
}

export interface ParcelLookup {
  parcel: Parcel | null;
  municipality: Municipality | null;
  /** True when the municipality has a development-charge rate set loaded. */
  developmentChargesAvailable: boolean;
}

/** Municipalities whose DC rate tables have actually been extracted. */
const DC_MUNICIPALITIES = new Set(["CPT"]);

async function arcgis(
  layer: number,
  lng: number,
  lat: number,
  outFields: string,
  returnGeometry: boolean,
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    returnGeometry: String(returnGeometry),
    outSR: "4326",
    f: "json",
  });

  const res = await fetch(`${BASE}/${layer}/query?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // The cadastre changes on subdivision, not by the minute. A day of cache
    // keeps a repeated click off a free government service entirely.
    next: { revalidate: 86_400 },
  });

  if (!res.ok) throw new Error(`Cadastral service returned ${res.status}`);

  const json = (await res.json()) as {
    error?: { message?: string };
    features?: { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }[];
  };

  // ArcGIS reports failures inside a 200 response, so the status check above
  // is not enough on its own.
  if (json.error) throw new Error(json.error.message ?? "Cadastral query failed");

  return (json.features ?? []).map((f) => ({ ...f.attributes, __rings: f.geometry?.rings }));
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function describe(kind: ParcelKind, parcelNo: number | null, portion: number | null) {
  if (parcelNo === null) return kind;
  const base = `${kind} ${parcelNo}`;
  // Portion 0 means the whole parcel — printing "Portion 0" reads as an error
  // to anyone who works with title deeds.
  return portion ? `${base} Portion ${portion}` : base;
}

/** Esri rings are [lng, lat]; Leaflet wants [lat, lng]. */
function toLeafletRings(rings: unknown): [number, number][][] {
  if (!Array.isArray(rings)) return [];
  return (rings as number[][][]).map((ring) =>
    ring
      .filter((p) => Array.isArray(p) && p.length >= 2)
      .map((p) => [p[1], p[0]] as [number, number]),
  );
}

async function findParcel(lng: number, lat: number): Promise<Parcel | null> {
  for (const layer of PARCEL_LAYERS) {
    const rows = await arcgis(
      layer.id,
      lng,
      lat,
      "PRCL_KEY,PRCL_TYPE,GEOM_AREA,PROVINCE,MIN_REGION,PARCEL_NO,PORTION,SS_NAME",
      true,
    );
    const row = rows[0];
    if (!row) continue;

    const areaM2 = num(row.GEOM_AREA) ?? 0;
    const parcelNo = num(row.PARCEL_NO);
    const portion = num(row.PORTION);

    return {
      key: str(row.PRCL_KEY),
      kind: layer.kind,
      label: describe(layer.kind, parcelNo, portion),
      parcelNo,
      portion,
      areaM2,
      areaHa: areaM2 / 10_000,
      province: str(row.PROVINCE),
      registrationDivision: str(row.MIN_REGION),
      schemeName: str(row.SS_NAME) || undefined,
      rings: toLeafletRings(row.__rings),
    };
  }
  return null;
}

async function findMunicipality(lng: number, lat: number): Promise<Municipality | null> {
  const rows = await arcgis(
    MUNICIPALITY_LAYER,
    lng,
    lat,
    "Name,Code,District_Name,CAT2",
    false,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    name: str(row.Name),
    code: str(row.Code),
    district: str(row.District_Name),
    category: str(row.CAT2),
  };
}

/**
 * Resolve a map click into a parcel and the municipality that governs it.
 *
 * The two queries are independent, and a click is still useful with only one of
 * them, so a failure on either side does not sink the other.
 */
export async function lookupParcel(lat: number, lng: number): Promise<ParcelLookup> {
  const [parcelResult, muniResult] = await Promise.allSettled([
    findParcel(lng, lat),
    findMunicipality(lng, lat),
  ]);

  const parcel = parcelResult.status === "fulfilled" ? parcelResult.value : null;
  const municipality = muniResult.status === "fulfilled" ? muniResult.value : null;

  if (parcelResult.status === "rejected" && muniResult.status === "rejected") {
    throw new Error("The cadastral service did not respond");
  }

  return {
    parcel,
    municipality,
    developmentChargesAvailable: municipality
      ? DC_MUNICIPALITIES.has(municipality.code)
      : false,
  };
}
