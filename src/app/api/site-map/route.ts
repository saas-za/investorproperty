import { NextResponse } from "next/server";
import { generateSiteMap } from "@/lib/server/site-map";
import { callerKey, rateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * Landscape satellite site-map, parcel boundary highlighted — see
 * `site-map.ts` for why this replaces a single marker pin.
 *
 *   POST /api/site-map
 *   { "parcels": [{ "rings": [[[lat,lng], ...]] }], "width": 600, "height": 350 }
 *
 * Returns the PNG bytes directly, not JSON — the caller wants an image,
 * whether that's an `<img>` tag on screen or an inline attachment on an
 * outbound email.
 */
export async function POST(request: Request) {
  if (rateLimited("site-map", callerKey(request), 30)) {
    return NextResponse.json({ error: "Too many requests — try again shortly" }, { status: 429 });
  }

  let body: {
    parcels?: { rings: [number, number][][] }[];
    width?: number;
    height?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.parcels) || body.parcels.length === 0) {
    return NextResponse.json({ error: "At least one parcel with rings is required" }, { status: 400 });
  }

  try {
    const png = await generateSiteMap({
      parcels: body.parcels,
      widthPx: body.width,
      heightPx: body.height,
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Boundaries don't move by the minute; a day of caching keeps a
        // repeated view of the same site off the imagery service entirely.
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not generate the site map" },
      { status: 502 },
    );
  }
}
