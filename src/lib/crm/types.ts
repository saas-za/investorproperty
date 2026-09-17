/**
 * Investor Property's own CRM Matrix — a replacement for Morné's personal
 * land-brokerage spreadsheet, not the multi-tenant Propello system built for
 * ConveyAssist. Deliberately single-user: no roles, no round-robin, no
 * portal-per-audience. He sends from his own Google Workspace account
 * directly, so there is no sender-identity problem to solve here at all.
 *
 * Two kinds of "thing being brokered", matching his own naming:
 *   - Property  — a listing currently on offer (land, commercial, industrial…)
 *   - Land opportunity — land being sourced/packaged for a developer, tracked
 *     on its own tab because it isn't a listing yet, it's a pipeline
 */

export type PropertyType = "Land" | "Commercial" | "Industrial" | "Retail" | "Office" | "Residential";

export type PropertyStatus = "Available" | "Under Offer" | "Sold" | "Withdrawn";

export interface Property {
  id: string;
  name: string;
  location: string;
  type: PropertyType;
  sizeM2?: number;
  sizeHa?: number;
  askingPrice: number;
  status: PropertyStatus;
  sellerName?: string;
  sellerContact?: string;
  notes?: string;
}

/** Current vs proposed zoning — the same distinction New Listing.js already tracks. */
export type LandStage =
  | "Sourcing"
  | "Owner contacted"
  | "Under negotiation"
  | "Packaged"
  | "Under offer"
  | "Sold"
  | "Withdrawn";

/**
 * One cadastral parcel attached to a land opportunity, picked off the map.
 *
 * A site is often several parcels being consolidated, which is why this is a
 * list rather than a single erf number — and why the area on the row is the
 * sum rather than any one parcel's extent.
 */
export interface AttachedParcel {
  /** Surveyor-General parcel key — the stable identifier, not the erf number. */
  key: string;
  /** The 21-character LPI code, same form as the land spreadsheet uses. */
  lpi: string;
  /** "Erf 4651" or "Farm 512 Portion 3". */
  label: string;
  areaM2: number;
  province: string;
  registrationDivision: string;
  /**
   * Rough centre point, kept even though the full boundary deliberately
   * isn't (a stored boundary goes stale on subdivision; a centroid barely
   * moves). Lets the land-opportunity email re-derive a fresh, current
   * boundary at send time rather than mailing out a stale one.
   */
  centroid: { lat: number; lng: number };
}

export type Language = "en" | "af";

/**
 * A developer contact, in the shape Morné's own land spreadsheet already
 * uses — a name, a language (his email is bilingual and sends whichever
 * matches), and up to two contacts.
 */
export interface Developer {
  id: string;
  name: string;
  language: Language;
  contact1Name: string;
  contact1Email: string;
  contact2Name?: string;
  contact2Email?: string;
}

/**
 * The status ladder his sheet's conditional formatting already tracks per
 * developer per property. "Mail" isn't a stored state here — it's the
 * button; pressing it sends and the state becomes "Mailed" in the same
 * action, rather than "Mail" sitting in a cell waiting for a trigger to
 * notice it changed.
 */
export type DeveloperInterest = "Not mailed" | "Mailed" | "Interested" | "Not interested";

export const DEVELOPER_INTEREST_STYLES: Record<DeveloperInterest, string> = {
  "Not mailed": "bg-red-50 text-red-700 ring-red-200",
  Mailed: "bg-amber-50 text-amber-800 ring-amber-200",
  Interested: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "Not interested": "bg-slate-100 text-slate-500 ring-slate-300",
};

/** One cell of the developer × opportunity matrix his "Developers" tab is. */
export interface LandDeveloperInterest {
  landId: string;
  developerId: string;
  status: DeveloperInterest;
  mailedAt?: string;
}

export interface LandOpportunity {
  id: string;
  name: string;
  location: string;
  erfNo?: string;
  lpiCode?: string;
  areaHa: number;
  currentZoning: string;
  proposedZoning?: string;
  askingPrice?: number;
  stage: LandStage;
  ownerName?: string;
  ownerContact?: string;
  developerInterest?: string;
  notes?: string;
  /** Parcels confirmed against the national cadastre rather than typed in. */
  parcels?: AttachedParcel[];
  /** Municipality the site falls in — decides which DC rate set applies. */
  municipality?: string;
  municipalityCode?: string;
}

export type Temperature = "New" | "Warm" | "Hot" | "Lost";

export interface CrmLead {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  temperature: Temperature;
  lastContactAt?: string;
  steps: Record<string, "pending" | "sent" | "replied" | "bounced">;
  notes?: string;
}

export type BrokerTaskState = "not_started" | "in_progress" | "done" | "blocked";

export interface BrokerDeal {
  id: string;
  propertyId: string;
  counterparty: string; // buyer or developer name
  agreedPrice: number;
  signatureDate: string;
  tasks: Record<string, BrokerTaskState>;
  commissionValue?: number;
  notes?: string;
}

export interface BrokerTaskDef {
  key: string;
  order: number;
  label: string;
  short: string;
}

export const CAMPAIGN_STEPS = [
  { key: "welcome", order: 1, label: "Welcome" },
  { key: "info_pack", order: 2, label: "Info pack sent" },
  { key: "follow_up", order: 3, label: "Follow-up" },
  { key: "closing", order: 4, label: "Closing down" },
] as const;

export const BROKER_TASKS: BrokerTaskDef[] = [
  { key: "offer_submitted", order: 1, label: "Offer submitted", short: "Offer" },
  { key: "offer_accepted", order: 2, label: "Offer accepted", short: "Accepted" },
  { key: "due_diligence", order: 3, label: "Due diligence", short: "DD" },
  { key: "fica", order: 4, label: "FICA complete", short: "FICA" },
  { key: "sale_agreement", order: 5, label: "Sale agreement signed", short: "AOS" },
  { key: "deposit", order: 6, label: "Deposit paid", short: "Deposit" },
  { key: "attorney_instructed", order: 7, label: "Attorney instructed", short: "Attorney" },
  { key: "guarantees", order: 8, label: "Guarantees delivered", short: "Gtee" },
  { key: "registered", order: 9, label: "Registered", short: "Reg" },
  { key: "commission", order: 10, label: "Commission invoiced & paid", short: "Comm" },
];

export const PROPERTY_STATUS_STYLES: Record<PropertyStatus, string> = {
  Available: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  "Under Offer": "bg-amber-100 text-amber-800 ring-amber-300",
  Sold: "bg-slate-200 text-slate-600 ring-slate-300",
  Withdrawn: "bg-red-100 text-red-700 ring-red-300",
};

export const LAND_STAGE_STYLES: Record<LandStage, string> = {
  Sourcing: "bg-slate-100 text-slate-700 ring-slate-300",
  "Owner contacted": "bg-sky-100 text-sky-800 ring-sky-300",
  "Under negotiation": "bg-amber-100 text-amber-800 ring-amber-300",
  Packaged: "bg-violet-100 text-violet-800 ring-violet-300",
  "Under offer": "bg-orange-100 text-orange-800 ring-orange-300",
  Sold: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  Withdrawn: "bg-red-100 text-red-700 ring-red-300",
};

export const TEMPERATURE_STYLES: Record<Temperature, string> = {
  New: "bg-slate-100 text-slate-700 ring-slate-300",
  Warm: "bg-amber-100 text-amber-800 ring-amber-300",
  Hot: "bg-red-100 text-red-700 ring-red-300",
  Lost: "bg-slate-50 text-slate-400 ring-slate-200",
};

export const STEP_STYLES: Record<string, { dot: string; cell: string; label: string }> = {
  pending: { dot: "bg-slate-200", cell: "bg-white hover:bg-slate-50", label: "Not sent" },
  sent: { dot: "bg-emerald-500", cell: "bg-emerald-50 hover:bg-emerald-100", label: "Sent" },
  replied: { dot: "bg-sky-500", cell: "bg-sky-50 hover:bg-sky-100", label: "Replied" },
  bounced: { dot: "bg-red-500", cell: "bg-red-50 hover:bg-red-100", label: "Bounced" },
};

export const TASK_STYLES: Record<BrokerTaskState, { dot: string; cell: string; label: string }> = {
  not_started: { dot: "bg-slate-200", cell: "bg-white hover:bg-slate-50", label: "Not started" },
  in_progress: { dot: "bg-amber-400", cell: "bg-amber-50 hover:bg-amber-100", label: "In progress" },
  done: { dot: "bg-emerald-500", cell: "bg-emerald-50 hover:bg-emerald-100", label: "Done" },
  blocked: { dot: "bg-red-500", cell: "bg-red-50 hover:bg-red-100", label: "Blocked" },
};

export const TASK_STATE_ORDER: BrokerTaskState[] = ["not_started", "in_progress", "done", "blocked"];
export const STEP_STATE_ORDER = ["pending", "sent", "replied", "bounced"] as const;
