# The valuation engine — specification

Derived from `PLAN 2 - Oliphantskop Subdivision & Rezoning Plan.xlsm` (48 sheets), which is the
real, trusted model and therefore the specification for the portal's calculator. This document
records its structure so the engine can be reimplemented in code rather than re-derived from
scratch.

Scale of the source model, for context: 788,818 m² (~79 ha), R200m land opportunity cost,
R1.6bn building cost (R2.04bn including professional fees and VAT), across 21 phases.

## 1. Sheet anatomy

| Group | Sheets | Role |
|---|---|---|
| `Plan 2 - Summary` | 1 | Land-use schedule + financial roll-up. **The output schema.** |
| `Data Sheet` | 1 | Unit cost assumptions per phase. **The input schema.** |
| `Ph* CAPEX` | 21 | One appraisal per phase. Identical structure → one parameterised function. |
| `Timeline`, `Cash Flow`, `Services Estimate` | 3 | Phasing, cash flow, bulk services |
| `Sales List`, `Opportunities` | 2 | Unit-level sales schedule (1,034 rows) |
| Market research (`FT`/`ST`/`SE` 2021–24, `P24`, competitor sheets) | 20 | Comparable sales evidence and competitor benchmarking |

The 21 CAPEX sheets being structurally identical is the single most important fact here: they are
a template instantiated 21 times. In code that is **one function called 21 times**, not 21
implementations.

## 2. Input schema (from `Data Sheet`)

Per phase, keyed by phase + land use type (Town Housing / Flats / Single Residential):

**Build rates**
- Building cost (per m²) — R10,000 typical, R17,000 for some Phase 4 product
- Parking bay
- Vibrecrete walls — erven
- Boundary (per m)
- Internal works — civils, roads etc.
- Entrance gate
- External works — civils (average of engineer's estimate)
- Electrical installation
- Landscaping / irrigation
- Design and risk contingencies — **3%**

**Professional fees**
- Structural engineer, Architect, Transfer, Advertisement, Security, Land surveyor
- Civil engineer — **8%** (percentage, not fixed)

**Bulk services / development charges**
- Roads, Water, Sewer, Solid Waste, **WCDM**

**Revenue**
- Selling price per m² — R24,000 typical

## 3. Calculation sequence (from `Ph1 TH CAPEX`)

Worked with Phase 1 Town Housing — 28 units, 3,828 m² — to make each step concrete:

```
1  Building costs        area × rate + parking + walls + boundary + internal/external
                         civils + electrical + landscaping + 3% contingencies
                         → R47,395,591  (R12,381/m²)

2  Escalation            pre-contract: 0.80%/month × 6 months
                         during contract: 0.80%/month × 3.5 months × 0.51 cash-flow factor
                         (applied to half the construction cost, excluding contingencies)
                         → R50,380,000  (R13,160/m²)

3  + VAT @ 15%           → R57,937,000

4  Professional fees     structural, architect, transfer, advertising, security,
                         surveyor, civil engineer @ 8%, + VAT
                         → R59,817,250 cumulative

5  Development costs     land cost, plan approval, bulk connections, tax clearances,
                         NHBRC, electrical/civil bulk contributions, agent commission
                         & marketing, interim rates & taxes
                         → R10,698,894 excl VAT / R12,303,728 incl VAT

6  Finance charges       12%/yr on building costs (5 mo), development costs (5 mo),
                         and on VAT (2 mo), each with its own cash-flow factor
                         → R75,202,978 total capital costs incl VAT

7  Less input tax        VAT recovery on building costs, fees, development costs
   credits               → R65,795,894 total capital outlay excl VAT

8  Income                unit mix × size × selling rate → R91,875,840 gross
                         → R79,892,035 excluding VAT

9  Profit                R14,096,141 = 18% margin, R4,827.79 per m²
```

Note the cash-flow factors (0.51 on contract escalation, 1.00 on finance). These matter — they
model the fact that costs are incurred progressively, not on day one. A naive implementation that
applies finance to the full amount for the full period materially overstates cost.

## 4. Output schema (from `Plan 2 - Summary`)

Land-use schedule: Phase, Abbreviation, Land Use, **Zoning**, **Density**, **Height**, Portion
No, No. Erven, No. Units, Site Area (m²), Estimated Perimeter.

Financials: Opportunity Cost (Land), Time (months), Total Building Cost, Building Cost/m², Total
incl VAT & escalation, Total incl professional fees & VAT, Total development costs incl VAT,
Total capital cost excl finance & VAT recovery, Total capital costs incl VAT, **Total capital
outlay excl VAT**, **Total income excl VAT**, **Estimated profit**, **ROI**.

## 5. Two exit strategies, modelled side by side

This is the model's most sophisticated feature and it should survive into the portal. The summary
carries a parallel set of land-only columns:

- **Develop and sell units** — build it, sell the product, take the development margin
- **Service and sell erven** — `Cost to service land`, `Cost to service land incl professional
  fees & VAT`, and the `(LAND)` variants of the capital cost columns, ending in `Land Selling
  Price` and `Land per m²`

Most feasibility tools model only the first. Being able to answer "should I build this out, or
service it and sell serviced erven?" is a genuinely differentiated feature, and the source model
already does it.

## 6. Non-sellable land is a first-class input

The schedule tracks land uses that consume area but produce no revenue: Private/Public Open
Space, Nature Area, Public Road & Parking, Private Road & Parking, Transport Zone II. Phase 14
alone carries 385,115 m² of Nature Area — roughly half the entire site.

The gross-to-net land ratio is therefore one of the largest drivers of viability, and any tool
that multiplies site area by a rate without subtracting non-sellable use will produce numbers
that are badly, confidently wrong. This must be modelled explicitly.

## 7. Profit appraisal vs. residual land value — both are needed

The source model takes **land cost as an input** (`Opp Cost (Land)` = R200m) and solves for
profit. The portal's proposition — "what can I afford to pay for this land?" — is the same model
solved for a different unknown: fix a target profit margin, solve for land cost.

These are one engine with two entry points, so it should be built that way from the start:

- **Appraisal mode** — given land price, what is my profit and ROI? (matches the source model)
- **Residual mode** — given target profit, what is the maximum land price? (the portal's hook)

Residual mode is the more compelling free tool, because it answers the question a developer has
while standing on a site deciding whether to bid.

## 8. Zoning vocabulary problem — needs resolving before build

There are currently **two incompatible zoning vocabularies** in play:

| Source | Vocabulary | Development metric |
|---|---|---|
| `New Listing.js` `ZONING_DATA` | Cape Town scheme: SR1, SR2, GR1–GR6, LB1, LB2, GB1, GB2, AG | **Floor factor (FAR)** + height |
| Oliphantskop model | Residential I / II / III, Business Zone II, Transport Zone II, Open Space | **Density (units/hectare)** + height |

These are different municipal schemes (the model's `WCDM` line confirms West Coast District
Municipality) *and* different ways of expressing development potential. Floor factor yields bulk
m²; density yields unit count. They are not interchangeable.

This creates a real tension with the decision to scope v1 to Cape Town: **the flagship worked
example is a West Coast development.** Either the engine supports both metrics from day one
(recommended — they're both simple, and the model already needs unit count *and* bulk), or the
Oliphantskop model can't be used as the demo for a Cape Town-only tool.

Recommendation: model development potential as an interface with two implementations — `farBased`
(bulk = FAR × net area) and `densityBased` (units = density × net hectares) — and let the zoning
record declare which applies. That keeps Cape Town v1 honest while leaving the West Coast case
working, at very little extra cost.

## 9. Market research is an untapped asset

Twenty sheets of comparable sales evidence — Full Title and Sectional Title deeds data 2021–2024,
Property24 listings and average prices, and four competitor developments benchmarked individually
(Helios Place, Millennial Arch, Nivica, Sunset Heights).

This is the hardest input for a developer to source, and the one that makes a valuation
defensible rather than speculative. Auto-populating "achievable selling rate per m²" from real
comparable evidence — rather than asking the developer to guess — would be the portal's strongest
single feature. Worth treating as a phase of its own rather than an afterthought.
