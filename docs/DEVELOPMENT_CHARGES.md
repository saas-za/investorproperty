# Development Charges engine — City of Cape Town

Reverse-engineered from `DC Calculator - Final 4.1 - User version - Aug 2025.xlsm`, pulled
directly from Drive. This is the calculator the City publishes and the one the Cape Town
Industrial model draws its BICL figures from.

**Verdict: this is fully implementable as a live module.** The engine underneath is much simpler
than the spreadsheet looks — six services, one demand factor per land use per service, one rate
per service per financial year. No hidden black box.

## 1. The formula

```
Additional Demand (per service) = max(0, New Right demand − Existing Right demand)

DC (per service) = Additional Demand × Unit Cost (for the applicable financial year)

Total bulk services DC = Σ over the six services
Total DC payable      = Total bulk services DC + Link services component + VAT
```

Three things fall out of that which matter commercially:

- **You are charged on the *increase* in demand, not total demand.** Existing development rights
  are credited. A site that already carries rights is materially cheaper to develop, and the
  calculator floors the difference at zero, so you never get a refund for reducing demand.
- **Link services are entered separately** — these are the site-specific connector works, distinct
  from the bulk contribution, and the calculator does not derive them.
- Unit costs escalate **annually on 1 July** by the **CPAF** (the City's adjustment factor), and
  the charge is based on the rate applicable when the application is made — so the financial year
  is an input, not a constant.

## 2. The six services

| Service | Demand unit | Unit cost (Aug 2025) |
|---|---|---|
| Roads | trips/day | R3,559.74 ⚠️ *(see note)* |
| Transport | person-trips/peak period | R685.69 |
| Stormwater | ha × C *(runoff coefficient)* | R135,347.00 |
| Sewerage | kl/day (ADDWF) | R13,761.24 |
| Water | kl/day (AADD) | R1,688.02 |
| Solid Waste | kg/day | R340.58 |

⚠️ **Roads has two rate tiers.** The displayed R3,559.74 is the *average* of two rates in the
escalation table (`AVERAGE('Unit Cost Escalation'!D19:D20)`), used only as a placeholder when
demand is zero; the live calculation derives the effective rate from the actual amount. Working
back from the Unit Demands table, the higher tier is **R4,840.69/trip**, implying a lower tier of
roughly **R2,278.79/trip**. This is almost certainly the **PT2 (Public Transport zone)** split —
see §4. *Needs confirmation before implementation.*

## 3. Demand factors by land use

The calculator carries 30+ land use codes. Selected, with total DC excluding VAT:

### Residential (per dwelling unit)

| Code | Land use | Roads (trips/day) | Sewer (kl/d) | Water (kl/d) | **Total DC** |
|---|---|---|---|---|---|
| A1 | Residential, erf > 1000 m² | 4.000 | 0.500 | 1.000 | **R39,755.09** |
| A2 | Residential, erf > 650 m² | 3.800 | 0.500 | 0.900 | **R36,012.28** |
| A3 | Residential, erf > 350 m² | 3.600 | 0.450 | 0.700 | **R32,142.19** |
| A4 | Residential, erf < 350 m² | 3.500 | 0.400 | 0.500 | **R28,410.59** |
| A5 | State funded housing | 0.375 | 0.350 | 0.400 | **R10,065.14** |
| A6 | GAP / affordable | 0.750 | 0.350 | 0.400 | **R13,514.99** |
| A7 | Group housing, erf > 650 m² | 3.750 | 0.450 | 0.900 | **R35,106.24** |
| A8 | Group housing, erf > 200 m² | 3.188 | 0.400 | 0.500 | **R27,984.44** |
| A9 | Group housing, erf < 200 m² | 2.762 | 0.400 | 0.500 | **R24,698.70** |
| A10 | Flats > 70 m²/unit | 2.750 | 0.300 | 0.320 | **R22,048.15** |
| A11 | Flats < 70 m²/unit | 2.000 | 0.300 | 0.320 | **R17,618.42** |
| A12 | Flats < 30 m²/unit | 1.350 | 0.290 | 0.300 | **R13,997.29** |
| A15 | Affordable rental unit | 0.350 | 0.112 | 0.124 | **R5,627.09** |
| A16 | Rural / undetermined / agricultural | 4.000 | 0.500 | 1.000 | **R39,755.09** |

### Non-residential (per m² GLA unless noted)

| Code | Land use | **Total DC** |
|---|---|---|
| B1 | Hotel (per room) | R14,604.55 |
| B3 | Boarding / student accommodation (per bed) | R4,636.17 |
| C1 | General business | R808.41 /m² |
| C2 | Office | R552.39 /m² |
| C3 | Retail / shop | R1,080.04 /m² |
| D1 | Warehouse | R246.14 /m² |
| D2 | Industrial | R391.36 /m² |
| E2 | Universities / schools (per learner) | R6,008.11 |
| E6 | Open space / public open space | R10.94 /m² |

**The commercial insight worth surfacing to developers:** DC per unit falls by **86%** from a large
erf (A1, R39,755) to an affordable rental unit (A15, R5,627), and by 65% from A1 to a sub-30 m²
flat (A12, R13,997). On a 200-unit scheme that is a swing of over **R5 million** in DCs alone,
driven purely by unit size and typology. Most developers do not price this consciously at concept
stage, and the tool can show it instantly.

Note also that **retail carries nearly double the DC of office** per m² (R1,080 vs R552) and
**4.4× industrial** — worth knowing before choosing a use.

## 4. Modifiers

**PT2 — Public Transport zone.** The calculator asks directly: *"Is the development located within
Public Transport (PT2) zone?"* This appears to switch the roads rate to the lower tier.

This is a strong connection to the location-intelligence requirement: **transport proximity has
two independent effects** — it changes which product is viable (apartments work where people don't
need cars) *and* it directly reduces the DC the City charges. Both point the same way, and both
can be derived from a map pin.

**Exemptions** (toggleable in the calculator):

| Code | Exemption |
|---|---|
| B2 | First 3 bedrooms of a guest house |
| C1 | Home occupation / house shop up to 50 m² per erf |
| C2 | Home office up to 50 m² per erf |
| E1 | ECDC up to 34 children per erf |

**VAT** is resolved from date bands on the `Admin_` sheet rather than hardcoded, so historic and
future VAT rate changes are handled. Implement it the same way.

## 5. Inputs the module needs

- Erf number(s), suburb/allotment, owner — reporting only, not calculation
- **Erf size (ha)** — required, drives stormwater (ha × C)
- **Date / financial year** — selects the rate column
- **PT2 zone** — yes/no
- **Per land use code: Existing Right quantity and Total New Right quantity**
- Exemption toggles
- Link services amount (manual entry)

## 6. Implementation notes

- Rate tables belong in the **database, not the code bundle** — they change every 1 July with the
  CPAF, and they are exactly the kind of IP that must not ship to the browser (see the IP gating
  requirement in `ROADMAP.md`).
- The `Unit Cost Escalation` sheet holds rates by financial year to 2029, with a beyond-2029
  fallback column. Seed the table from it and add each year's published rates going forward.
- Store demand factors as data too, keyed by code — the City adds and revises land use codes
  between versions (there is a `RecordOfAmendments` sheet tracking exactly this).
- Version the rate set, so a valuation done today can be reproduced later even after rates change.
  Report output should state which rate year it used.

## 7. Beyond Cape Town

Other municipalities publish their own DC calculators on the same conceptual model (demand factor
× unit rate per service), but with different codes, factors and rates. The module should therefore
be built as **a municipality-agnostic engine plus a per-municipality rate/factor dataset**, not as
a Cape Town calculator with other municipalities bolted on later.

Stellenbosch zoning scheme maps are already in Drive; West Coast (WCDM) rates appear in the
Oliphantskop model. Those are the natural second and third datasets.

## 8. Source file

Stored at `reference/DC-Calculator-4.1-Aug2025.xlsm` (gitignored). Sheets: `Calc Sheet`,
`Unit Demands`, `Additional Demand`, `Unit Cost Escalation`, `CPAF`, `RecordOfAmendments`,
`Admin_`.
