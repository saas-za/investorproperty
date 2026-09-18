/**
 * Morné's own advice to clients, written down so the tool gives it the same
 * way every time rather than depending on him being in the room.
 *
 * Deliberately not server-only: this is the part he *wants* people to read and
 * repeat. The calibration behind the numbers stays gated; the counsel around
 * them is the reason the tool is worth putting his name on.
 */

export type Party = "developer" | "seller";

export const PARTY_LABELS: Record<Party, string> = {
  developer: "I'm the developer / buyer",
  seller: "I'm the seller / landowner",
};

/**
 * The due-diligence warning. Shown on every result, on screen and in the
 * printed report — never dropped for space. The point each paragraph makes is
 * the same for both parties; who is exposed by it is not, so the wording
 * turns to face whoever is reading.
 */
export function dueDiligenceNotes(party: Party): { heading: string; body: string }[] {
  const you = party === "seller" ? "seller" : "developer";
  return [
    {
      heading: "Every price here is subject to a due diligence",
      body:
        party === "seller"
          ? "No figure on this page is an offer, and no buyer will treat it as one. It is the starting point for a due diligence, and the number that survives that process is the one that matters."
          : "Nothing here substitutes for your own due diligence. Treat it as the number that tells you whether a site is worth the cost of investigating properly, not as the number you offer.",
    },
    {
      heading: "The market decides the price, not the zoning",
      body:
        "Land is worth what the product on it can be sold for. Rights permit a building; they do not create buyers for it. A site cannot be filled with flats if the market in that node wants townhouses, and a scheme that maximises permitted bulk against the wrong demand is worth less than the arithmetic suggests.",
    },
    {
      heading: "The opportunity count will move, and the price moves with it",
      body:
        `Opportunity cost is properly applied only once the due diligence is finished. If the number of opportunities changes — and after a traffic study, a services report or a planner's comment it usually does — the price the developer can pay changes with it. ${
          party === "seller"
            ? "An offer withdrawn or revised at that point is not bad faith; it is the process working."
            : "Build that revision into your offer structure rather than discovering it late."
        }`,
    },
    {
      heading: "Holding cost is the difference between the two views",
      body:
        `The ${you} should understand both sides of this. A seller has the lowest cost of holding land — they already own it. A developer paying cash carries interest from the day of transfer, through approvals, through servicing, and interest spent comes straight off the profit margin. That reduction hits viability, and viability is what sets the price a developer can justify. It is why two honest parties looking at the same site arrive at different numbers.`,
    },
  ];
}

export interface DealStructure {
  key: "outright" | "jv" | "codev";
  name: string;
  summary: string;
  rows: {
    relationship: string;
    ownership: string;
    upfrontCapital: string;
    risk: string;
    control: string;
    profit: string;
  };
}

/**
 * The three ways a landowner can go to market with a developer. Included for
 * the seller's benefit — most landowners only know about the first one, and
 * the first one is frequently not the one that pays them most.
 */
export const DEAL_STRUCTURES: DealStructure[] = [
  {
    key: "outright",
    name: "Outright purchase",
    summary:
      "The developer buys the property for an agreed amount and title transfers on registration. The landowner gets immediate liquidity and carries no future project risk; the developer takes on all of the entitlement, construction and market risk, and keeps all of the profit.",
    rows: {
      relationship: "Buyer and seller",
      ownership: "Transfers 100% to the developer at closing",
      upfrontCapital: "High — full purchase price plus transfer costs",
      risk: "100% on the developer; none on the landowner after transfer",
      control: "100% developer control",
      profit: "Fixed payout to the landowner; 100% of profit to the developer",
    },
  },
  {
    key: "jv",
    name: "Joint venture",
    summary:
      "The landowner contributes the land as equity into a special purpose vehicle rather than selling it. The developer contributes expertise, funding and construction management. It preserves the developer's capital and lets the landowner share in the upside — in exchange for carrying development risk they would not have carried in a sale.",
    rows: {
      relationship: "Landowner and developer",
      ownership: "Contributed as equity into an SPV or contractual partnership",
      upfrontCapital: "Low — the developer avoids the land acquisition cost upfront",
      risk: "Shared between landowner and developer",
      control: "Shared governance, defined in the JV or shareholders' agreement",
      profit: "Split on an agreed ratio, or on hurdle rates",
    },
  },
  {
    key: "codev",
    name: "Co-development",
    summary:
      "Two or more developers, or a developer with an institutional equity partner, pool resources on one project. Unlike a JV built around a land contribution, this is about shared execution — one partner may carry zoning, financing and legal while the other carries civils, construction and project management.",
    rows: {
      relationship: "Developer and developer, or developer and equity partner",
      ownership: "Co-owned, or held in a joint SPV",
      upfrontCapital: "Shared between co-developers",
      risk: "Shared, on the equity split",
      control: "Shared, split by expertise",
      profit: "Split on capital contributions and management fees",
    },
  },
];

/**
 * The cash ceiling. Worth stating plainly because it silently decides who can
 * even bid: land and bulk services are the two things a developer generally
 * cannot raise debt against.
 */
export const CASH_CEILING_NOTE =
  "Above roughly R50 million, an outright cash purchase becomes difficult — not because the land is not worth it, but because of how long approvals take and what that money is doing in the meantime. Few developers hold that much cash for land and then more again for services, and neither is readily financeable. Some houses will lend against a balance sheet rather than the asset, but that narrows the field of buyers considerably. A seller holding a large site should understand that the structure on offer, not only the price, decides how many buyers can transact at all.";

export const COMPLIMENTARY_NOTE =
  "This is a complimentary standalone tool built by Investor Property. Certain figures from your calculation — the developable-area split, what's being built, and indicative pricing — are recorded anonymously to improve the tool's assumptions over time; no name, contact detail or exact property identifier is ever attached to them. The methodology and assumptions behind it are proprietary, and use of the tool is subject to the terms of use.";
