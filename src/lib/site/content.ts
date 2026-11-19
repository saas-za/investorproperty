/**
 * Everything the public pages say, in one place so the wording can be reviewed
 * and changed without touching layout.  No figures, track record or claims that
 * Morné has not supplied: the copy states what the firm does and explains the
 * subject in general terms.
 */

export const site = {
  name: "Investor Property",
  url: "https://www.investorproperty.co.za",
  phone: "075 925 7071",
  phoneTel: "+27759257071",
  email: "info@investorproperty.co.za",
  contactEmail: "morne@investorproperty.co.za",
  place: "Vredekloof, Cape Town, 7560",
  tagline: "Commercial property brokerage in Cape Town",
} as const;

export type Offer = {
  slug: string;
  name: string;
  /** Short line used on cards. */
  blurb: string;
  /** <title> and H1 wording aimed at what people search for. */
  title: string;
  description: string;
  intro: string;
  forWho: string[];
  how: { head: string; body: string }[];
  faqs: { q: string; a: string }[];
};

export const offers: Offer[] = [
  {
    slug: "industrial",
    name: "Industrial",
    blurb:
      "Sales and rentals of industrial property, from small units to large warehouses and industrial parks.",
    title: "Industrial property for sale and to let in Cape Town",
    description:
      "Industrial property brokers in Cape Town.  We sell and let small industrial units, warehouses and industrial parks, and advise owners, investors and tenants.",
    intro:
      "Our team has a wealth of experience in the sale and rental of industrial property, from small industrial units to large warehouse facilities and industrial parks.  Whether you are buying, selling, leasing or looking for space to grow into, we work to match the building to the business.",
    forWho: [
      "Owners who want to sell or let a unit, warehouse or park",
      "Businesses looking for industrial space to buy or rent",
      "Investors weighing the yield on an industrial building",
    ],
    how: [
      {
        head: "Understand the use",
        body: "Floor area, yard space, power, loading, height and access matter more in industrial property.  We start with how the building will actually be used.",
      },
      {
        head: "Match the premises",
        body: "We start by finding buildings that fit our client's operation and the budget.",
      },
      {
        head: "Negotiate and close",
        body: "We handle the offer, the lease or the sale agreement, and the steps to transfer or occupation, so nothing stalls between a handshake and the keys.",
      },
    ],
    faqs: [
      {
        q: "What kinds of industrial property do you handle?",
        a: "Small industrial units, mini-factories, standalone warehouses, distribution and storage facilities, and industrial parks, for sale or to let.",
      },
      {
        q: "What should I check before taking industrial premises?",
        a: "Zoning and the permitted use, the usable floor area and height, loading access, the electrical supply and its capacity, security, parking and yard space, and the condition of the roof and floor.  We help you check these before you commit.",
      },
    ],
  },
  {
    slug: "commercial",
    name: "Commercial",
    blurb:
      "Offices, retail and other business premises, bought, sold or let to suit your company.",
    title: "Commercial property for sale and to let in Cape Town",
    description:
      "Commercial property brokers in Cape Town.  Buy, sell or lease offices, retail and business premises with advice from a team that knows the market.",
    intro:
      "With years of experience in the commercial real estate industry, we have the knowledge and expertise to understand and meet your needs.  Let us help you find the right property for your business, or the right buyer or tenant for yours.",
    forWho: [
      "Business owners looking for offices, retail space or other premises",
      "Landlords who want a tenant or a buyer for a commercial building",
      "Investors looking for income-producing commercial property",
    ],
    how: [
      {
        head: "Brief",
        body: "We listen to what the business needs: size, location, parking, visibility, budget and timing.",
      },
      {
        head: "Shortlist",
        body: "We put together a shortlist of suitable premises, with the lease terms or price and the points to be aware of.",
      },
      {
        head: "Deal",
        body: "We negotiate on your behalf and manage the paperwork through to occupation or transfer.",
      },
    ],
    faqs: [
      {
        q: "Do you act for tenants as well as landlords?",
        a: "Yes.  We act for buyers, sellers, landlords and tenants, and we will tell you up front whom we are acting for on any given deal.",
      },
      {
        q: "Can you help me list my commercial property?",
        a: "Yes.  We advise on pricing or rental, prepare the marketing and bring the property to the right buyers and tenants.",
      },
    ],
  },
  {
    slug: "vacant-land",
    name: "Vacant Land",
    blurb:
      "Sale and development of vacant land, working to benefit both the seller and the developer.",
    title: "Vacant land for sale and development in Cape Town",
    description:
      "Vacant land brokers in Cape Town.  We help landowners sell to developers and help developers find sites, with an objective view of what the land is worth.",
    intro:
      "We specialise in facilitating the sale and development of vacant land, working to benefit both the seller and the developer.  The gap between what a landowner hopes to get and what a developer can defend is where most land deals stall, so we put the numbers on the table early.",
    forWho: [
      "Landowners who want to know what their land is worth to a developer",
      "Developers looking for financially feasible sites",
      "Investors considering land as part of a longer plan",
    ],
    how: [
      {
        head: "Look at the site",
        body: "Location, size, services, access, the zoning that applies, any approvals already granted, and what could realistically change.",
      },
      {
        head: "Estimate the value",
        body: "We use a desktop land estimate that works back from what a development could achieve to what a developer can pay.  It is an estimate, not a valuation, and any price is subject to due diligence.",
      },
      {
        head: "Bring the parties together",
        body: "We offer sites to developers based on their specific needs, and negotiate for a transaction to benefit both sides.",
      },
    ],
    faqs: [
      {
        q: "How is the price of vacant land worked out?",
        a: "A developer starts from what the finished project could sell for, deducts the cost of building it, the cost of getting approvals and services, finance and a margin, and what is left is what can be paid for the land.  Our land estimate follows the same logic.  Any price remains subject to due diligence.",
      },
      {
        q: "Does zoning affect what my land is worth?",
        a: "Greatly.  Zoning decides what may be built and how much.  Land with the right zoning, or a realistic path to it, is usually worth more than land that needs a long or uncertain rezoning process.",
      },
    ],
  },
  {
    slug: "developments",
    name: "Developments",
    blurb:
      "Development sales that complete the cycle between property owners and the people who will use the buildings.",
    title: "New developments for sale in Cape Town",
    description:
      "New development sales in Cape Town.  We complete the cycle from land to finished units, connecting developers with buyers and investors.",
    intro:
      "In addition to our experience in land sales, we now offer development sales to complete the cycle between property owners and users.  From the land that is sold to the units that are bought, we help connect each step.",
    forWho: [
      "Developers who want their units sold",
      "Buyers and investors considering a unit in a new development",
      "Landowners who want to see where a sale of their land leads",
    ],
    how: [
      {
        head: "Present the development",
        body: "Clear, honest information on the units, the price list and what is included.",
      },
      {
        head: "Find the right buyer",
        body: "We bring in buyers and investors whose needs match what is on offer.",
      },
      {
        head: "Take the sale through",
        body: "From offer to signed agreement and on towards transfer, with the buyer kept informed.",
      },
    ],
    faqs: [
      {
        q: "What is included in the purchase price?",
        a: "It depends on the development.  Ask what is included in the price: fixtures, finishes, parking, storage and any other extras, and what is charged separately, such as transfer costs and levies.  We set this out clearly before you sign.",
      },
      {
        q: "What are the financing options?",
        a: "Buyers usually apply for a bond with a bank or a bond originator, or pay cash.  Some developers accept a deposit and the balance on transfer.  Which of these is available depends on the development and on your own finances.",
      },
      {
        q: "What is the developer's track record?",
        a: "Check the developer's previous projects: whether they were finished on time, to what standard, and whether buyers were satisfied.  We encourage buyers to ask for this and to visit completed projects where possible.",
      },
      {
        q: "Are there any warranties or guarantees?",
        a: "New homes in South Africa generally carry statutory protection against defects, and builders usually give a warranty.  The details differ between developments, so ask for the warranty terms in writing before you sign.",
      },
    ],
  },
];

export const generalFaqs: { q: string; a: string }[] = [
  {
    q: "Where are you based?",
    a: "Our main focus is Cape Town, South Africa.  We have been involved in transactions nationwide and can facilitate most transactions, regardless of the location.",
  },
  {
    q: "Can you assist with finance applications?",
    a: "We can point you to the people who arrange commercial finance and help you present the property and the deal clearly.  The finance itself is provided by a bank or other lender, whose own criteria apply.",
  },
  {
    q: "Where can I view your stock?",
    a: "Contact us and tell us what you are looking for.  We will send you what is available that matches, including properties that are not advertised publicly.",
  },
  {
    q: "What is commercial property?",
    a: "Commercial property is property used for business rather than as a home.  It includes offices, shops and retail space, industrial buildings and warehouses, and land intended for those uses.",
  },
  {
    q: "How is commercial property different from residential property?",
    a: "Residential property is bought to live in.  Commercial property is bought or rented to run a business or to earn income.  Commercial leases are usually longer and more detailed, value is closely tied to the rental income, and the buyer is often a company or an investor rather than a home owner.",
  },
  {
    q: "What are some common types of commercial properties?",
    a: "Offices, retail premises (from small shops to shopping centres), industrial units and warehouses, mixed-use buildings, and vacant land zoned for commercial or industrial use.",
  },
  {
    q: "How do I determine the value of a commercial property?",
    a: "Commercial property is usually valued by the income it earns or could earn: the net rental, divided by a yield that reflects the location, the tenants and the risk.  Comparable sales and the cost of replacing the building are also considered.  For land, value is tied to what can be built on it.  A formal valuation is done by a registered valuer.",
  },
  {
    q: "How do I finance the purchase of a commercial property?",
    a: "Most buyers use a commercial bond from a bank, with a deposit that is usually larger than for a home.  Some buy through a company or a property fund, or use their own capital.  Lenders look at the property, the income it earns and the buyer's financial position.",
  },
  {
    q: "How do I find the right commercial property for my business?",
    a: "Start with how the business works: how much space you need, who needs to reach you, parking, access and your budget.  Then look at location, the condition of the building and the lease terms.  A broker can narrow the field and tell you about premises that are not on the open market.",
  },
  {
    q: "What should I consider when leasing a commercial property?",
    a: "The rent and how it escalates each year, the length of the lease and any option to renew, what the rent covers (operating costs, rates, parking), who is responsible for repairs, the deposit, and what happens if you want to leave early.  Read the lease carefully and get advice before signing.",
  },
  {
    q: "What are the tax implications of owning commercial property?",
    a: "Rental income is generally taxable, and costs of earning it can usually be deducted.  Buying and selling can also involve transfer duty or VAT, and a sale may attract capital gains tax.  The details depend on your situation, so speak to your tax adviser.",
  },
  {
    q: "What should I include in a commercial property lease agreement?",
    a: "The parties, the premises, the rent and its escalation, the lease period and any renewal option, the deposit, what the tenant must pay on top of rent, repairs and maintenance, permitted use, insurance, subletting, and what happens on breach or at the end of the lease.  Have the lease checked by an attorney.",
  },
  {
    q: "How do I manage and maintain a commercial property?",
    a: "Keep a record of leases, rent and expiry dates, inspect the building regularly, and plan maintenance on the roof, services and common areas before problems become expensive.  Many owners appoint a managing agent to collect rent and run repairs.",
  },
];
