# Build roadmap — Investor Property developer portal

Written 2026-09-16 after working through the Oliphantskop residential model, the Cape Town
Industrial serviced-plot model, and the Prodigious QS viability report for Eikezicht.

---

## 1. The positioning insight everything else follows from

> *"Sellers are subjective and developers objective, and my job as broker is to close the gap
> in between them."*

That sentence is the product. Not a calculator — **an objectivity engine that closes the gap
between what a seller hopes and what a developer can defend.**

It implies a feature no competitor has, because they build for one side only: run the same
valuation from both directions.

- **To the developer:** here is the maximum you can pay and still make your margin.
- **To the seller:** here is what a developer will objectively pay, and here is why your asking
  price is above or below it.

The Cape Town Industrial model already does exactly this — it starts from `Seller Expectation
R1.6bn` and works down to whether that price leaves anything on the table (it leaves
R134,793,636, so the ask is defensible but tight). That is the broker's conversation, encoded.

This also resolves the "how much do I give away" tension. The calculator being free is what makes
it credible as a neutral arbiter. A tool the seller believes is talking its own book is worthless
for closing the gap.

---

## 2. Three valuation methods — the domain model

You described three. They are not alternatives to be chosen between; they are three views of one
model, and the tool should run all three and show where they disagree. Disagreement between
methods *is* the insight.

### Method A — Opportunity (fast, top-down)

```
land value = unit selling price × opportunities × status %
opportunities = density (units/ha) × net developable hectares
```

Density guidance, from you:

| Product | Density (units/ha) |
|---|---|
| Single residential | 30 |
| Town housing / semi-detached | 50 |
| Apartments — standard | 80 |
| Apartments — dense / urban edge | 100–120 |
| Apartments — City of Cape Town, high-density zoning | 120+ |

**Status ladder** — the percentage of unit value attributable to the raw opportunity:

| Status | % of unit price |
|---|---|
| Raw agricultural land | 5–8% |
| Approval process begun, not granted | 10% |
| Approval granted for X opportunities | 12% |
| Zoned, SDP approved | 15% |

Worked: a R1,000,000 apartment at 80 units/ha on raw agri land → R50k–R80k per opportunity →
**R4m–R6.4m per hectare**. Zoned with SDP approved → R150k × 80 = **R12m per hectare**.

That ladder is the single most commercially valuable thing in this document. It converts
"planning risk" into a number, which is exactly what developers cannot do on the back of an
envelope and what sellers systematically get wrong.

### Method B — Residual (bottom-up, defensible)

```
gross realisation  (what the finished product sells for)
− building cost
− servicing cost
− professional fees
− VAT
− commission & marketing
− finance / cost of capital
− developer profit
− misc / contingency
─────────────────────────
= maximum land value
```

### Method C — Seller-price test

Take the asking price, run A or B, report the gap. Output is a verdict, not a number: *the ask is
X% above/below what the land can carry.*

### Why counting units beats density × opportunity cost

Your point, and the models prove it: **density assumes you can build on all the land, and you
never can.**

- Oliphantskop: Phase 14 alone carries 385,115 m² of nature area
- Cape Town Industrial: **only 64% of total area is sellable** — 3,336,694 m² gross vs 2,145,800 m²
  sellable, the rest being UT (utility), TR1/TR2 (transport), OS2 (open space)

So net developable area is a **required input, not an optional refinement**. Method A must run on
net hectares, and the tool should default the gross-to-net ratio conservatively (~65%) and say so
loudly, rather than silently assuming 100%.

---

## 3. The architecture decision you asked for: split services from building

This is correct and it is the most important structural call in the build. Two independent
engines, composed:

```
        ┌─────────────────────┐        ┌─────────────────────┐
RAW  →  │  SERVICING ENGINE   │  →  SERVICED  →  │ BUILDING ENGINE │  →  BUILT
LAND    │  civils, bulk       │     PLOTS       │ construction,   │     PRODUCT
        │  contributions,     │                 │ prof fees,      │
        │  BICLs & rebates    │                 │ escalation, VAT │
        └─────────────────────┘        └─────────────────────┘
                  ↓                                      ↓
          EXIT: sell serviced plots          EXIT: sell completed units
```

Your two spreadsheets are precisely these two cases:

| | Cape Town Industrial | Oliphantskop |
|---|---|---|
| Servicing engine | ✅ R500/m² internal services, BICLs from COCT DC Calculator | ✅ Services Estimate sheet |
| Building engine | ❌ none — plots sold vacant | ✅ 21 phase CAPEX sheets |
| Exit | Serviced plots | Built units (and a parallel serviced-land option) |

Splitting them buys three things at once: industrial/commercial land works without pretending
there's a building, plot-sale-only developers are served, and residential build-out becomes
"servicing + building" rather than a separate model.

### Servicing engine inputs (from the industrial model)

- Internal services per m² (R500/m² used)
- Bulk services contribution — **BICLs**, from the City of Cape Town DC Calculator
- **BICL rebate** — credit for infrastructure you install yourself. Large: R1.19bn rebate against
  R1.76bn servicing cost. Ignoring the rebate overstates cost by ~65%.
- Floor factor and coverage per land use (RI: FF 2.0, coverage 75%; GI1: FF 1.5, coverage 75%)
- Gross-to-net sellable ratio

### Building engine inputs (from Oliphantskop + Eikezicht)

Building cost/m², parking, boundary walls, electrical, landscaping, contingency (3%), escalation
(pre-contract and during construction, with cash-flow factor), professional fees (structural,
architect, civil @ 8%, surveyor), NHBRC, plan scrutiny, sectional title register, agent commission
(3.5–4.25%), marketing, VAT and input tax credits.

---

## 4. Cost of capital — the thing that trips developers

You flagged this as the killer, and the three source documents show three levels of rigour. This
is a natural product ladder.

| Level | Method | Source | Tier |
|---|---|---|---|
| 1 | Rate × period × cash-flow factor | Oliphantskop (12%, factor 0.51) | Free |
| 2 | Capitalised interest off a cash-flow schedule | Eikezicht (9.5% → R14.29m) | Free |
| 3 | Full facility model — draw schedule, daily accrual, capital repayment ladder, prime + premium + penalty | Cape Town Industrial (prime 10.5%, actual facility prime+6%) | Paid |

The industrial model's repayment ladder is worth encoding as a default, because it reflects how
these facilities are actually structured:

| Years | Capital repayment % p.a. |
|---|---|
| 1–2 | 0% |
| 3–4 | 5% |
| 5–6 | 10% |
| 7–8 | 15% |
| 9–10 | 20% |
| 11–12 | Remaining balance amortised equally |

Over 12 years that cost R177,972,547 in interest on a R200m facility — **89% of the facility
amount**. That single number, shown to a developer early, justifies the whole tool.

The cash-flow factor concept matters and is easy to get wrong: costs are incurred progressively,
so charging finance on the full amount for the full period materially overstates cost. Level 1
must implement the factor, not skip it.

---

## 5. The output: what "done" looks like

The Prodigious report for Eikezicht is the target artefact. Its structure:

- **Section A** — executive summary: land, improvements, general costs, capitalised interest, VAT,
  total capital cost, VAT credit, net income from sales, **return on investment (17%)**
- **Section C** — land and improvement cost, broken down by phase
- **Section D** — general costs, split **non-taxable** (rates during construction, NHBRC) vs
  **taxable** (plan scrutiny, development contributions, connection fees, legal, sectional title
  register, commission @3.5%, levies), plus finance charges
- **Section F** — **per-unit cost allocation**: every unit carries its share of land, mortgage
  registration, builder's works, contingency, professional fees, general costs and finance,
  ending in a **recommended selling price per unit**

Section F is the "count the units" method you described, done properly. It is also the most
useful screen in the product, because it is the one a developer acts on.

**The positioning is precise: this is the desktop pre-check before you commission the QS.** Not a
replacement for Prodigious — the thing that tells you whether it's worth paying Prodigious. Say
that explicitly in the product; it defuses professional objections and is honestly what it is.

---

## 6. Competitive position vs. SIMS (red-i)

SIMS is transaction management — the downstream half, and the same ground Propello will occupy.
Your read that it's too complex is the opening, and it comes from a real place: you are building
as an agent who works in the field, they built as software people.

Two things follow:

1. **Don't compete on features, compete on time-to-first-value.** SIMS makes you configure a
   system before it does anything. If a developer gets a defensible land value in 60 seconds
   without a demo call, that's a different category of product.
2. **Your funnel is upstream of theirs.** They enter at "I have a development to sell." You enter
   at "should I buy this land at all" — a full stage earlier, and the stage where the developer
   forms their trusted relationship. By the time SIMS is relevant, you're already incumbent.

The risk to watch honestly: your system will get complex too, because the domain is complex. The
defence is the free tool staying ruthlessly simple — four inputs, one number — with depth behind
progressive disclosure rather than on the first screen.

---

## 7. Roadmap

### Phase 0 — Foundation
- [ ] Supabase project: auth (email + Google), `profiles` table
- [ ] Sign-up / sign-in / account shell on the existing brand
- [ ] HubSpot contact sync on signup (server route, custom properties for developer profile)
- [ ] Deploy `portal.investorproperty.co.za` → Vercel, CNAME (leave HubSpot `www` untouched)

### Phase 1 — Quick Land Value *(the wedge — ship this first)*
The simple version you described, and deliberately nothing more:
- [ ] Inputs: hectares, product type, density (defaulted per product), average unit price, status
- [ ] Gross-to-net developable ratio, defaulting conservatively with a visible warning
- [ ] Status ladder (5–8% / 10% / 12% / 15%) as a slider with plain-language labels
- [ ] Output: land value, value per hectare, value per opportunity
- [ ] Save to account, name the scenario
- [ ] Shareable read-only result link — **this is the seller conversation**, and it's how the tool
      spreads without marketing spend

### Phase 2 — Servicing engine
- [ ] Land-use schedule: multiple uses per site, each with area, FF, coverage, sellable flag
- [ ] Internal services per m²
- [ ] BICLs — encode the COCT DC Calculator (folder already located in Drive)
- [ ] BICL rebate modelling
- [ ] Output: serviced plot value, cost to service, residual land value on a plot-sale exit

### Phase 3 — Building engine
- [ ] Building cost/m² by product type, with the ancillaries (parking, boundary, electrical,
      landscaping)
- [ ] Contingency and escalation, pre-contract and during construction, with cash-flow factor
- [ ] Professional fees (fixed + percentage-based)
- [ ] VAT and input tax credits
- [ ] Unit mix table → gross realisation

### Phase 4 — Cost of capital
- [ ] Level 1 (rate × period × factor), then Level 2 (capitalised interest off cash flow)
- [ ] Multi-year cash flow with phase timing
- [ ] Level 3 facility model — **paid tier**

### Phase 5 — The report
- [ ] Prodigious-structured output: exec summary, cost sections, per-unit allocation
- [ ] Branded PDF export
- [ ] Both directions: developer view (what can I pay) and seller view (is the ask defensible)

### Phase 6 — Comparables *(the moat)*
- [ ] Ingest the deeds data already held (Full Title / Sectional Title 2021–24), P24, Rode's Reports
- [ ] Suggest achievable selling rate per m² by area and product instead of asking the user to guess
- [ ] Competitor development benchmarking

### Phase 7 — Propello handoff
- [ ] Enable the `platform` config flag once the transaction system is built and tested
- [ ] Contextual handoff at the point a deal is found viable, plus the footer link

**Sequencing rule: Phase 1 ships alone and early.** It is a complete, useful, shareable product on
four inputs. Everything after it is depth, and depth can wait for evidence of who's actually using
it.

---

## 8. Assets located (2026-09-16), not yet used

Indexed from Drive without reading contents, to keep cost down:

| Asset | Relevance |
|---|---|
| `Development_Charges_Calculator` + `DC-Calculator-Final21-User version` | Phase 2 BICL engine — needed |
| `Stellenbosch-Municipality-Zoning-Scheme-Maps-2024` | Second municipality after Cape Town |
| Rode's Reports (`RR 2020_2`, `RR 2024_4`) | Phase 6 comparables — industry-standard rent/yield data |
| `UDZ` folder | Urban Development Zone tax incentive — a real value driver not yet modelled |
| `Apartment Investment Model.xlsx` | Possible third model to reconcile |
| `Town Report Brackenfell` | Example of market-research output format |
| `SIMS` folder | Competitor material |
| `Checklist for new developments pre valuation (ooba)` | Bank valuation requirements — useful for report credibility |
| `Index PDE 5` / `PDE5` folder | Property development course material — may hold standard rates |

The deals folder (`1Ujei09...`) was deliberately **not** crawled. When it's time for Phase 6, the
efficient approach is to name two or three specific completed deals rather than have me read
everything.

---

## 9. Open questions

1. **Status ladder precision.** Are the 5–8 / 10 / 12 / 15% figures consistent across product
   types and locations, or do they shift for industrial vs residential, metro vs rural?
2. **Gross-to-net default.** 64% on the industrial site. Is there a rule of thumb by product type,
   or must it always be user-supplied?
3. **Who sees the seller view?** Free to everyone, or is the "is this ask defensible" report the
   first paid artefact?
4. **Municipal scope after Cape Town** — Stellenbosch (maps already held) or West Coast
   (Oliphantskop's home)?
