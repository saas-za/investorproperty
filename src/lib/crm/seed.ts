import type { BrokerDeal, CrmLead, Developer, LandDeveloperInterest, LandOpportunity, Property } from "./types";

export const TODAY = "2026-09-17";

/**
 * Demo contacts, not Morné's real developer list — his actual list (~75
 * names, real emails, pasted from his working spreadsheet while reading it)
 * stays where it is and is never seeded into this repo. He can replace these
 * with real developers through the CRM itself once the "add a developer"
 * step exists.
 */
export const developers: Developer[] = [
  { id: "d1", name: "Century Property Development", language: "en", contact1Name: "Mark", contact1Email: "mark@example-century.co.za", contact2Name: "George", contact2Email: "george@example-century.co.za" },
  { id: "d2", name: "Arcis Property Development", language: "af", contact1Name: "Wian", contact1Email: "wian@example-arcis.co.za" },
  { id: "d3", name: "Nova Build", language: "en", contact1Name: "Jason", contact1Email: "jason@example-novabuild.co.za" },
  { id: "d4", name: "Remey Developments", language: "af", contact1Name: "Johan", contact1Email: "johan@example-remey.co.za" },
];

export const landDeveloperInterest: LandDeveloperInterest[] = [
  { landId: "l1", developerId: "d4", status: "Interested", mailedAt: "2026-08-20" },
  { landId: "l4", developerId: "d1", status: "Mailed", mailedAt: "2026-09-01" },
];

export const properties: Property[] = [
  {
    id: "p1", name: "Bellville Industrial Park — Unit 4", location: "Bellville, Cape Town",
    type: "Industrial", sizeM2: 1850, askingPrice: 18_500_000, status: "Available",
    sellerName: "Voortrekker Holdings", sellerContact: "willem@voortrekkerholdings.co.za",
  },
  {
    id: "p2", name: "Main Road Retail — Corner Stand", location: "Brackenfell, Cape Town",
    type: "Retail", sizeM2: 620, askingPrice: 9_200_000, status: "Under Offer",
    sellerName: "Estate of J. Marais", sellerContact: "executor@maraisestate.co.za",
  },
  {
    id: "p3", name: "Century City Office Suite 8B", location: "Century City, Cape Town",
    type: "Office", sizeM2: 340, askingPrice: 6_100_000, status: "Available",
    sellerName: "Peninsula Investments", sellerContact: "info@peninsulainv.co.za",
  },
  {
    id: "p4", name: "Malmesbury Vacant Land — Erf 1204", location: "Malmesbury, Swartland",
    type: "Land", sizeHa: 2.4, askingPrice: 4_800_000, status: "Available",
    sellerName: "Du Toit Trust", sellerContact: "dutoittrust@gmail.com",
  },
  {
    id: "p5", name: "N7 Warehouse & Yard", location: "Killarney Gardens, Cape Town",
    type: "Industrial", sizeM2: 3200, askingPrice: 27_000_000, status: "Sold",
    sellerName: "Freightways SA", sellerContact: "property@freightways.co.za",
  },
  {
    id: "p6", name: "Durbanville Residential Portfolio (4 units)", location: "Durbanville, Cape Town",
    type: "Residential", sizeM2: 980, askingPrice: 12_400_000, status: "Withdrawn",
    sellerName: "Private seller",
  },
];

/** Development Land — the sourcing pipeline, its own tab, not scoped to a listing. */
export const landOpportunities: LandOpportunity[] = [
  {
    id: "l1", name: "Oliphantskop Portion 27", location: "Langebaan, West Coast",
    erfNo: "27", lpiCode: "C08800000000002700000", areaHa: 30.54,
    currentZoning: "Agricultural", proposedZoning: "Residential I (Town Housing)",
    askingPrice: 100_000_000, stage: "Packaged",
    ownerName: "Oliphantskop Farming Trust", developerInterest: "Matterhorn Properties",
  },
  {
    id: "l2", name: "Klipheuwel Farm Portion 4", location: "Klipheuwel, Swartland",
    erfNo: "4", areaHa: 18.2, currentZoning: "Agricultural", proposedZoning: "General Industrial",
    askingPrice: 22_000_000, stage: "Under negotiation",
    ownerName: "J & M Steenkamp", ownerContact: "steenkampfarm@gmail.com",
  },
  {
    id: "l3", name: "Riebeek Kasteel Erf 340", location: "Riebeek Kasteel, Swartland",
    erfNo: "340", areaHa: 3.1, currentZoning: "Agricultural", proposedZoning: undefined,
    stage: "Sourcing", ownerName: "Private seller",
  },
  {
    id: "l4", name: "Saldanha Bay Portion 9", location: "Saldanha, West Coast",
    erfNo: "9", areaHa: 45.0, currentZoning: "Agricultural", proposedZoning: "Business Zone II",
    askingPrice: 65_000_000, stage: "Owner contacted",
    ownerName: "Saldanha Bay Trust", developerInterest: "Growthpoint (enquired)",
  },
  {
    id: "l5", name: "Vredenburg Extension Site", location: "Vredenburg, West Coast",
    erfNo: "112", areaHa: 8.7, currentZoning: "Agricultural", proposedZoning: "Residential II",
    askingPrice: 14_000_000, stage: "Sold",
    ownerName: "Vredenburg Boerdery", developerInterest: "Remey Developments",
  },
];

export const crmLeads: CrmLead[] = [
  {
    id: "cl1", propertyId: "p1", name: "Riaan de Bruyn", email: "riaan@dbtransport.co.za",
    phone: "082 556 1290", source: "Property24", temperature: "Hot", lastContactAt: "2026-09-15",
    steps: { welcome: "sent", info_pack: "sent", follow_up: "replied", closing: "pending" },
  },
  {
    id: "cl2", propertyId: "p1", name: "Naledi Mokwena", email: "naledi@coldstorage.co.za",
    source: "Referral", temperature: "Warm", lastContactAt: "2026-09-10",
    steps: { welcome: "sent", info_pack: "sent", follow_up: "pending", closing: "pending" },
  },
  {
    id: "cl3", propertyId: "p2", name: "Andre Fourie", email: "andre@fouriehold.co.za",
    phone: "083 220 7741", source: "Website enquiry", temperature: "Hot", lastContactAt: "2026-09-16",
    steps: { welcome: "sent", info_pack: "sent", follow_up: "sent", closing: "pending" },
  },
  {
    id: "cl4", propertyId: "p3", name: "Chantal Adams", email: "chantal.adams@icloud.com",
    source: "Property24", temperature: "New", lastContactAt: "2026-09-16",
    steps: { welcome: "pending", info_pack: "pending", follow_up: "pending", closing: "pending" },
  },
  {
    id: "cl5", propertyId: "p4", name: "Pieter Malan", email: "pieter@remeydev.co.za",
    phone: "084 771 0022", source: "Direct enquiry", temperature: "Warm", lastContactAt: "2026-09-08",
    steps: { welcome: "sent", info_pack: "sent", follow_up: "pending", closing: "pending" },
  },
];

export const brokerDeals: BrokerDeal[] = [
  {
    id: "bd1", propertyId: "p2", counterparty: "Andre Fourie", agreedPrice: 8_950_000,
    signatureDate: "2026-08-20", commissionValue: 358_000,
    tasks: {
      offer_submitted: "done", offer_accepted: "done", due_diligence: "done", fica: "done",
      sale_agreement: "done", deposit: "done", attorney_instructed: "in_progress",
      guarantees: "not_started", registered: "not_started", commission: "not_started",
    },
  },
  {
    id: "bd2", propertyId: "p5", counterparty: "Pick n Pay Distribution", agreedPrice: 26_500_000,
    signatureDate: "2026-05-12", commissionValue: 1_060_000,
    tasks: {
      offer_submitted: "done", offer_accepted: "done", due_diligence: "done", fica: "done",
      sale_agreement: "done", deposit: "done", attorney_instructed: "done",
      guarantees: "done", registered: "done", commission: "done",
    },
  },
];
