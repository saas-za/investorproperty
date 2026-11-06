import type { Metadata } from "next";
import { platform } from "@/config/platform";

export const metadata: Metadata = {
  title: "Land estimate for developers and landowners",
  description:
    "A desktop land price estimate for property developers and landowners in South Africa. Enter the site, its zoning and your build assumptions to see a defensible residual land value.",
  alternates: { canonical: "/land-estimate" },
};

const capabilities = [
  {
    title: "Zoning intelligence",
    body: "Current and proposed zoning, floor factor, height limits and permitted uses resolved from the scheme regulations.",
  },
  {
    title: "Residual land value",
    body: "Work backwards from achievable revenue and build cost to determine the viable land price.",
  },
  {
    title: "Rezoning upside",
    body: "Model the difference between what a site is zoned for today and what its potential rezoning might achieve.",
  },
];

export default function LandEstimate() {
  return (
    <main className="flex-1">
      <section className="bg-navy text-shell">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <div className="flex flex-col items-start gap-8">
            <div>
              <h1 className="text-4xl font-light leading-tight sm:text-5xl">
                Know what the land is worth
                <span className="block text-gold-gradient">
                  before you bid on it.
                </span>
              </h1>
            </div>
            {/* Was max-w-xl, which broke the line mid-sentence for no reason
                the reader can see. The section already has its own max width
                and gutters; the paragraph does not need a second, tighter one. */}
            <p className="max-w-3xl text-base font-light leading-relaxed text-shell/75">
              A free desktop land price estimate tool for property developers. Enter an erf,
              its zoning and your build assumptions — get a defensible residual
              land value in minutes.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#valuation-form"
                className="rounded-sm bg-gold px-6 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light"
              >
                Try the calculator
              </a>
              <a
                href="/sign-in"
                className="rounded-sm border border-shell/30 px-6 py-3 text-sm font-light text-shell transition hover:border-gold-light hover:text-gold-light"
              >
                Sign in
              </a>
            </div>
            <p className="text-xs font-light text-shell/50">
              Free to use. An account is required so your estimates are saved to
              you.
            </p>
          </div>
        </div>
        <div className="rule-gold h-px w-full" />
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="text-2xl font-light">What it does</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {capabilities.map((c) => (
            <div key={c.title}>
              <div className="rule-gold h-px w-10" />
              <h3 className="mt-5 text-base font-medium">{c.title}</h3>
              <p className="mt-3 text-sm font-light leading-relaxed opacity-75">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="valuation-form" className="mx-auto max-w-4xl px-4 pb-20">
        <div className="rounded-lg border border-navy/10 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Desktop land estimate</p>
              <h3 className="mt-2 text-2xl font-light text-navy">Land Price Estimate</h3>
            </div>
            <div className="hidden h-16 w-16 items-center justify-center rounded-full bg-navy/5 sm:flex">
              <span className="text-lg font-medium text-navy">R</span>
            </div>
          </div>

          <form className="space-y-6">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Who is doing this calculation?
              </label>
              <div className="mt-2 flex gap-2 rounded-md bg-navy/5 p-1 text-xs">
                <button type="button" className="flex-1 rounded bg-white px-3 py-2 font-medium text-navy shadow-sm">
                  I&apos;m the developer / buyer
                </button>
                <button type="button" className="flex-1 rounded px-3 py-2 text-navy/60">
                  I&apos;m the seller / landowner
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Find the site
              </label>
              <button type="button" className="mt-2 text-xs text-gold-deep underline underline-offset-2">
                Pick it on a map instead
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                  Gross site area
                </label>
                <input
                  type="text"
                  defaultValue="10 000"
                  className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">m²</span>
              </div>
              <div className="flex flex-col justify-start pt-7">
                <input
                  type="text"
                  defaultValue="1"
                  className="w-full rounded border border-navy/20 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-[11px] text-navy/40">hectares</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                What are you planning to build on the site?
              </label>
              <select className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm">
                <option>Residential Apartment</option>
                <option>Townhouses</option>
                <option>Mixed-use development</option>
                <option>Industrial development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Status of the opportunity
              </label>
              <select className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm">
                <option>Raw agricultural</option>
                <option>Approval in process</option>
                <option>Approval granted</option>
                <option>Zoned / SDP approved</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Average selling price per unit (ZAR)
              </label>
              <input
                type="text"
                placeholder="e.g. 1 000 000"
                className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Net developable area
              </label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <input type="text" defaultValue="44" className="rounded border border-navy/20 px-3 py-2 text-sm" />
                <input type="text" defaultValue="56" className="rounded border border-navy/20 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="seller-expectation" className="h-4 w-4" />
              <label htmlFor="seller-expectation" className="text-sm text-navy/70">
                What is the seller&apos;s expectation?
              </label>
            </div>

            <div className="pt-4">
              <a
                href="/sign-in"
                className="inline-flex rounded-sm bg-gold px-6 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light"
              >
                Calculate Developer Contributions
              </a>
            </div>
          </form>
        </div>
      </section>

      {platform.enabled && (
        <section className="border-t border-navy/10 bg-shell">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <p className="text-sm font-light opacity-70">
              Taking a development to market?{" "}
              <a href={platform.url} className="underline underline-offset-4">
                {platform.name}
              </a>{" "}
              handles {platform.tagline.toLowerCase()}.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
