# portal.investorproperty.co.za — strategy and architecture

Written 2026-09-15, as a starting position for review. Nothing here is decided; the open
questions at the end are the parts that need Morné's call before building.

## 1. The most important finding: much of this already exists

The instinct is that a developer portal is a build-from-scratch project. It isn't. Across the
Apps Script estate there is already a working, if scattered, developer pipeline:

| Existing asset | Where it lives | What it gives the portal |
|---|---|---|
| Cape Town zoning table — floor factor, height limit, primary and consent uses per code (AG, SR1–2, GR1–6, LB1–2, GB1–2, …) | `New Listing.js`, `ZONING_DATA` | The development-potential half of a valuation, already encoded |
| Cape Farm Mapper paste parser — extracts SG code, LPI code, erf/farm number, area (m²/ha), coordinates | `New Listing.js`, `parseCFMData()` | Site intake without manual typing |
| Multi-erf aggregation — combines several erven into one site, totals area, picks the primary plot | `New Listing.js` | Real sites are rarely one erf; this is already handled |
| Current vs. **proposed** zoning tracking | `New Listing.js` | The rezoning-upside calculation, which is where developer margin actually comes from |
| Reverse geocoding to suburb, static maps | `New Listing.js` | Location context on a valuation report |
| AI listing copy (Gemini) | `New Listing.js`, `generateAIDescription()` | Narrative sections of a generated report |
| Developer contact list, interest tracking, bilingual EN/AF dispatch | `New Listing.js` | The distribution side once a developer is in the funnel |
| Lead lifecycle stages, formatting, email engine | `lead-lifecycle-orchards` (ConveyAssist repo) | CRM behaviour patterns already proven |
| CAPEX / subdivision & rezoning financial model | `PLAN 2 - Oliphantskop Subdivision & Rezoning Plan.xlsm` | **The valuation engine itself, in spreadsheet form** |

The portal is substantially a **consolidation and productisation** of work already done, not a
greenfield build. The single highest-value input is the Oliphantskop workbook — that is the
calculation the portal needs to reimplement in code.

> Blocked on: that file is an `.xlsm` in Drive that can't be read with current access. Dropping
> a copy into this repo unblocks reimplementing the model properly rather than guessing at it.

## 2. Product thesis

A free, login-gated desktop valuation tool is not really a free tool — it is a **qualified lead
generator**. A developer who signs up and models a site has told you, in order: who they are,
what area they're buying in, what site size and zoning they're targeting, what build cost and
revenue assumptions they hold, and whether the deal worked. That is a far richer lead than any
contact form, and it arrives continuously rather than once.

The funnel that follows is the actual business:

```
Free desktop valuation  →  developer identified + intent captured
        ↓
Land listings (you already originate these)  →  matched to their stated criteria
        ↓
They buy and develop
        ↓
Sales + transfer management  →  the CW/DW platform (ConveyAssist / Propello)
```

Each stage feeds the next, and the free tool is what makes the top of it wide. That is the
"one-stop shop": not a bigger brochure site, but the developer's working tools living where
your deal flow already is.

## 3. Architecture: leave HubSpot alone, build beside it

**Recommendation: do not migrate the marketing site off HubSpot to build the portal.** They are
different problems and coupling them delays the valuable one.

```
www.investorproperty.co.za     →  HubSpot CMS  (unchanged — marketing, blog, forms, CRM)
portal.investorproperty.co.za  →  Next.js on Vercel  (new — the product)
```

A `CNAME` on the `portal` subdomain pointed at Vercel is all the DNS change required; HubSpot's
records for the apex and `www` are untouched, so there is no migration risk and no content
freeze. HubSpot remains the system of record for contacts — the portal writes into it rather
than replacing it.

Why not build the portal *inside* HubSpot: HubSpot CMS can host gated content and forms, but a
multi-step calculation tool with saved state per user, versioned scenarios and PDF report
generation is an application, not a landing page. Building it in HubSpot means fighting the
platform on every feature and being unable to move later. Building it separately costs nothing
extra now and keeps every option open.

The marketing site *does* eventually move off HubSpot (§9.6) — but it should move **after** the
portal exists, not before, and onto the foundation the portal establishes. Sequencing it this way
means the migration inherits a design system, component library and deployment pipeline that are
already proven in production, instead of being a from-scratch rebuild that delays the portal.

## 4. Auth and data

The requirement is "free, but you must log in." That means real accounts, just no payment.

**Recommendation: Supabase** — it provides authentication, a Postgres database and file storage
in one service with a free tier that comfortably covers early usage.

The reasoning over the alternatives: Clerk has better auth ergonomics but is *only* auth, so a
database is still needed alongside it. NextAuth is free but leaves session storage, user tables
and password reset flows as your problem. Supabase covers auth and the database the valuations
must be saved to anyway, and because the database is plain Postgres there is no lock-in — it can
be moved to any Postgres host later without rewriting the data layer.

Rough initial shape:

- `profiles` — user, company, role (developer / agent / other), phone
- `sites` — erf/LPI details, area, coordinates, current and proposed zoning
- `valuations` — a saved scenario against a site: assumptions in, results out, versioned so a
  developer can compare scenarios rather than overwrite them
- `assumption_defaults` — build cost per m², professional fees percentage, bulk contributions,
  finance rate, target profit margin. Seeded with sensible South African defaults and
  overridable per user, so the first run produces a credible number with zero input.

## 5. The valuation engine

The calculation developers actually need is **residual land value** — working backwards from
what the finished development sells for to what the land can be paid for:

```
  Gross development value   (sellable m² × achievable rate/m²)
– Construction cost         (build m² × cost/m²)
– Professional fees         (% of build)
– Statutory costs           (rezoning, subdivision, bulk services contributions)
– Marketing and commission
– Finance cost              (over the development period)
– Developer profit          (target margin on cost or GDV)
─────────────────────────────
= Residual land value       ← what the site is worth to this developer
```

Then the headline output: **residual land value vs. asking price** — viable, marginal or not
viable, with the gap quantified.

The zoning table supplies the top line almost entirely: floor factor × site area gives bulk
m², the height limit constrains storeys, and permitted uses determine what can be sold. This is
why the existing `ZONING_DATA` matters so much — it turns "an erf in Langebaan" into "14,000 m²
of sellable bulk" without the developer supplying anything.

The rezoning case runs the same calculation twice — once at current zoning, once at proposed —
and the difference is the rezoning upside, which is the number that actually motivates a
developer to act.

**The Oliphantskop workbook should be treated as the specification for this section.** The
assumption lines, cost categories and percentages in it are real and already trusted; the
portal's job is to reimplement them, not reinvent them.

## 6. HubSpot integration — the payoff

On signup and on each completed valuation, the portal should write to HubSpot via its API from
a server-side route:

- create or update the contact, with company and role
- record custom properties: area of interest, typical site size, target zoning, last valuation
  date, number of valuations run, whether their last deal was viable

That last set is what makes the portal pay for itself: your CRM stops holding names and starts
holding **intent**. A developer who ran three valuations in Langebaan this month is a call worth
making; a contact-form submission from 2024 is not.

This also means the free tool needs no upsell mechanics inside it. The upsell happens in HubSpot,
by a human, with context.

## 7. The platform link (ConveyAssist / Propello)

The naming isn't settled, so nothing should hardcode it. `src/config/platform.ts` holds the
name, tagline and URL in one place, plus an `enabled` flag that currently hides the reference
entirely — turn it on once the name is decided and the destination page exists.

On placement: a "powered by" in the footer undersells it. The stronger position is a contextual
handoff at the point the developer has just concluded a deal is viable — that is precisely when
"and when you're ready to sell the units, here's how that's handled" is useful rather than
promotional. That can wait until the valuation flow exists.

## 8. Suggested build order

1. **Auth + account shell.** Sign-up, sign-in, profile, HubSpot contact sync. The lead capture
   starts working from day one, before the calculator is finished.
2. **Zoning lookup.** Port `ZONING_DATA` to TypeScript, expose it as a simple "what can I build
   here" lookup. Useful standalone, and it is the calculator's foundation.
3. **The valuation engine.** Reimplement the Oliphantskop model. Save scenarios per user.
4. **The report.** Branded PDF export — this is what gets forwarded to partners and lenders, so
   it carries the brand further than the site does.
5. **Community feedback board.** Idea submission, upvoting, status. Cheap to build, and it starts
   collecting direction from real users while the deeper features are still being built.
6. **Site intake from Cape Farm Mapper.** Port `parseCFMData()` so a developer pastes rather
   than types.
7. **Comparable sales evidence.** Auto-populate achievable selling rates from the deeds and
   Property24 data already collected (`VALUATION_MODEL.md` §9).
8. **Land listings.** Surface the deal flow already being originated, matched to the criteria
   the valuations revealed.

Stages 1–2 are a genuinely useful free product on their own, which matters — it means there is
something to launch before the hard part is finished.

## 9. Decisions taken (2026-09-15)

1. **The Oliphantskop workbook** — delivered and parsed. Full analysis in
   [`VALUATION_MODEL.md`](./VALUATION_MODEL.md). It is a professional-grade appraisal at real
   scale (79 ha, R200m land, R2bn build, 21 phases) and is now the engine's specification.
2. **Geographic scope: City of Cape Town only for v1**, other municipalities added later.
   ⚠️ *This collides with the worked example* — Oliphantskop is West Coast District Municipality,
   using `Residential I/II/III` designations and **density (units/ha)**, whereas the Cape Town
   zoning table uses `SR1/GR1/…` and **floor factor**. See `VALUATION_MODEL.md` §8: supporting
   both metrics from the start costs very little and avoids v1 being unable to run your own
   flagship model. Recommended.
3. **Monetisation: the valuation tool is not the product.** Revenue comes from ConveyAssist —
   a setup fee plus pay-as-you-go — targeting the **document production gap**, which is the
   identified market opening. This settles the "how much do you give away" question decisively:
   **give the valuation away generously.** Its job is to put qualified developers in front of the
   document-production offering, so holding features back to protect the model works against the
   actual revenue line. The IP worth protecting is the calibrated assumption set, not the
   calculator.
4. **Audience: open to anyone**, with a **community feedback board** — developers and other users
   post ideas for upgrades. Worth treating as a real feature rather than a comment box: public
   idea submission, upvoting, and status (`considered` / `planned` / `shipped`). Two payoffs
   beyond the feedback itself — it signals an actively-developed product, and it is a continuous,
   self-selecting source of exactly the feature requests worth building.
5. **Name: Propello preferred**, but the domain was renewed by its current holder while the site
   sits dormant. Nothing here blocks on it — `src/config/platform.ts` keeps the name in one place
   behind a disabled flag. Worth a backorder/broker approach on the domain in parallel, since a
   dormant-but-renewed domain sometimes lapses later.
6. **The marketing site does eventually move off HubSpot.** The goal is a strong site on a
   foundation you own, without a "powered by HubSpot" badge. This does not change the sequencing
   recommendation in §3 — portal first, on its own subdomain — but it does change the endgame:
   the portal becomes the foundation the marketing site is later rebuilt *onto*, rather than a
   separate satellite. Practically, that means design tokens, component library and layout
   primitives built for the portal should be built as if the marketing site will reuse them,
   because it will.

## 10. Still open

- **Non-sellable land ratio** (`VALUATION_MODEL.md` §6) — how much of this does the free tool ask
  the user to supply, versus estimate from a default? It is one of the biggest viability drivers.
- **Comparable sales data** (`VALUATION_MODEL.md` §9) — you hold four years of Full Title and
  Sectional Title deeds evidence plus competitor benchmarks. Auto-populating achievable selling
  rates from it would be the single strongest feature, but it needs a decision on whether that
  data is shared, and at what granularity.
- **Appraisal vs. residual mode** — both are needed (`VALUATION_MODEL.md` §7); which one is the
  default landing experience?
