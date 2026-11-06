import type { Metadata } from "next";
import Link from "next/link";
import { offers, site } from "@/lib/site/content";

export const metadata: Metadata = {
  title: "Commercial property brokers in Cape Town",
  description:
    "Investor Property is a commercial property brokerage in Cape Town. Buy, sell, rent or develop industrial property, commercial property and vacant land.",
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: site.name,
  url: site.url,
  email: site.email,
  telephone: site.phoneTel,
  description: site.tagline,
  areaServed: { "@type": "City", name: "Cape Town" },
  address: { "@type": "PostalAddress", addressLocality: "Cape Town", postalCode: "7560", addressCountry: "ZA" },
};

export default function Home() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="bg-navy text-shell">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-light">Commercial property brokerage</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-light leading-tight sm:text-5xl">
            Commercial property in Cape Town,
            <span className="block text-gold-gradient">bought, sold, let and developed.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-shell/75">
            Our team specialises in commercial real estate and helps you with buying, selling, renting and developing
            the right business premises. Let us help you find the ideal location for your company.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-sm bg-gold px-6 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light"
            >
              Get started
            </Link>
            <Link
              href="/land-estimate"
              className="rounded-sm border border-shell/30 px-6 py-3 text-sm font-light transition hover:border-gold-light hover:text-gold-light"
            >
              Estimate what your land is worth
            </Link>
          </div>
        </div>
        <div className="rule-gold h-px w-full" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">What we can offer</p>
        <h2 className="mt-3 text-3xl font-light">Put us to the test</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {offers.map((o) => (
            <Link
              key={o.slug}
              href={`/${o.slug}`}
              className="group rounded-lg border border-navy/10 bg-white p-7 shadow-sm transition hover:border-gold-deep"
            >
              <div className="rule-gold h-px w-10" />
              <h3 className="mt-5 text-xl font-light">{o.name}</h3>
              <p className="mt-3 text-sm font-light leading-relaxed text-navy/70">{o.blurb}</p>
              <p className="mt-5 text-sm text-gold-deep group-hover:underline">Read more</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-navy/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Land estimate</p>
            <h2 className="mt-3 text-3xl font-light">Know what land is worth before you bid</h2>
          </div>
          <div>
            <p className="text-sm font-light leading-relaxed text-navy/75">
              Whether you are selling land or looking to buy it, the gap between hope and what can be defended is
              where deals stall. Our desktop land estimate works back from what a development could achieve to what
              can reasonably be paid for the site, so both sides start from the same numbers.
            </p>
            <Link href="/land-estimate" className="mt-5 inline-block text-sm text-gold-deep underline underline-offset-4">
              Try the land estimate
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Where we work</p>
            <h2 className="mt-3 text-3xl font-light">Cape Town first, nationwide when needed</h2>
          </div>
          <p className="text-sm font-light leading-relaxed text-navy/75">
            Our main focus is Cape Town, South Africa. We have also been involved in transactions nationwide and can
            facilitate most transactions, regardless of the location. Tell us what you are looking for and we will
            tell you honestly whether we are the right people to help.
          </p>
        </div>
        <div className="mt-12 rounded-lg bg-navy p-8 text-shell sm:p-10">
          <h2 className="text-2xl font-light">Need clarification?</h2>
          <p className="mt-3 text-sm font-light text-shell/75">
            Common questions about commercial property, leasing, finance and new developments are answered on our FAQ
            page.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/faq" className="rounded-sm bg-gold px-5 py-2.5 text-sm font-medium text-navy-deep hover:bg-gold-light">
              Read the FAQ
            </Link>
            <Link href="/contact" className="rounded-sm border border-shell/30 px-5 py-2.5 text-sm font-light hover:text-gold-light">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
