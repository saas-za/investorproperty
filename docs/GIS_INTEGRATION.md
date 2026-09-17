# Map-based site selection — built, and how it works

Originally written 2026-09-17 as a research note in response to Gemini research Morné brought
over. Rewritten the same day once the map picker was actually built, so this now describes what
exists rather than what was proposed.

## The source, and why this one

**Council for Geoscience**, a national government body, hosts a live, public,
**no-authentication-required** ArcGIS MapServer:

```
https://maps.geoscience.org.za/hosting/rest/services/Administrative_Boundaries_and_Cadastral_Data/MapServer
```

Chosen over CapeFarmMapper, which Gemini recommended. **That recommendation was wrong on the
facts** and the correction is worth keeping: CapeFarmMapper runs on Esri ArcGIS, not GeoServer;
its published user manual documents no REST API, no WFS/WMS endpoint and no programmatic query
method; and two standard ArcGIS services-directory paths on `gis.elsenburg.com` both returned 404.
Gemini's integration instructions for it were plausible-sounding and not verifiable.

Geoscience is also simply the better source: **national coverage**, where CapeFarmMapper is
Western Cape only. Boxing site selection into one province would have undercut the
municipality-agnostic design already built into the density defaults.

## Layers actually used

| Layer | ID | What it gives |
|---|---|---|
| Local Municipality | 1 | `Name` ("City of Cape Town"), `Code` ("CPT"), district, category |
| SA Erf | 6 | Urban erven, national |
| SA Holding | 7 | Smallholdings |
| SA Farm Portion | 8 | Farm portions |
| SA Parent Farm | 9 | Parent farm records |

Parcel layers are tried in that order on a click, because a point falls in exactly one parcel but
which *kind* varies: urban sites are erven, peri-urban ones are agricultural holdings, anything
rural is a farm portion. Erf first, because that is what a development site usually is.

Per-province copies of all four layers also exist (11–53). They are not used — the national
layers already cover everything and switching layer by province would add a lookup for nothing.

The service's spatial reference is **WKID 4148 (Hartebeesthoek94)**. Queries pass `inSR=4326` and
`outSR=4326` and let the server reproject; the difference is sub-metre and irrelevant at parcel
scale.

Verified live, not just read off a metadata page. A click on Cape Town CBD returns:

```json
{
  "parcel": { "label": "Erf 4651", "areaM2": 33342.17, "province": "WESTERN CAPE",
              "registrationDivision": "CAPE TOWN", "key": "WCPTC016000700004651000001" },
  "municipality": { "name": "City of Cape Town", "code": "CPT" },
  "developmentChargesAvailable": true
}
```

## What was built

### `src/lib/server/parcel-lookup.ts`

Server-only. Turns a lat/lng into a parcel plus the municipality governing it. The two queries run
independently via `Promise.allSettled`, because a click is still useful with only one of them.
Responses are cached for a day — the cadastre changes on subdivision, not by the minute, and this
is a free government service that should not be hammered.

Server-side for three reasons, in order: which layers are queried and in what order is worth
keeping (same argument as the valuation engine); it lets a lookup be rate-limited as one unit; and
the browser never has to deal with the upstream being slow or CORS-hostile.

### `src/app/api/parcel/route.ts`

`POST { lat, lng }`. Rate limited to 60/min/IP — generous, because panning a map legitimately
produces a run of clicks; it exists to stop the endpoint being used as a free bulk-scrape proxy.
Rejects points outside South Africa before the round trip. On upstream failure it says so plainly
so the form falls back to typing the area in by hand rather than looking broken.

### `src/components/ParcelMap.tsx`

Leaflet with OpenStreetMap tiles. Click a parcel to select, click it again to deselect — that is
the whole gesture, no modes or modifier keys. Multi-select because a site is often several parcels
being consolidated, and the area handed back is their total.

Leaflet is imported inside an effect rather than at module scope, because it reaches for `window`
at import time. That keeps the page a normal server-rendered route with an interactive island in
it. Scroll-wheel zoom is off so a stray scroll while reading the form doesn't throw the map across
the country.

Address search uses Nominatim (OpenStreetMap's own geocoder — free, no key). It only moves the
map; the parcel still comes from the cadastre on click, so a vague search result costs nothing.

### Where it is wired in

**Desktop Land Estimate** (`/valuation`) — "Pick it on a map instead" above the gross area field.
Selecting parcels overwrites the gross site area and clears the developable split, because a
percentage carried over from a different site is worse than a blank one. The municipality it
resolves is what opens the development charges panel.

**CRM Matrix → Development Land** (`/crm/land`) — "Add from map" creates a new opportunity named
off the cadastre, and each row's expanded drawer can attach or change its parcels. Rows with
confirmed parcels carry a "verified" chip, because *confirmed against the cadastre* is a different
claim from *typed off a listing* and the matrix should show which it is.

Boundaries are deliberately **not** stored on a land row — only the parcel key, label and extent.
A stored polygon goes stale the moment a subdivision registers.

## What this does not give you

- **No zoning.** There is no national zoning layer, and there will not be one — zoning is a
  municipal competence and each scheme differs. Zoning still has to be confirmed with the
  municipality. The CRM says so on the page rather than implying otherwise.
- **No ownership.** That is the Deeds Office, deliberately out of scope for now.
- **Registered extent, not site plan area.** These differ, sometimes materially. The map fills in
  the registered figure and says it may differ from a site plan; the field stays editable.

## Still open

- **SearchWorks API access** — Morné already pays for it, which makes it very likely the fastest
  path to deeds data. Worth a direct question to them, well before any conversation with DALRRD
  about bulk licensing.
- **CapeFarmMapper specifically** — only if Western Cape agricultural detail (soil type, water
  resources) is needed beyond the cadastral layer. That is a call to the Department of
  Agriculture's GIS unit, not something to reverse-engineer from outside.
