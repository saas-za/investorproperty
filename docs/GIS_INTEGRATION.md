# Map-based site selection — verified findings and plan

Written 2026-09-17, in response to Gemini research Morné brought over. Its general shape was
useful — three real data layers (cadastral, spatial, zoning) is the right mental model, and
matches how Lightstone/CMA Info actually work — but one specific technical claim was checked
against reality and corrected, which changes the recommended path.

## What Gemini got right

The three-layer model of how established players (Lightstone, CMA Info) operate is accurate:
deeds records (ownership, price history), Surveyor-General cadastral boundaries, and zoning/AVM
overlays. That framing is worth keeping.

## What Gemini got wrong, and what's verified instead

**Claim:** CapeFarmMapper is built on GeoServer/OpenLayers, queryable via standard WFS.

**Checked, and wrong.** CapeFarmMapper runs on **Esri ArcGIS**, not GeoServer. Its published user
manual documents no REST API, no WFS/WMS endpoint, and no programmatic query method — web
interface only. Two standard ArcGIS services-directory paths on `gis.elsenburg.com` both returned
404. Gemini's specific integration instructions for it were plausible-sounding but not actually
verifiable, and shouldn't be built against without further digging directly with the Western Cape
Department of Agriculture's GIS unit.

**Verified instead — a better source than the one being asked about.** The **Council for
Geoscience** (a national government body, not a Western Cape one) hosts a live, public,
**no-authentication-required** ArcGIS MapServer:

```
https://maps.geoscience.org.za/hosting/rest/services/Administrative_Boundaries_and_Cadastral_Data/MapServer
```

Confirmed by direct query (`/8/query?where=1=1&outFields=*&f=json`), not just by reading its
metadata page — it returns real parcel records:

```json
{
  "PRCL_TYPE": "FP", "GEOM_AREA": 20886.67, "PROVINCE": "EASTERN CAPE",
  "PARCEL_NO": 410, "PORTION": 0, "PRCL_KEY": "E121C112000000000410000000"
}
```

Layers exposed, nationally, all nine provinces:

| Layer | ID | Contents |
|---|---|---|
| SA Erf | 6 | Erven, national |
| Holding | 7 | Smallholdings |
| Farm Portion | 8 | Farm portions — confirmed working above |
| Parent Farm | 9 | Parent farm records |
| + per-province copies of all four | — | One set per province, same schema |

Fields returned per parcel: `PRCL_KEY`, `PRCL_TYPE`, `GEOM_AREA` (m²), `PROVINCE`, `PARCEL_NO`,
`PORTION`, plus polygon geometry. This is exactly what a map click needs to hand to the Desktop
Land Estimate: erf/farm/portion number, size, and location — for free, with no licensing
negotiation, no cost, no CapeFarmMapper reverse-engineering required.

**Why this is the better choice even beyond being verified:** it's national. Boxing site
selection into Cape Farm Mapper's Western Cape-only coverage would have undercut the
municipality-agnostic design already built into the density defaults (see `ROADMAP.md`'s note on
this exact tension with the Oliphantskop model).

## The Deeds Office and municipal-framework findings — plausible, not yet verified

Gemini's guidance on the Deeds Office (Aktex/DeedsWeb, no direct public access, SearchWorks/WinDeed
as the practical aggregator route) and on municipal SDF/zoning updates (no central feed, per-metro
GIS portals, Gazette monitoring as the fallback) is standard, credible advice and matches what's
publicly known about how these systems work. It has not been independently verified the way the
CapeFarmMapper claim was, because there was nothing quick to check — no specific URL or technical
claim to test. Treat it as a reasonable starting brief for the deeds/legal side, not as confirmed
fact, the same caution that applies to anything from an LLM without a source checked against it.

One immediately actionable point from it: **you already pay for SearchWorks.** That's very likely
the fastest path to deeds data — worth a direct question to them about API/bulk access — well
before any conversation with DALRRD about bulk licensing, which is a much longer and more
expensive road for no clear near-term payoff.

## How this connects to what's already built

Three pieces this plugs into, all already done:

1. **`docs/DEVELOPMENT_CHARGES.md`** — the City of Cape Town DC Calculator, fully reverse-engineered:
   six services, demand factors per land use, existing-rights credits. Needs a UI to actually use
   it; the engine and rate tables are already extracted.
2. **`docs/VALUATION_MODEL.md`** — the Oliphantskop (Langebaan) CAPEX model: building cost per m²,
   escalation, professional fees, the full cost cascade. Source workbook confirmed still in
   `reference/` (see top of this response). This is the calibration source for a future building-cost
   engine (Phase 3 in `ROADMAP.md`), not wired into the Desktop Land Estimate yet.
3. **The Desktop Land Estimate itself** — currently takes hectares typed by hand. A map click
   would fill that in automatically, and *also* hand over the parcel's zoning/land-use code, which
   is exactly what the DC engine needs as an input.

## Proposed sequence

1. **Map picker on the Desktop Land Estimate** — `esri-leaflet` (a thin, well-maintained wrapper
   for exactly this kind of Esri MapServer) against the Council for Geoscience service. Click a
   parcel → erf/farm/portion number and area auto-fill the existing hectare field. This is the
   most self-contained piece and doesn't require the other two engines to exist first.
2. **Wire the DC engine into the estimate** — once a parcel and its land use are known, show the
   development charges alongside the land value, using the already-extracted rate tables.
3. **Building-cost overlay from the Oliphantskop calibration** — the larger piece, matches Phase 3
   in `ROADMAP.md`, not scoped in detail yet.

## Open questions

- **CapeFarmMapper specifically** — is Western Cape—specific agricultural detail (soil type, water
  resources) something you actually need beyond what Geoscience's cadastral layer gives you? If
  yes, that's a call to the Department of Agriculture's GIS unit directly, not something to
  reverse-engineer from the outside.
- **SearchWorks API access** — worth asking them directly, given you already have a commercial
  relationship there.
- Does step 1 (map picker) match what you meant by "select the property(s) on the map," or did
  you have a different interaction in mind?
