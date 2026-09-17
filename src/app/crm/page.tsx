import Link from "next/link";
import { brokerDeals, crmLeads, landOpportunities, properties } from "@/lib/crm/seed";

export default function CrmOverview() {
  const available = properties.filter((p) => p.status === "Available").length;
  const underOffer = properties.filter((p) => p.status === "Under Offer").length;
  const hotLeads = crmLeads.filter((l) => l.temperature === "Hot").length;
  const activeLand = landOpportunities.filter(
    (l) => l.stage !== "Sold" && l.stage !== "Withdrawn",
  ).length;
  const pipelineCommission = brokerDeals.reduce((s, d) => s + (d.commissionValue ?? 0), 0);

  const stats = [
    { label: "Properties on offer", value: available },
    { label: "Under offer", value: underOffer },
    { label: "Hot leads", value: hotLeads },
    { label: "Land opportunities active", value: activeLand },
    { label: "Commission in pipeline", value: `R${pipelineCommission.toLocaleString("en-ZA")}` },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10">
      <h1 className="text-2xl font-light text-navy">Your CRM Matrix</h1>
      <p className="mt-1 text-sm text-navy/60">
        Replaces the spreadsheet — same matrix, click-to-toggle, no formulas to break.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-navy/10 bg-white p-4 shadow-sm">
            <div className="text-2xl font-semibold tabular-nums text-navy">{s.value}</div>
            <div className="mt-1 text-xs text-navy/50">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/crm/leads"
          className="rounded-lg border border-navy/10 bg-white p-6 shadow-sm transition hover:border-navy"
        >
          <h2 className="font-medium text-navy">Leads →</h2>
          <p className="mt-2 text-sm text-navy/60">
            Buyer enquiries, one row per lead, pick the property from a dropdown.
          </p>
        </Link>
        <Link
          href="/crm/deals"
          className="rounded-lg border border-navy/10 bg-white p-6 shadow-sm transition hover:border-navy"
        >
          <h2 className="font-medium text-navy">Deals →</h2>
          <p className="mt-2 text-sm text-navy/60">
            Offer to registration, your own brokerage checklist per transaction.
          </p>
        </Link>
        <Link
          href="/crm/land"
          className="rounded-lg border border-navy/10 bg-white p-6 shadow-sm transition hover:border-navy"
        >
          <h2 className="font-medium text-navy">Development Land →</h2>
          <p className="mt-2 text-sm text-navy/60">
            Sites you&apos;re sourcing and packaging for developers — its own pipeline, not tied
            to a listing.
          </p>
        </Link>
      </div>
    </div>
  );
}
