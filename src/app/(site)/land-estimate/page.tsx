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
                href="/valuation"
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
