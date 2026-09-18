"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import CoctZoningCheck from "@/components/CoctZoningCheck";
import ContactCta from "@/components/ContactCta";
import DevelopmentCharges, { type DcSummary } from "@/components/DevelopmentCharges";
import NumberInput from "@/components/NumberInput";
import ParcelMap, {
  type EthekwiniZoning,
  type Municipality,
  type SelectedParcel,
} from "@/components/ParcelMap";
import { portal } from "@/config/platform";
import {
  CASH_CEILING_NOTE,
  COMPLIMENTARY_NOTE,
  DEAL_STRUCTURES,
  dueDiligenceNotes,
  PARTY_LABELS,
  type Party,
} from "@/lib/advice";

interface Option {
  value: string;
  label: string;
  /** Products only — the density default, shown so the assumption is visible before you calculate. */
  densityPerHa?: number;
}

interface BasketRow {
  unitType: string;
  opportunities: string;
  pricePerOpportunity: string;
}

interface BasketBreakdownRow {
  unitType: string;
  opportunities: number;
  pricePerOpportunity: number;
  grossRealisation: number;
}

interface QuickResult {
  grossHectares: number;
  netHectares: number;
  nonDevelopableHectares: number;
  netRatioUsed: number;
  netRatioWasDefaulted: boolean;
  areaSplitMode: "ratio" | "absolute";
  basisUsed: "density" | "bulk" | "basket";
  densityUsed: number;
  effectiveDensityPerGrossHectare: number;
  bulk?: {
    floorFactor: number;
    averageUnitSizeM2: number;
    totalFloorAreaM2: number;
    coverage?: number;
    impliedDensityPerNetHectare: number;
    exceedsDensityLadder: boolean;
  };
  statusPctUsed: number;
  opportunities: number;
  opportunitiesWereApproved: boolean;
  landValue: number;
  valuePerHectare: number;
  valuePerOpportunity: number;
  basketBreakdown?: BasketBreakdownRow[];
}

/** Money, counts, densities — always thousands-separated, never decimals. */
const fmt = (n: number) => Math.round(n).toLocaleString("en-ZA");
const rand = (n: number) => `R${fmt(n)}`;
/** Areas keep decimal precision — a hectare figure is a measurement, not a count. */
const fmtHa = (n: number) => n.toLocaleString("en-ZA", { maximumFractionDigits: 2 });

const HA_TO_M2 = 10_000;
const PCT_EPSILON = 0.5;

const todayYmd = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

/** "constantia heights" → "Constantia Heights" — for the suburb in a PDF filename. */
const properCase = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

const emptyBasketRow = (): BasketRow => ({ unitType: "", opportunities: "", pricePerOpportunity: "" });

/**
 * Typical unit types for a basket of rights. A free-text field produced
 * "2 bed", "2-bed", "Two bedroom" and "2B" on the same site, which makes the
 * breakdown table unreadable and the rows impossible to total by type.
 * "Other" keeps the escape hatch.
 */
const UNIT_TYPES = [
  "Bachelor / studio",
  "1-bed apartment",
  "2-bed apartment",
  "3-bed apartment",
  "Penthouse",
  "Simplex townhouse",
  "Duplex townhouse",
  "Single residential erf",
  "Group housing unit",
  "Retirement unit",
  "Student bed",
  "Retail GLA (m²)",
  "Office GLA (m²)",
  "Industrial GLA (m²)",
  "Serviced erf",
  "Other",
] as const;

/**
 * What the seller's price expectation is actually built on. These are ordered
 * weakest to strongest claim, and the report says which one was used — an
 * architect's concept and an approved SDP are not the same evidence.
 */
type ExpectationBasis =
  | "no_basis"
  | "architect_concept"
  | "submitted_not_approved"
  | "sdp_approved"
  | "subdivision_approved";

const EXPECTATION_BASES: { value: ExpectationBasis; label: string; note: string }[] = [
  {
    value: "no_basis",
    label: "Nothing formal — a price they have in mind",
    note: "Often anchored to a neighbouring sale on a site with different rights.",
  },
  {
    value: "architect_concept",
    label: "An architect's concept, not submitted",
    note: "Shows what could theoretically fit. No planner or traffic engineer has tested it.",
  },
  {
    value: "submitted_not_approved",
    label: "Plans submitted, not yet approved",
    note: "In the system, but the approval and its conditions are still unknown.",
  },
  {
    value: "sdp_approved",
    label: "Site Development Plan approved",
    note: "A real, current right. The strongest form of this claim.",
  },
  {
    value: "subdivision_approved",
    label: "Subdivision plan approved",
    note: "A real, current right, with the erven themselves consented.",
  },
];

export default function ValuationPage() {
  const [products, setProducts] = useState<Option[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);

  // Gross area — m² and ha kept in sync, either can be typed.
  const [areaM2, setAreaM2] = useState("10000");
  const [areaHa, setAreaHa] = useState("1");

  const [productType, setProductType] = useState("");
  const [status, setStatus] = useState("");
  const [approvedOpportunities, setApprovedOpportunities] = useState("");
  const [unitPrice, setUnitPrice] = useState("1000000");
  const [densityOverride, setDensityOverride] = useState("");

  // Density (units/ha) or bulk (floor factor × average unit size). A scheme
  // regulation grants one or the other, never both, and converting between
  // them is where a seller's case usually falls over.
  const [basis, setBasis] = useState<"density" | "bulk">("density");
  const [floorFactor, setFloorFactor] = useState("");
  const [avgUnitSize, setAvgUnitSize] = useState("");
  const [coveragePct, setCoveragePct] = useState("");

  const [basket, setBasket] = useState<BasketRow[]>([emptyBasketRow()]);

  // Net developable area: a % pair, or a typed absolute-area pair. Both pairs
  // auto-balance to the total the first time the second field is empty, then
  // leave the user free to override — which is what the mismatch check below
  // is there to catch.
  const [splitMode, setSplitMode] = useState<"ratio" | "absolute">("ratio");
  const [developablePct, setDevelopablePct] = useState("");
  const [nonDevelopablePct, setNonDevelopablePct] = useState("");
  const [splitUnit, setSplitUnit] = useState<"ha" | "m2">("m2");
  const [developableArea, setDevelopableArea] = useState("");
  const [nonDevelopableArea, setNonDevelopableArea] = useState("");

  /**
   * Who is running the calculation. It changes nothing in the arithmetic and
   * a good deal in the wording — a seller and a developer are exposed to
   * different risks by the same number.
   */
  const [party, setParty] = useState<Party>("developer");

  // Optional second scenario: what the seller expects the site is worth,
  // compared against the primary (approved/documented) figures.
  const [compareAssumption, setCompareAssumption] = useState(false);
  /** The seller's own asking price, if they have named one. */
  const [sellerExpectation, setSellerExpectation] = useState("");
  /**
   * What the seller's expectation actually rests on. An architect's sketch and
   * a submitted SDP are very different kinds of claim, and the report should
   * not flatten them into "assumed".
   */
  const [expectationBasis, setExpectationBasis] = useState<ExpectationBasis>("architect_concept");
  const [assumedProductType, setAssumedProductType] = useState("");
  const [assumedDensityOverride, setAssumedDensityOverride] = useState("");
  const [assumedUnitPrice, setAssumedUnitPrice] = useState("");

  // Map-picked parcels. The area they add up to drives the gross site area,
  // and the municipality they fall in decides whether development charges can
  // be calculated at all.
  const [showMap, setShowMap] = useState(false);
  const [parcels, setParcels] = useState<SelectedParcel[]>([]);
  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  /** Only ever set on a click inside eThekwini, where a live zoning layer exists. */
  const [ethekwiniZoning, setEthekwiniZoning] = useState<EthekwiniZoning | null>(null);
  /** Lifted out of the DC panel so the printed report can carry it. */
  const [dcResult, setDcResult] = useState<DcSummary | null>(null);
  /** A real satellite image of the site, generated for the printed report. */
  const [siteMapUrl, setSiteMapUrl] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const [result, setResult] = useState<QuickResult | null>(null);
  const [assumedResult, setAssumedResult] = useState<QuickResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isBasket = productType === "basket_of_rights";

  /** Live feedback while typing a floor factor — the bulk it buys on this site. */
  const floorAreaPreview =
    basis === "bulk" && Number(floorFactor) > 0 && Number(areaM2) > 0
      ? Number(floorFactor) * Number(areaM2)
      : null;

  /**
   * Selecting parcels overwrites the gross area — that is the point of picking
   * on a map. The split fields are cleared with it, because a developable
   * percentage carried over from a different site is worse than a blank one.
   */
  function onParcelsChange(
    next: SelectedParcel[],
    muni: Municipality | null,
    zoning?: EthekwiniZoning,
  ) {
    setParcels(next);
    if (muni) setMunicipality(muni);
    setEthekwiniZoning(zoning ?? null);
    if (next.length === 0) {
      setMunicipality(null);
      return;
    }
    const totalM2 = next.reduce((s, p) => s + p.areaM2, 0);
    setAreaM2(String(Math.round(totalM2)));
    setAreaHa((totalM2 / HA_TO_M2).toFixed(4));
    setDevelopablePct("");
    setNonDevelopablePct("");
    setDevelopableArea("");
    setNonDevelopableArea("");
    setPctTouched({ dev: false, non: false });
    setAreaTouched({ dev: false, non: false });
  }

  useEffect(() => {
    fetch("/api/valuation/quick")
      .then((r) => r.json())
      .then((data: { products: Option[]; statuses: Option[] }) => {
        setProducts(data.products);
        setStatuses(data.statuses);
        const defaultProduct = data.products[2]?.value ?? data.products[0]?.value ?? "";
        setProductType(defaultProduct);
        setAssumedProductType(defaultProduct);
        setStatus(data.statuses[0]?.value ?? "");
      })
      .catch(() => setError("Could not load the form — refresh and try again"));
  }, []);

  function onAreaM2Change(v: string) {
    setAreaM2(v);
    const n = Number(v);
    if (v !== "" && Number.isFinite(n)) setAreaHa((n / HA_TO_M2).toString());
  }
  function onAreaHaChange(v: string) {
    setAreaHa(v);
    const n = Number(v);
    if (v !== "" && Number.isFinite(n)) setAreaM2((n * HA_TO_M2).toString());
  }

  /**
   * Which of the pair the user has typed in themselves. The other one is
   * derived and kept in step on every keystroke.
   *
   * The earlier version only auto-filled while the other field was still
   * blank, which meant the balance was computed from a half-typed number and
   * then frozen: typing 37 302 into a 54 600 site balanced against "3", and
   * typing 14 563 balanced against "1". Deriving on every keystroke instead of
   * once is the fix. Once the user edits the derived side too, it stops being
   * derived and the mismatch warning takes over.
   */
  const [pctTouched, setPctTouched] = useState({ dev: false, non: false });
  const [areaTouched, setAreaTouched] = useState({ dev: false, non: false });

  const balancePct = (v: string) =>
    String(Math.max(0, Math.round((100 - Number(v)) * 10) / 10));

  function onDevelopablePctChange(v: string) {
    setDevelopablePct(v);
    setPctTouched((t) => ({ ...t, dev: v !== "" }));
    if (!pctTouched.non && v !== "" && Number.isFinite(Number(v))) {
      setNonDevelopablePct(balancePct(v));
    }
  }
  function onNonDevelopablePctChange(v: string) {
    setNonDevelopablePct(v);
    setPctTouched((t) => ({ ...t, non: v !== "" }));
    if (!pctTouched.dev && v !== "" && Number.isFinite(Number(v))) {
      setDevelopablePct(balancePct(v));
    }
  }
  const pctMismatch =
    splitMode === "ratio" &&
    developablePct !== "" &&
    nonDevelopablePct !== "" &&
    Math.abs(Number(developablePct) + Number(nonDevelopablePct) - 100) > PCT_EPSILON;

  // Absolute-area pair — auto-fills the other against the top gross-area
  // total (converted into whichever unit the split is being entered in),
  // only while that other field is still blank.
  function totalInSplitUnit() {
    const ha = Number(areaHa);
    if (!Number.isFinite(ha)) return NaN;
    return splitUnit === "ha" ? ha : ha * HA_TO_M2;
  }
  const balanceArea = (v: string) => {
    const total = totalInSplitUnit();
    const n = Number(v);
    if (!Number.isFinite(total) || !Number.isFinite(n)) return null;
    return String(Math.max(0, Math.round((total - n) * 100) / 100));
  };

  function onDevelopableAreaChange(v: string) {
    setDevelopableArea(v);
    setAreaTouched((t) => ({ ...t, dev: v !== "" }));
    if (!areaTouched.non && v !== "") {
      const balance = balanceArea(v);
      if (balance !== null) setNonDevelopableArea(balance);
    }
  }
  function onNonDevelopableAreaChange(v: string) {
    setNonDevelopableArea(v);
    setAreaTouched((t) => ({ ...t, non: v !== "" }));
    if (!areaTouched.dev && v !== "") {
      const balance = balanceArea(v);
      if (balance !== null) setDevelopableArea(balance);
    }
  }
  // Changing the gross site area, or the unit the split is typed in, has to
  // move the derived side with it — otherwise the balance silently describes
  // the previous site.
  useEffect(() => {
    if (splitMode !== "absolute") return;
    if (areaTouched.dev && !areaTouched.non && developableArea !== "") {
      const balance = balanceArea(developableArea);
      if (balance !== null) setNonDevelopableArea(balance);
    } else if (areaTouched.non && !areaTouched.dev && nonDevelopableArea !== "") {
      const balance = balanceArea(nonDevelopableArea);
      if (balance !== null) setDevelopableArea(balance);
    }
    // Deliberately keyed on the total and the unit only. Adding the two area
    // fields here would make each keystroke re-derive the field being typed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaHa, splitUnit, splitMode]);

  /**
   * A real satellite image of the site for the printed report — generated
   * once here rather than left for the report to fetch on print, since a
   * print dialog can't wait on a network request. 600×600, square, as asked
   * for; the underlying generator defaults to landscape but takes whatever
   * size is passed.
   */
  useEffect(() => {
    const withGeometry = parcels.filter((p) => p.rings.length > 0);
    if (withGeometry.length === 0) {
      setSiteMapUrl(null);
      return;
    }
    let cancelled = false;
    fetch("/api/site-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parcels: withGeometry.map((p) => ({ rings: p.rings })),
        width: 600,
        height: 600,
      }),
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject()))
      .then((blob) => {
        if (cancelled) return;
        setSiteMapUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      })
      .catch(() => {
        if (!cancelled) setSiteMapUrl(null);
      });
    return () => {
      cancelled = true;
    };
    // Keyed on the parcel keys, not the array reference — onParcelsChange
    // creates a new array on every map interaction even when the selection
    // itself hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels.map((p) => p.key).join(",")]);

  /**
   * The browser suggests a PDF filename from the page's own `<title>` at the
   * moment `window.print()` is called — this is the standard trick for
   * controlling it, since there is no dedicated API for naming a print-to-PDF
   * output. Reverse-geocoding for the suburb is a nicety, not a requirement:
   * a failed lookup still prints, just without a suburb in the name.
   */
  async function printReport() {
    setPrinting(true);
    const primary = parcels[0];
    let filename = `${todayYmd()}-Desktop-Land-Estimate`;

    if (primary) {
      filename = `${todayYmd()}-${primary.label}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${primary.centroid.lat}&lon=${primary.centroid.lng}&zoom=16&addressdetails=1`,
        );
        const data = await res.json();
        const addr = data?.address ?? {};
        const suburb =
          addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.village;
        if (suburb) filename = `${todayYmd()}-${properCase(suburb)}-${primary.label}`;
      } catch {
        // Filename is a nicety, not a requirement — printing still proceeds.
      }
    }

    // Characters Windows won't allow in a filename — defensive, since the
    // suburb name comes from a third-party geocoder rather than a fixed list.
    filename = filename.replace(/[<>:"/\\|?*]/g, "");

    const previousTitle = document.title;
    document.title = filename;
    // One frame so the browser has actually applied the new title before the
    // print dialog reads it.
    requestAnimationFrame(() => {
      window.print();
      document.title = previousTitle;
      setPrinting(false);
    });
  }

  const areaSplitTolerance = splitUnit === "ha" ? 0.01 : 1;
  const areaMismatch =
    splitMode === "absolute" &&
    developableArea !== "" &&
    nonDevelopableArea !== "" &&
    Number.isFinite(totalInSplitUnit()) &&
    Math.abs(Number(developableArea) + Number(nonDevelopableArea) - totalInSplitUnit()) > areaSplitTolerance;

  function updateBasketRow(i: number, patch: Partial<BasketRow>) {
    setBasket((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addBasketRow() {
    setBasket((prev) => [...prev, emptyBasketRow()]);
  }
  function removeBasketRow(i: number) {
    setBasket((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function baseBody(): Record<string, unknown> {
    const body: Record<string, unknown> = { status };
    if (splitMode === "absolute" && developableArea && nonDevelopableArea) {
      const toHa = (v: string) => (splitUnit === "ha" ? Number(v) : Number(v) / HA_TO_M2);
      body.developableHectares = toHa(developableArea);
      body.nonDevelopableHectares = toHa(nonDevelopableArea);
    } else {
      body.grossHectares = Number(areaHa);
      if (developablePct) body.netRatio = Number(developablePct) / 100;
    }
    return body;
  }

  async function runCalc(body: Record<string, unknown>): Promise<QuickResult> {
    const res = await fetch("/api/valuation/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Something went wrong");
    return data as QuickResult;
  }

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setAssumedResult(null);

    try {
      const approvedBody: Record<string, unknown> = { ...baseBody(), productType };
      if (isBasket) {
        approvedBody.basket = basket
          .filter((r) => r.unitType && r.opportunities && r.pricePerOpportunity)
          .map((r) => ({
            unitType: r.unitType,
            opportunities: Number(r.opportunities),
            pricePerOpportunity: Number(r.pricePerOpportunity),
          }));
      } else {
        approvedBody.averageUnitPrice = Number(unitPrice);
        if (basis === "bulk") {
          approvedBody.basis = "bulk";
          approvedBody.floorFactor = Number(floorFactor);
          approvedBody.averageUnitSizeM2 = Number(avgUnitSize);
          if (coveragePct) approvedBody.coverage = Number(coveragePct) / 100;
        } else if (densityOverride) {
          approvedBody.density = Number(densityOverride);
        }
        if (status === "approval_granted" && approvedOpportunities) {
          approvedBody.approvedOpportunities = Number(approvedOpportunities);
        }
      }

      const approved = await runCalc(approvedBody);
      setResult(approved);

      if (compareAssumption && !isBasket) {
        const assumedBody: Record<string, unknown> = {
          ...baseBody(),
          productType: assumedProductType,
          averageUnitPrice: Number(assumedUnitPrice || unitPrice),
        };
        if (assumedDensityOverride) assumedBody.density = Number(assumedDensityOverride);
        const assumed = await runCalc(assumedBody);
        setAssumedResult(assumed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the calculator");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 bg-shell">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Title left, logo right — two columns, no subtitle. */}
        <div className="no-print flex items-center justify-between gap-6">
          <div>
            <Link href="/" className="text-xs uppercase tracking-[0.2em] text-gold-deep">
              {portal.name}
            </Link>
            <h1 className="mt-1 text-xl font-normal text-navy sm:text-2xl">
              Desktop Land Estimate
            </h1>
          </div>
          <Image
            src="/logo.png"
            alt="Investor Property"
            width={400}
            height={400}
            className="h-40 w-40 shrink-0 object-contain sm:h-48 sm:w-48"
          />
        </div>

        {/* Asked first, because it changes how everything below is worded. */}
        <div className="no-print mt-8 rounded-lg border border-navy/10 bg-white p-6 shadow-sm">
          <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
            Who is doing this calculation?
          </label>
          <div className="mt-2 flex gap-1 rounded-md bg-navy/5 p-1 text-xs">
            {(Object.keys(PARTY_LABELS) as Party[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setParty(p)}
                className={`flex-1 rounded px-2 py-2 transition ${
                  party === p ? "bg-white shadow-sm font-medium text-navy" : "text-navy/50"
                }`}
              >
                {PARTY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="no-print mt-6 rounded-lg border border-navy/10 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Find the site
            </label>
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="text-xs text-gold-deep underline underline-offset-2"
            >
              {showMap ? "Hide the map" : "Pick it on a map instead"}
            </button>
          </div>
          {showMap ? (
            <ParcelMap
              className="mt-3"
              selected={parcels}
              onChange={onParcelsChange}
            />
          ) : (
            <p className="mt-2 text-xs text-navy/50">
              Clicking the site on a map fills in its registered extent and erf or farm number
              from the national cadastre, instead of typing them.
            </p>
          )}
        </div>

        <form onSubmit={calculate} className="no-print mt-6 space-y-6 rounded-lg border border-navy/10 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Gross site area
            </label>
            {parcels.length > 0 && (
              <p className="mt-1 text-[11px] text-navy/50">
                From {parcels.length === 1 ? parcels[0].label : `${parcels.length} selected parcels`}
                {municipality ? ` · ${municipality.name}` : ""}. Override it if the site plan
                differs from the registered extent.
              </p>
            )}
            {ethekwiniZoning && (
              <p className="mt-1.5 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <span className="font-medium">
                  eThekwini zoning: {ethekwiniZoning.zoning || "unzoned"}
                </span>
                {ethekwiniZoning.schemeName && ` · ${ethekwiniZoning.schemeName} scheme`}
                {ethekwiniZoning.suburb && ` · ${ethekwiniZoning.suburb}`}
                <span className="mt-1 block text-emerald-800/70">
                  From eThekwini&apos;s own live zoning layer, not a transcribed table — it cannot
                  go stale the way a hand-copied scheme can. Cape Town has no public equivalent, so
                  the density and floor-factor defaults there still rest on the published PDF
                  regulations.
                </span>
              </p>
            )}
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <div>
                <NumberInput
                  decimals={0} required
                  value={areaM2}
                  onChange={onAreaM2Change}
                  invalid={areaMismatch}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">m²</span>
              </div>
              <div>
                <NumberInput
                  decimals={2} required
                  value={areaHa}
                  onChange={onAreaHaChange}
                  invalid={areaMismatch}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">hectares</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                {compareAssumption && !isBasket
                  ? "Has any rights been approved on this site?"
                  : "What can be built there?"}
              </label>
            </div>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
            >
              {products.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                  {p.densityPerHa ? ` (${p.densityPerHa} units/ha)` : ""}
                </option>
              ))}
            </select>
            {!isBasket && (
              <>
                {/* Two ways to say the same thing, and which one is honest
                    depends on what the approval actually grants. A Cape Town
                    GR3 site is given a floor factor, never a density. */}
                <div className="mt-2 flex gap-1 rounded-md bg-navy/5 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setBasis("density")}
                    className={`flex-1 rounded px-2 py-1.5 transition ${basis === "density" ? "bg-white shadow-sm font-medium text-navy" : "text-navy/50"}`}
                  >
                    By density
                  </button>
                  <button
                    type="button"
                    onClick={() => setBasis("bulk")}
                    className={`flex-1 rounded px-2 py-1.5 transition ${basis === "bulk" ? "bg-white shadow-sm font-medium text-navy" : "text-navy/50"}`}
                  >
                    By floor factor
                  </button>
                </div>

                {basis === "density" ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-navy/50">
                      Override the density assumption
                    </summary>
                    <NumberInput
                      decimals={0}
                      placeholder="units per net hectare — leave blank to use our default"
                      value={densityOverride}
                      onChange={setDensityOverride}
                      className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                  </details>
                ) : (
                  <div className="mt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <NumberInput
                          decimals={2}
                          placeholder="0.70"
                          value={floorFactor}
                          onChange={setFloorFactor}
                          className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                        />
                        <span className="mt-1 block text-[11px] text-navy/40">Floor factor</span>
                      </div>
                      <div>
                        <NumberInput
                          decimals={0}
                          placeholder="68"
                          value={avgUnitSize}
                          onChange={setAvgUnitSize}
                          className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                        />
                        <span className="mt-1 block text-[11px] text-navy/40">
                          Average unit size (m²)
                        </span>
                      </div>
                      <div>
                        <NumberInput
                          decimals={1}
                          placeholder="26.3"
                          value={coveragePct}
                          onChange={setCoveragePct}
                          className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                        />
                        <span className="mt-1 block text-[11px] text-navy/40">
                          Coverage % (optional)
                        </span>
                      </div>
                    </div>
                    {floorAreaPreview !== null && (
                      <p className="mt-2 text-xs text-navy/50">
                        {fmt(floorAreaPreview)} m² of floor space
                        {avgUnitSize && Number(avgUnitSize) > 0
                          ? ` · about ${fmt(floorAreaPreview / Number(avgUnitSize))} units`
                          : ""}
                        . Floor factor applies to the gross site area, so the conservation portion
                        still earns bulk.
                      </p>
                    )}

                    {/* Cape Town only — this is transcribed from the published
                        scheme regulations, not a national rule. Optional,
                        because most people typing a floor factor already got
                        it from an SDP and don't need it re-derived. */}
                    <CoctZoningCheck
                      grossSiteM2={Number(areaM2) || 0}
                      proposedFloorAreaM2={floorAreaPreview ?? 0}
                      averageUnitSizeM2={Number(avgUnitSize) || 0}
                      proposedCoverageM2={
                        coveragePct ? (Number(coveragePct) / 100) * (Number(areaM2) || 0) : undefined
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Status of the opportunity
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {status === "approval_granted" && !isBasket && (
              <div className="mt-2">
                <NumberInput
                  decimals={0}
                  placeholder="e.g. 400"
                  value={approvedOpportunities}
                  onChange={setApprovedOpportunities}
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">
                  How many opportunities were approved? Straight from the approval document — this
                  replaces the density or floor-factor estimate below rather than adding to it.
                </span>
              </div>
            )}
          </div>

          {isBasket ? (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Basket of rights
              </label>
              <p className="mt-1 text-xs text-navy/50">
                One row per unit type. Price per opportunity is the average selling price for
                that type — the same figure the single-product field asks for, just broken down.
              </p>
              <div className="mt-2 overflow-hidden rounded border border-navy/20">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy/5 text-left text-[11px] uppercase tracking-wide text-navy/50">
                      <th className="px-2 py-2 font-medium">Unit type</th>
                      <th className="px-2 py-2 font-medium">Opportunities</th>
                      <th className="px-2 py-2 font-medium">Price per Opportunity</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {basket.map((row, i) => (
                      <tr key={i} className="border-t border-navy/10">
                        <td className="p-1">
                          <select
                            value={UNIT_TYPES.includes(row.unitType as never) ? row.unitType : row.unitType ? "Other" : ""}
                            onChange={(e) => updateBasketRow(i, { unitType: e.target.value })}
                            className="w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                          >
                            <option value="">Choose a type…</option>
                            {UNIT_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                          {/* "Other" still needs somewhere to say what it is. */}
                          {row.unitType === "Other" && (
                            <input
                              autoFocus
                              value=""
                              onChange={(e) => updateBasketRow(i, { unitType: e.target.value })}
                              placeholder="Name the type"
                              className="mt-1 w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                            />
                          )}
                        </td>
                        <td className="p-1">
                          <NumberInput
                            decimals={0}
                            value={row.opportunities}
                            onChange={(v) => updateBasketRow(i, { opportunities: v })}
                            className="w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="p-1">
                          <NumberInput
                            decimals={0}
                            value={row.pricePerOpportunity}
                            onChange={(v) => updateBasketRow(i, { pricePerOpportunity: v })}
                            className="w-full rounded border border-navy/15 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeBasketRow(i)}
                            className="text-navy/30 hover:text-red-500"
                            aria-label="Remove row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addBasketRow}
                className="mt-2 text-xs text-gold-deep underline underline-offset-2"
              >
                + Add unit type
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Average selling price per unit (ZAR)
              </label>
              <NumberInput
                decimals={0} required
                value={unitPrice}
                onChange={setUnitPrice}
                className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
              Net developable area
            </label>
            <div className="mt-2 flex gap-1 rounded-md bg-navy/5 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSplitMode("ratio")}
                className={`flex-1 rounded px-2 py-1.5 transition ${splitMode === "ratio" ? "bg-white shadow-sm font-medium text-navy" : "text-navy/50"}`}
              >
                Enter as %
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("absolute")}
                className={`flex-1 rounded px-2 py-1.5 transition ${splitMode === "absolute" ? "bg-white shadow-sm font-medium text-navy" : "text-navy/50"}`}
              >
                Enter as areas
              </button>
            </div>

            {splitMode === "ratio" ? (
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <NumberInput
                      decimals={1}
                      placeholder="e.g. 44"
                      value={developablePct}
                      onChange={onDevelopablePctChange}
                      invalid={pctMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">Developable %</span>
                  </div>
                  <div>
                    <NumberInput
                      decimals={1}
                      placeholder="e.g. 56"
                      value={nonDevelopablePct}
                      onChange={onNonDevelopablePctChange}
                      invalid={pctMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">Non-developable %</span>
                  </div>
                </div>
                {pctMismatch && (
                  <p className="mt-1.5 text-xs text-red-600">
                    These don&apos;t add up to 100% — check the split.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSplitUnit("m2")}
                    className={`rounded px-2 py-1 ${splitUnit === "m2" ? "bg-navy text-shell" : "bg-navy/5 text-navy/60"}`}
                  >
                    m²
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitUnit("ha")}
                    className={`rounded px-2 py-1 ${splitUnit === "ha" ? "bg-navy text-shell" : "bg-navy/5 text-navy/60"}`}
                  >
                    ha
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <NumberInput
                      decimals={splitUnit === "ha" ? 2 : 0}
                      placeholder={splitUnit === "ha" ? "e.g. 0.44" : "e.g. 4400"}
                      value={developableArea}
                      onChange={onDevelopableAreaChange}
                      invalid={areaMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">Developable</span>
                  </div>
                  <div>
                    <NumberInput
                      decimals={splitUnit === "ha" ? 2 : 0}
                      placeholder={splitUnit === "ha" ? "e.g. 0.56" : "e.g. 5600"}
                      value={nonDevelopableArea}
                      onChange={onNonDevelopableAreaChange}
                      invalid={areaMismatch}
                      className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-navy/40">
                      Non-developable (nature reserve, roads, servitudes…)
                    </span>
                  </div>
                </div>
                {areaMismatch && (
                  <p className="text-xs text-red-600">
                    Developable + non-developable ({fmt(Number(developableArea) + Number(nonDevelopableArea))}
                    {splitUnit === "ha" ? " ha" : " m²"}) doesn&apos;t match the gross site area
                    above ({fmt(totalInSplitUnit())}{splitUnit === "ha" ? " ha" : " m²"}) — check
                    both.
                  </p>
                )}
              </div>
            )}
          </div>

          {!isBasket && (
            <div className="rounded border border-navy/10 bg-navy/[0.02] p-4">
              <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-navy/70">
                <input
                  type="checkbox"
                  checked={compareAssumption}
                  onChange={(e) => setCompareAssumption(e.target.checked)}
                  className="mt-0.5"
                />
                What is the seller&apos;s expectation?
              </label>

              {compareAssumption && (
                <div className="mt-4 space-y-4 border-t border-navy/10 pt-4">
                  <p className="text-xs leading-relaxed text-navy/50">
                    A seller&apos;s asking price usually rests on a scheme somebody drew for them.
                    Capturing what that scheme is, and what it is actually based on, is what turns
                    a disagreement about price into a conversation about evidence.
                  </p>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                      Their asking price (ZAR)
                    </label>
                    <NumberInput
                      decimals={0}
                      placeholder="What they want for the land"
                      value={sellerExpectation}
                      onChange={setSellerExpectation}
                      className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                      What is that based on?
                    </label>
                    <select
                      value={expectationBasis}
                      onChange={(e) => setExpectationBasis(e.target.value as ExpectationBasis)}
                      className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    >
                      {EXPECTATION_BASES.map((b) => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs leading-relaxed text-navy/50">
                      {EXPECTATION_BASES.find((b) => b.value === expectationBasis)?.note}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                      The scheme they have in mind
                    </label>
                    <select
                      value={assumedProductType}
                      onChange={(e) => setAssumedProductType(e.target.value)}
                      className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    >
                      {products.filter((p) => p.value !== "basket_of_rights").map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                          {p.densityPerHa ? ` (${p.densityPerHa} units/ha)` : ""}
                        </option>
                      ))}
                    </select>
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs text-navy/50">
                        Override the density assumption
                      </summary>
                      <NumberInput
                        decimals={0}
                        placeholder="units per net hectare"
                        value={assumedDensityOverride}
                        onChange={setAssumedDensityOverride}
                        className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                      />
                    </details>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                      Selling price per unit in that scheme (ZAR)
                    </label>
                    <NumberInput
                      decimals={0}
                      placeholder={`leave blank to reuse R${fmt(Number(unitPrice) || 0)}`}
                      value={assumedUnitPrice}
                      onChange={setAssumedUnitPrice}
                      className="mt-1.5 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !productType || !status}
            className="w-full rounded-sm bg-navy px-6 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Calculate land estimate"}
          </button>
        </form>

        {error && (
          <div className="no-print mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* The development charges panel sits above the report so that whatever
            has been calculated by the time the report is printed is in it. */}
        <DevelopmentCharges
          className="no-print mt-6"
          municipalityCode={municipality?.code}
          municipalityName={municipality?.name}
          suggestedUnits={result?.opportunities}
          onResult={setDcResult}
        />

        {result && (
          <Report
            result={result}
            party={party}
            productLabel={products.find((p) => p.value === productType)?.label ?? ""}
            statusLabel={statuses.find((s) => s.value === status)?.label ?? ""}
            assumedResult={assumedResult}
            assumedProductLabel={products.find((p) => p.value === assumedProductType)?.label ?? ""}
            sellerExpectation={Number(sellerExpectation) || undefined}
            expectationBasisLabel={
              EXPECTATION_BASES.find((b) => b.value === expectationBasis)?.label ?? ""
            }
            dc={dcResult}
            parcels={parcels}
            municipalityName={municipality?.name}
            siteMapUrl={siteMapUrl}
          />
        )}

        {result && (
          <div className="no-print mt-6 flex justify-center">
            <button
              onClick={printReport}
              disabled={printing}
              className="rounded-sm bg-navy px-8 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep disabled:opacity-60"
            >
              {printing ? "Preparing…" : "Download / print report (PDF)"}
            </button>
          </div>
        )}

        <ContactCta context="Desktop Land Estimate" />

        <p className="no-print mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-navy/40">
          {COMPLIMENTARY_NOTE.replace(" and use of the tool is subject to the terms of use.", ", and use of the tool is subject to the ")}
          <Link href="/terms" className="underline underline-offset-2 hover:text-navy/70">
            terms of use
          </Link>
          .
        </p>

        <p className="no-print mx-auto mt-3 max-w-2xl text-center text-xs leading-relaxed text-navy/40">
          This is an estimate, not a valuation — only a registered professional valuer may
          provide a valuation. It is a starting point for discussion between buyer and seller,
          not a substitute for a full feasibility study, a survey, or professional advice.
          Assumptions are calibrated defaults and will not match every site.
        </p>

        <div className="no-print mt-10 flex justify-center pb-4">
          <a
            href="https://serviceai.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-navy/40 transition hover:text-navy/60"
          >
            powered by <span className="font-medium text-gold-deep">Propello</span>
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * The presentable report — full workings, logo, meant to be printed or
 * screen-shared with a seller. Deliberately shows the density and status
 * factor actually used: a report built to convince a seller has to show its
 * work, and both figures are already recoverable from the visible inputs and
 * result by simple division, so withholding them would cost trust for
 * nothing. See the memory note on IP gating for the reasoning in full.
 */
function Report({
  result,
  party,
  productLabel,
  statusLabel,
  assumedResult,
  assumedProductLabel,
  sellerExpectation,
  expectationBasisLabel,
  dc,
  parcels,
  municipalityName,
  siteMapUrl,
}: {
  result: QuickResult;
  party: Party;
  productLabel: string;
  statusLabel: string;
  assumedResult: QuickResult | null;
  assumedProductLabel: string;
  sellerExpectation?: number;
  expectationBasisLabel: string;
  dc: DcSummary | null;
  parcels: SelectedParcel[];
  municipalityName?: string;
  siteMapUrl?: string | null;
}) {
  const today = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
  const gapValue = assumedResult ? assumedResult.landValue - result.landValue : 0;
  const gapPct = assumedResult && result.landValue > 0 ? (gapValue / result.landValue) * 100 : 0;

  return (
    <div className="print-sheet mt-8 overflow-hidden rounded-lg border border-navy/10 bg-white shadow-sm">
      <div className="print-pad p-6">
        <div className="flex items-center justify-between border-b border-navy/10 pb-4">
          <div className="flex items-center gap-4">
            {/* Linked so a shared PDF still leads somewhere. */}
            <a href="https://investorproperty.co.za" target="_blank" rel="noopener noreferrer">
              <Image
                src="/logo.png"
                alt="Investor Property"
                width={400}
                height={400}
                className="h-28 w-28 object-contain"
              />
            </a>
            <div>
              <div className="text-base font-semibold uppercase tracking-wide text-navy">
                <a href="https://investorproperty.co.za" target="_blank" rel="noopener noreferrer">
                  Investor Property
                </a>
              </div>
              <div className="text-xs text-navy/50">Desktop Land Estimate</div>
              <div className="mt-0.5 text-[11px] text-navy/40">
                investorproperty.co.za
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-navy/50">
            <div>{today}</div>
            <div className="mt-1">
              Prepared for the {party === "seller" ? "landowner" : "developer"}
            </div>
          </div>
        </div>
        <div className="mt-4 h-1 rule-gold" />

        {/* Which ground this report is about. Printed, because a report that
            does not name its site is unusable a week later. */}
        {(parcels.length > 0 || municipalityName) && (
          <div className="mt-5 flex flex-wrap gap-4 rounded border border-navy/10 bg-navy/[0.02] px-4 py-3 text-xs">
            <div className="min-w-[180px] flex-1">
              <div className="text-[10px] uppercase tracking-wide text-navy/40">The site</div>
              <div className="mt-1 space-y-0.5 text-navy/70">
                {parcels.map((p) => (
                  <div key={p.key}>
                    <span className="font-medium text-navy">{p.label}</span> ·{" "}
                    {fmt(p.areaM2)} m² · LPI {p.lpi || "—"}
                  </div>
                ))}
                {municipalityName && <div className="text-navy/50">{municipalityName}</div>}
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- a session
                object URL, not a static/optimizable Next/Image source. */}
            {siteMapUrl && (
              <img
                src={siteMapUrl}
                alt="Satellite view of the site with its registered boundary"
                className="h-32 w-32 shrink-0 rounded border border-navy/10 object-cover"
              />
            )}
          </div>
        )}

        {assumedResult ? (
          <>
            {/* The scheme actually contemplated leads; the rights the site
                carries today are the floor under it. */}
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-gold-deep">
              Estimated land value — the scheme contemplated
            </p>
            <p className="mt-2 text-4xl font-light text-gold-gradient">
              {rand(assumedResult.landValue)}
            </p>
            <p className="mt-1 text-sm text-navy/60">
              {assumedProductLabel} · {fmt(assumedResult.opportunities)} opportunities
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded border border-gold/40 bg-gold/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-gold-deep">
                  The scheme contemplated
                </p>
                <p className="mt-1 text-2xl font-light text-navy">{rand(assumedResult.landValue)}</p>
                <p className="mt-1 text-xs text-navy/50">{assumedProductLabel}</p>
                <p className="text-xs text-navy/50">{fmt(assumedResult.opportunities)} opportunities</p>
                {expectationBasisLabel && (
                  <p className="mt-2 border-t border-gold/20 pt-2 text-[11px] text-navy/50">
                    Based on: {expectationBasisLabel}
                  </p>
                )}
              </div>
              <div className="rounded border border-navy/10 p-4">
                <p className="text-[11px] uppercase tracking-wide text-navy/40">
                  Rights approved today
                </p>
                <p className="mt-1 text-2xl font-light text-navy/70">{rand(result.landValue)}</p>
                <p className="mt-1 text-xs text-navy/50">{productLabel}</p>
                <p className="text-xs text-navy/50">{fmt(result.opportunities)} opportunities</p>
              </div>
            </div>

            <div className="mt-3 rounded bg-navy/5 px-4 py-3 text-sm text-navy/80">
              Gap: <strong>{rand(Math.abs(gapValue))}</strong> ({gapPct >= 0 ? "+" : ""}
              {gapPct.toFixed(0)}%)
              {gapValue > 0
                ? " — the scheme contemplated is worth more than the rights the site carries today. That difference is what a rezoning or departure still has to deliver, and it is where the planning risk sits."
                : gapValue < 0
                  ? " — the scheme contemplated is worth less than the approved rights. The site may already be consented for something better."
                  : " — the scheme contemplated and the approved rights value the same."}
            </div>

            {/* The asking price against both figures — the actual negotiation. */}
            {sellerExpectation !== undefined && sellerExpectation > 0 && (
              <div className="mt-3 rounded border border-navy/15 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-navy/40">
                    Seller&apos;s asking price
                  </span>
                  <span className="text-xl font-light text-navy">{rand(sellerExpectation)}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-navy/60">
                  That is{" "}
                  <strong className="text-navy">
                    {rand(Math.abs(sellerExpectation - assumedResult.landValue))}
                  </strong>{" "}
                  {sellerExpectation > assumedResult.landValue ? "above" : "below"} what this
                  estimate carries for the scheme contemplated, and{" "}
                  <strong className="text-navy">
                    {rand(Math.abs(sellerExpectation - result.landValue))}
                  </strong>{" "}
                  {sellerExpectation > result.landValue ? "above" : "below"} what the approved
                  rights carry.
                  {sellerExpectation > assumedResult.landValue &&
                    " Closing that gap means either the rights improving, the selling prices improving, or the expectation moving."}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-gold-deep">Estimated land value</p>
            <p className="mt-2 text-4xl font-light text-gold-gradient">{rand(result.landValue)}</p>
          </>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-navy/10 pt-6 text-sm sm:grid-cols-4">
          {/* Both of these are shares of the LAND value, not selling prices.
              Labelled "Per opportunity" they read as the unit price that was
              typed in, which is alarming when a R1.44m unit shows R144 000. */}
          <Metric label="Land value per hectare" value={rand(result.valuePerHectare)} />
          <Metric label="Land value per opportunity" value={rand(result.valuePerOpportunity)} />
          <Metric label="Opportunities" value={fmt(result.opportunities)} />
          <Metric label="Status factor" value={`${(result.statusPctUsed * 100).toFixed(1)}%`} />
          <Metric label="Density (per net ha)" value={`${fmt(result.densityUsed)} units/ha`} />
          <Metric label="Density (per gross ha)" value={`${fmt(result.effectiveDensityPerGrossHectare)} units/ha`} />
          <Metric label="Net developable" value={`${(result.netRatioUsed * 100).toFixed(0)}%`} />
          <Metric label="Non-developable" value={`${fmtHa(result.nonDevelopableHectares)} ha`} />
        </div>

        {/* A floor factor can buy a density well beyond anything a rule of
            thumb would produce. Saying so is the point — it is the difference
            between the tool agreeing with a planner and arguing with one. */}
        {result.bulk?.exceedsDensityLadder && (
          <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            At {fmt(result.densityUsed)} units per net hectare this site is denser than any of our
            standard density assumptions, the highest of which is 120. That is not an error — a
            generous floor factor on a constrained site does exactly this. It does mean the figure
            rests on the floor factor being granted as entered.
          </p>
        )}

        {/* Developer's use first when there is one, because that is the
            figure the report now leads with. The approved-rights workings sit
            under it as the floor, not above it as the headline. */}
        {assumedResult && (
          <>
            <h2 className="mt-8 border-t border-navy/10 pt-6 text-sm font-medium uppercase tracking-wide text-navy/60">
              The workings — developer&apos;s intended use
            </h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                <Row label="Net developable area" value={`${fmtHa(assumedResult.netHectares)} ha`} />
                <Row label="Intended use" value={assumedProductLabel} />
                <Row
                  label="× Density"
                  value={`${fmt(assumedResult.densityUsed)} units per net hectare`}
                />
                <Row label="= Opportunities" value={fmt(assumedResult.opportunities)} strong />
                <Row
                  label="× Selling price per unit"
                  value={rand(assumedResult.valuePerOpportunity / assumedResult.statusPctUsed)}
                />
                <Row
                  label="× Status of the opportunity"
                  value={`${statusLabel} (${(assumedResult.statusPctUsed * 100).toFixed(1)}%)`}
                />
                <Row
                  label="= Estimated land value"
                  value={rand(assumedResult.landValue)}
                  strong
                  final
                />
              </tbody>
            </table>
          </>
        )}

        <h2 className="mt-8 border-t border-navy/10 pt-6 text-sm font-medium uppercase tracking-wide text-navy/60">
          The workings{assumedResult ? " — rights approved today" : ""}
        </h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            <Row label="Gross site area" value={`${fmtHa(result.grossHectares)} ha`} />
            <Row
              label={`Less: non-developable area (${result.areaSplitMode === "absolute" ? "as supplied" : "estimated"})`}
              value={`${fmtHa(result.nonDevelopableHectares)} ha`}
            />
            <Row label="= Net developable area" value={`${fmtHa(result.netHectares)} ha`} strong />
            <Row label="What can be built" value={productLabel} />
            {result.opportunitiesWereApproved ? (
              // A density or floor-factor working here would show its own,
              // different opportunity count sitting right above the actual
              // approved one below — worse than showing neither.
              <Row
                label="Opportunities approved (from the approval document)"
                value={fmt(result.opportunities)}
              />
            ) : result.bulk ? (
              <>
                {/* Bulk is granted on the gross site, so the workings have to
                    show that — otherwise the floor area looks wrong against
                    the net area two rows above. */}
                <Row
                  label="× Floor factor (on gross site area)"
                  value={result.bulk.floorFactor.toFixed(2)}
                />
                <Row
                  label="= Total floor space"
                  value={`${fmt(result.bulk.totalFloorAreaM2)} m²`}
                  strong
                />
                {result.bulk.coverage !== undefined && (
                  <Row
                    label="Site coverage"
                    value={`${(result.bulk.coverage * 100).toFixed(1)}%`}
                  />
                )}
                <Row
                  label="÷ Average unit size"
                  value={`${fmt(result.bulk.averageUnitSizeM2)} m²`}
                />
              </>
            ) : (
              !result.basketBreakdown && (
                <Row label="× Density" value={`${fmt(result.densityUsed)} units per net hectare`} />
              )
            )}
            <Row label="= Opportunities" value={fmt(result.opportunities)} strong />
            {!result.basketBreakdown && (
              <Row label="× Average selling price per unit" value={rand(result.valuePerOpportunity / result.statusPctUsed)} />
            )}
            <Row label="× Status of the opportunity" value={`${statusLabel} (${(result.statusPctUsed * 100).toFixed(1)}%)`} />
            <Row label="= Estimated land value" value={rand(result.landValue)} strong final />
          </tbody>
        </table>

        {result.basketBreakdown && (
          <>
            <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-navy/50">
              Basket of rights — by unit type
            </h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-[11px] uppercase tracking-wide text-navy/40">
                  <th className="py-1.5 font-medium">Unit type</th>
                  <th className="py-1.5 text-right font-medium">Opportunities</th>
                  <th className="py-1.5 text-right font-medium">Price per Opportunity</th>
                  <th className="py-1.5 text-right font-medium">Gross realisation</th>
                </tr>
              </thead>
              <tbody>
                {result.basketBreakdown.map((row, i) => (
                  // Index, not unitType — the same type can legitimately
                  // appear twice now that it's picked from a dropdown (two
                  // rows of "Simplex townhouse" at different price points).
                  <tr key={i} className="border-b border-navy/5">
                    <td className="py-1.5">{row.unitType}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(row.opportunities)}</td>
                    <td className="py-1.5 text-right tabular-nums">{rand(row.pricePerOpportunity)}</td>
                    <td className="py-1.5 text-right tabular-nums">{rand(row.grossRealisation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {result.netRatioWasDefaulted && (
          <p className="mt-6 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Net developable area was not supplied, so a conservative 60% default was used.
          </p>
        )}

        {/* What the municipality charges on top. Only printed when it has
            actually been calculated — an empty section in a PDF is worse than
            no section. */}
        {dc && (
          <>
            <h2 className="mt-8 border-t border-navy/10 pt-6 text-sm font-medium uppercase tracking-wide text-navy/60">
              Development charges — {dc.municipalityName}
            </h2>
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr className="border-b border-navy/10 text-left text-[10px] uppercase tracking-wide text-navy/40">
                  <th className="py-2 font-medium">Land use</th>
                  <th className="py-2 text-right font-medium">Charged on</th>
                  <th className="py-2 text-right font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Charge</th>
                </tr>
              </thead>
              <tbody>
                {dc.lines.map((l) => (
                  <tr key={l.code} className="border-b border-navy/5">
                    <td className="py-2 pr-2">
                      <span className="font-medium text-navy">{l.code}</span>
                      <span className="ml-1.5 text-navy/50">{l.label}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{fmt(l.additionalDemand)}</td>
                    <td className="py-2 text-right tabular-nums text-navy/60">
                      {rand(l.ratePerUnit)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{rand(l.charge)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-navy/70">
                <tr>
                  <td colSpan={3} className="py-1.5 text-right">Bulk services</td>
                  <td className="py-1.5 text-right tabular-nums">{rand(dc.bulkServices)}</td>
                </tr>
                {dc.linkServices > 0 && (
                  <tr>
                    <td colSpan={3} className="py-1.5 text-right">Link services</td>
                    <td className="py-1.5 text-right tabular-nums">{rand(dc.linkServices)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="py-1.5 text-right">VAT</td>
                  <td className="py-1.5 text-right tabular-nums">{rand(dc.vat)}</td>
                </tr>
                <tr className="border-t border-navy/20 text-sm font-medium text-navy">
                  <td colSpan={3} className="py-2.5 text-right">Total development charges</td>
                  <td className="py-2.5 text-right tabular-nums">{rand(dc.total)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-2 text-[11px] leading-relaxed text-navy/45">
              Charged on the increase in demand — existing rights are credited. Rates are the{" "}
              {dc.rateYear} figures{dc.projectedRates ? ", projected forward by the CPAF" : ""} and
              escalate every 1 July.
              {dc.linkServices === 0 &&
                " Link services are not included; the City does not derive them."}
            </p>
          </>
        )}

        {/* Morné's own counsel, printed with every report rather than given
            verbally to whoever happens to be in the room. */}
        <h2 className="mt-8 border-t border-navy/10 pt-6 text-sm font-medium uppercase tracking-wide text-navy/60">
          Before you rely on this
        </h2>
        <div className="mt-3 space-y-3">
          {dueDiligenceNotes(party).map((n) => (
            <div key={n.heading}>
              <div className="text-xs font-semibold text-navy">{n.heading}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-navy/65">{n.body}</p>
            </div>
          ))}
        </div>

        {/* Structure decides who can transact at all, which matters most to
            the party who usually only knows about the first column. */}
        <h2 className="mt-8 border-t border-navy/10 pt-6 text-sm font-medium uppercase tracking-wide text-navy/60">
          How the deal can be structured
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-navy/55">
          Price is only half the question. How a deal is structured decides how much risk each side
          carries, and how many buyers can transact at all.
        </p>
        <table className="mt-3 w-full text-[11px]">
          <thead>
            <tr className="border-b border-navy/10 text-left uppercase tracking-wide text-navy/40">
              <th className="py-2 font-medium">&nbsp;</th>
              {DEAL_STRUCTURES.map((d) => (
                <th key={d.key} className="py-2 font-medium text-navy/60">{d.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top text-navy/70">
            {(
              [
                ["Relationship", "relationship"],
                ["Land ownership", "ownership"],
                ["Upfront capital", "upfrontCapital"],
                ["Risk", "risk"],
                ["Control", "control"],
                ["Profit", "profit"],
              ] as const
            ).map(([label, key]) => (
              <tr key={key} className="border-b border-navy/5">
                <td className="py-2 pr-3 font-medium text-navy/50">{label}</td>
                {DEAL_STRUCTURES.map((d) => (
                  <td key={d.key} className="py-2 pr-3 leading-relaxed">{d.rows[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 rounded bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-900">
          {CASH_CEILING_NOTE}
        </p>

        <p className="mx-auto mt-8 max-w-2xl border-t border-navy/10 pt-4 text-center text-[11px] leading-relaxed text-navy/40">
          Prepared by Investor Property as a discussion starting point for both parties. This is
          an estimate, not a valuation — only a registered professional valuer may provide a
          valuation. It is not a substitute for a full feasibility study, a land survey, or
          professional advice. Figures are calibrated assumptions and will not match every site
          exactly. No information about this property has been stored.
        </p>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-navy/35">
          © {new Date().getFullYear()} Investor Property. All rights reserved. The methodology and
          assumptions in this report are proprietary to Investor Property and are provided subject
          to the terms of use at investorproperty.co.za/terms. This report may be shared only
          complete and unaltered.
        </p>
        <p className="mt-2 text-center text-[10px] text-navy/30">powered by Propello</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-navy/40">{label}</p>
      <p className="mt-0.5 font-medium text-navy">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  final: isFinal,
}: {
  label: string;
  value: string;
  strong?: boolean;
  final?: boolean;
}) {
  return (
    <tr className={isFinal ? "border-t-2 border-navy/20" : "border-t border-navy/5"}>
      <td className={`py-1.5 ${strong ? "font-medium text-navy" : "text-navy/60"}`}>{label}</td>
      <td className={`py-1.5 text-right tabular-nums ${strong ? "font-semibold text-navy" : "text-navy/70"} ${isFinal ? "text-lg" : ""}`}>
        {value}
      </td>
    </tr>
  );
}
