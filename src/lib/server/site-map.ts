import "server-only";
import sharp from "sharp";

/**
 * Generates a landscape satellite site-map image — the same 600×350 shape
 * Morné's existing land-opportunity email already sends, but with the
 * parcel's real registered boundary drawn on top instead of a single marker
 * pin. The marker only ever showed *where* a property was; the boundary
 * shows *how much of it*, which is the more useful thing to put in front of
 * a developer.
 *
 * Two calls, composited into one image:
 *   1. A satellite basemap for the bounding box, from Esri's World Imagery
 *      `/export` endpoint (verified working — see docs/GIS_INTEGRATION.md).
 *   2. The parcel boundary, drawn as SVG and rasterised with `sharp`, using
 *      the exact same `rings` the map picker already returns from the
 *      cadastral lookup — no second geometry fetch needed.
 */

const IMAGERY_EXPORT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export";

export interface SiteMapOptions {
  /** One or more parcel boundaries, each a set of [lat, lng] rings. */
  parcels: { rings: [number, number][][] }[];
  /** Falls back to the parcels' own centre when omitted. */
  centre?: { lat: number; lng: number };
  widthPx?: number;
  heightPx?: number;
  /** Padding around the parcel bounds, as a fraction of the bounds' size. */
  paddingFrac?: number;
}

function boundsOf(parcels: SiteMapOptions["parcels"]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of parcels) {
    for (const ring of p.rings) {
      for (const [lat, lng] of ring) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    }
  }

  if (!Number.isFinite(minLat)) throw new Error("No parcel geometry to map");
  return { minLat, maxLat, minLng, maxLng };
}

export async function generateSiteMap(opts: SiteMapOptions): Promise<Buffer> {
  const width = opts.widthPx ?? 600;
  const height = opts.heightPx ?? 350;
  const padding = opts.paddingFrac ?? 0.25;

  const b = boundsOf(opts.parcels);
  const latSpan = Math.max(b.maxLat - b.minLat, 0.0006); // floor: a tiny erf still gets visible padding
  const lngSpan = Math.max(b.maxLng - b.minLng, 0.0006);

  // Pad, then stretch to the image's own aspect ratio so the fetched imagery
  // tile isn't itself distorted — squashing the basemap to fit a mismatched
  // box would make every distance on it a lie.
  let minLat = b.minLat - latSpan * padding;
  let maxLat = b.maxLat + latSpan * padding;
  let minLng = b.minLng - lngSpan * padding;
  let maxLng = b.maxLng + lngSpan * padding;

  const targetAspect = width / height;
  const midLat = (minLat + maxLat) / 2;
  // Longitude degrees shrink toward the poles; correct so the box is square
  // in real metres, not just in raw degrees, before matching the image shape.
  const lngCorrection = Math.cos((midLat * Math.PI) / 180) || 1;
  const currentAspect = ((maxLng - minLng) * lngCorrection) / (maxLat - minLat);

  if (currentAspect < targetAspect) {
    const wantedLngSpan = ((maxLat - minLat) * targetAspect) / lngCorrection;
    const midLng = (minLng + maxLng) / 2;
    minLng = midLng - wantedLngSpan / 2;
    maxLng = midLng + wantedLngSpan / 2;
  } else {
    const wantedLatSpan = ((maxLng - minLng) * lngCorrection) / targetAspect;
    const midLatNow = (minLat + maxLat) / 2;
    minLat = midLatNow - wantedLatSpan / 2;
    maxLat = midLatNow + wantedLatSpan / 2;
  }

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const params = new URLSearchParams({
    bbox,
    bboxSR: "4326",
    imageSR: "4326",
    size: `${width},${height}`,
    format: "png24",
    f: "image",
  });

  const res = await fetch(`${IMAGERY_EXPORT}?${params}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Imagery export returned ${res.status}`);
  const basemap = Buffer.from(await res.arrayBuffer());

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * height;
    return [x, y];
  };

  const polygons = opts.parcels
    .map((p) =>
      p.rings
        .map((ring) => {
          const points = ring.map(([lat, lng]) => project(lat, lng).join(",")).join(" ");
          return `<polygon points="${points}" fill="#0f2740" fill-opacity="0.15" stroke="#c8a45c" stroke-width="3" />`;
        })
        .join(""),
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${polygons}</svg>`;

  return sharp(basemap)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
