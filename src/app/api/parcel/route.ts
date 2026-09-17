import { NextResponse } from "next/server";
import { lookupParcel } from "@/lib/server/parcel-lookup";
import { callerKey, rateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/** Roughly South Africa's bounding box, including the Prince Edward Islands. */
const BOUNDS = { minLat: -47.5, maxLat: -22, minLng: 16, maxLng: 39 };

/**
 * Resolve a map click into a cadastral parcel.
 *
 *   POST /api/parcel  { "lat": -33.9249, "lng": 18.4241 }
 *
 * A generous limit: one click is one call, and panning a map around a site
 * legitimately produces a run of them. It is here to stop this endpoint being
 * used as a free proxy to bulk-scrape the cadastre, not to ration normal use.
 */
const MAX_PER_MINUTE = 60;

export async function POST(request: Request) {
  if (rateLimited("parcel", callerKey(request), MAX_PER_MINUTE)) {
    return NextResponse.json({ error: "Too many lookups — try again shortly" }, { status: 429 });
  }

  let body: { lat?: unknown; lng?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }
  // The service is national, so a click outside South Africa can only ever come
  // back empty. Refusing early keeps a pointless round trip off a free service.
  if (
    lat < BOUNDS.minLat ||
    lat > BOUNDS.maxLat ||
    lng < BOUNDS.minLng ||
    lng > BOUNDS.maxLng
  ) {
    return NextResponse.json(
      { error: "That point is outside South Africa — the cadastral service is national only" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await lookupParcel(lat, lng));
  } catch (e) {
    // The upstream is a free government service with no uptime guarantee. Say
    // so plainly so the form falls back to typing the area in by hand rather
    // than looking broken.
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.name === "TimeoutError"
            ? "The cadastral service timed out — enter the area by hand"
            : "The cadastral service is unavailable — enter the area by hand",
      },
      { status: 503 },
    );
  }
}
