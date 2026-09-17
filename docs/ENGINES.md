# The three server-side engines

All three live in `src/lib/server/` and carry `import "server-only"`. That is not decoration: the
arithmetic in each is trivial and the calibration is the entire product. The API routes above them
return computed figures for one specific request and never the tables — `GET` on each returns
dropdown labels only.

| Engine | File | Answers |
|---|---|---|
| Land estimate | `valuation-engine.ts` | What is the raw opportunity worth? |
| Development charges | `dc-engine.ts` | What will the municipality charge on top? |
| CAPEX appraisal | `capex-engine.ts` | Does the scheme work, and what can the land carry? |

---

## 1. Land estimate — two bases, and why both are needed

```
opportunities = density (units/ha) × net developable hectares      ← density basis
opportunities = floor factor × gross m² ÷ average unit size        ← bulk basis
land value    = average unit price × opportunities × status %
```

The **density basis** is the rule-of-thumb route — what a broker reaches for when all that is
known is "apartments, roughly this dense". Defaults run 35 (single residential) to 120
(high-density apartments) units per net hectare.

The **bulk basis** was added after testing against a real Cape Town site, and it is not a
refinement — it closes a gap that made the tool wrong on exactly the deals it is for.

### The site that forced it

A real Cape Town GR3 site Morné was working:

```
400 units · floor space 27 118 m² (floor factor 0.7) · coverage 10 177 m² (26.3%)
site plan area 37 302 m² · conservation area 14 563 m²
```

Net developable is 22 739 m², which is **61.0% of gross** — almost exactly the tool's 60%
conservative default, which is a good sign for that default.

But 400 units on 2.2739 net hectares is **176 units per net hectare**. The density ladder tops out
at 120. On the density basis the tool returns 273 opportunities against a real 400 — **32% low**,
on a site with a fully approved scheme. Not a tuning problem; the tool was being asked to express
a site in a vocabulary its approval was never written in.

Feeding the site's own figures into the bulk basis returns **398.8 opportunities** and **27 118.55
m² of floor space**, against an actual 400 units and 27 118 m². The gap is rounding.

### The trap inside the bulk basis

**Floor factor applies to the gross site area, not the net.** Every South African scheme
regulation seen so far grants it that way, which means the conservation portion still earns bulk.
Applying it to net area would have understated this site by 39%. The report shows the workings
with "on gross site area" on the face of the row, because otherwise the floor space looks wrong
sitting two rows under a smaller net area.

When the implied density exceeds every default in the ladder, the report says so plainly — it is
not an error, a generous floor factor on a constrained site does exactly this, but it does mean
the figure rests entirely on that floor factor being granted as entered.

### The status ladder

Percentage of eventual unit price attributable to the raw opportunity: raw agricultural 6.5%,
approval in process 10%, granted 12%, zoned with SDP approved 15%. This is the most commercially
valuable number in the model — it converts planning risk into a figure, which is what a developer
cannot do on an envelope and a seller systematically gets wrong.

---

## 2. Development charges — City of Cape Town

Reverse-engineered from the City's published DC Calculator v4.1 (Aug 2025). Full derivation in
`DEVELOPMENT_CHARGES.md`; this is what was implemented.

```
Additional demand  = max(0, new right − existing right)
Charge per service = additional demand × unit cost for the financial year
Total              = Σ services + link services + VAT
```

Three things fall out of that which matter commercially:

- **You are charged on the increase in demand, not total demand.** Existing rights are credited,
  and the difference is floored at zero — no refund for reducing demand. A site that already
  carries rights is materially cheaper to develop.
- **Link services are entered separately.** The City does not derive them; the engineer does. When
  none is entered the report says so rather than implying the total is complete.
- **Rates escalate on 1 July** by the City's CPAF, and the charge uses the rate applying when the
  application is made. The financial year is an input, not a constant. Projected years are
  labelled as projections.

### The PT2 caveat, kept visible

The workbook's headline roads rate of R3 559.74 is the *average* of two tiers and is only a
placeholder. The upper tier, R4 840.69/trip, is derivable; the lower tier, ~R2 278.79, is
**derived rather than published**. It is almost certainly the PT2 public-transport-zone rate.

The engine applies it when PT2 is ticked and the report says, on the face of it, that the figure
needs confirming with the City. That caveat should not be quietly dropped later — on the test site
the PT2 tier moves the total by R2.36m.

### What it is for

On the 400-unit test site at an average 67.8 m² per unit — code A11, flats under 70 m² —
development charges come to **R8 104 473** including VAT.

The same 400 units priced as A1 (residential, erf over 1 000 m²) would be **R18 287 341**. The
typology comparison in the report shows the whole ladder: unit size and typology alone swing the
charge by **R15.7m** on this scheme, before a single other design decision. Most developers do not
price this consciously at concept stage.

### Beyond Cape Town

The engine is municipality-agnostic; Cape Town is the only rate set extracted, because it is the
only calculator obtained. Other municipalities work on the same model with different codes,
factors and rates. When the map puts a site outside Cape Town the panel says "no rate set yet"
rather than silently calculating; a checkbox allows a Cape Town figure anyway as an order of
magnitude, and says exactly that when it does.

---

## 3. CAPEX appraisal — calibrated, and checkable

Calibrated against the Oliphantskop (Langebaan) model. Reference implementation is Phase 1 Town
Housing: 3 828 m², 28 units. `scripts/verify-engines.mjs` re-checks every step against the
workbook's own figures:

```
ok   Building cost                expected    R47 395 591  got    R47 392 937    -0.01%
ok   Building cost per m²         expected        R12 381  got        R12 381    -0.00%
ok   Escalated building cost      expected    R50 380 000  got    R50 006 183    -0.74%
ok   Incl VAT                     expected    R57 937 000  got    R57 507 111    -0.74%
ok   Development costs excl VAT   expected    R10 698 894  got    R10 601 311    -0.91%
ok   Income excl VAT              expected    R79 892 035  got    R79 888 696    -0.00%
```

Worst deviation 0.91%. Run it after touching any constant — that script is what tells you what you
broke.

### Two findings from calibrating rather than transcribing

**Site works are 20.2% on top of the build rate.** Parking bays, vibrecrete walls, boundary,
internal and external civils, entrance gate, electrical, landscaping and irrigation. The source
carries each as its own line; together they turn a R10 000/m² build rate into a R12 381/m²
building cost. A feasibility using the headline rate alone understates cost by a fifth.

**The Data Sheet's "civil engineer 8%" is not 8% of build cost.** Applied to the whole build it
would be R4m on Phase 1, against total professional fees of R1.88m including VAT. It is a fee on
the civils package. Professional fees are therefore calibrated at 3.25% of escalated building cost
rather than transcribed from a percentage that does not reconcile. On the *serviced-erf* exit the
8% does apply to the whole amount, because servicing is almost entirely civils.

### Cash-flow factors

Escalation runs 0.8%/month for 6 pre-contract months on the full cost, then 3.5 contract months on
*half* the construction cost scaled by 0.51. Dropping those factors is the most common way a
feasibility overstates cost, and the source model is explicit about them.

### Two entry points, one engine

- **`appraise`** — land cost in, profit out. What the source model does.
- **`residualLandValue`** — target margin in, affordable land cost out. What a broker actually
  needs: "what can I pay for this land?"

Residual is solved by bisection, not algebraically. Land cost enters the cascade twice — directly
and through finance charges on it — and the relationship is linear only until a transfer-duty band
or a stepped finance rate goes in. A closed-form solution would then quietly become wrong instead
of loudly failing.

**`servicedErfExit`** models the second exit the source runs in parallel: service the land and sell
erven rather than building out. Most feasibility tools model only the first.

---

## The divergence worth looking at

On the 400-unit test site the two value routes disagree materially:

| Route | Figure | What it is |
|---|---|---|
| Status ladder, zoned + SDP at 15% | ~R131.6m | What the market pays for the opportunity |
| CAPEX residual at an 18% margin | ~R51.7m | What the scheme can carry and still work |

Both used comparable revenue (~R2.2m/unit), so this is not an input mismatch. It is the
seller-objective/developer-subjective gap the whole product exists to close, now measurable from
both directions for the first time.

**This has not been resolved, and should not be presented as settled.** Two candidate
explanations, neither verified: the development-cost percentage (21.2%) is calibrated on a
town-housing phase and may run rich against dense apartments; or the status ladder is a market
rule of thumb that genuinely does exceed cost-based residual on well-located urban sites, which
would itself be the finding. Worth putting a real deal through both before trusting either as the
headline number.
