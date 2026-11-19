import type { Metadata } from "next";
import Link from "next/link";
import { offers, site } from "@/lib/site/content";

export const metadata: Metadata = {
  title: "Commercial property brokers in Cape Town",
  description:
    "Investor Property is a commercial property brokerage in Cape Town.  Buy, sell, rent or develop industrial property, commercial property and vacant land.",
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

      <section className="mx-auto max-w-screen-2xl px-4 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-32 lg:px-12">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Commercial property brokerage, Cape Town</p>
        <h1 className="mt-8 max-w-5xl text-5xl font-light leading-[1.1] sm:text-7xl">
          Commercial property, <span className="text-gold-gradient">bought, sold, let and developed.</span>
        </h1>
        <p className="mt-10 max-w-xl text-lg font-light leading-relaxed text-navy/75">
          We help you buy, sell, rent and develop the right business premises, and tell you honestly when we are not the right people to help.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4">
          <Link href="/contact" className="rounded-sm bg-navy px-8 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep">
            Get started
          </Link>
          <Link href="/land-estimate" className="border-b border-gold-deep pb-1 text-sm text-navy transition hover:text-gold-deep">
            Estimate what your land is worth
          </Link>
        </div>
      </section>

      <section className="bg-navy text-shell">
        <div className="mx-auto grid max-w-screen-2xl gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:px-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-light">Featured project</p>
            <h2 className="mt-6 text-4xl font-light leading-tight sm:text-5xl">
              Frankendale <span className="text-gold-gradient">Green Industrial Park</span>
            </h2>
          </div>
          <div className="lg:pt-10">
            <p className="text-lg font-light leading-relaxed text-shell/75">
              Approved, subdivided Risk Industry and General Industrial land at Blaauwberg, Cape Town, released in phases to the businesses that will build on it.
              Phases 1, 2, 5 and 6 are open for interest.
            </p>
            <Link href="/frankendale" className="mt-8 inline-block border-b border-gold-light pb-1 text-sm text-gold-light transition hover:text-shell">
              See the park and express interest
            </Link>
          </div>
        </div>
        <div className="rule-gold h-px w-full" />
      </section>

      <section className="mx-auto max-w-screen-2xl px-4 py-24 sm:px-8 lg:px-12">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">What we do</p>
        <ul className="mt-10 border-t border-navy/20">
          {offers.map((o, i) => (
            <li key={o.slug} className="border-b border-navy/20">
              <Link href={`/${o.slug}`} className="group grid items-baseline gap-x-8 gap-y-2 py-8 sm:grid-cols-[4rem_14rem_1fr_auto]">
                <span className="text-xs text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-2xl font-light">{o.name}</span>
                <span className="max-w-xl text-sm font-light leading-relaxed text-navy/70">{o.blurb}</span>
                <span className="text-sm text-gold-deep transition group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-navy/15 bg-white">
        <div className="mx-auto grid max-w-screen-2xl gap-16 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:px-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Land estimate</p>
            <h2 className="mt-5 text-3xl font-light leading-snug">Know what land is worth before you bid</h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-navy/75">
              The gap between hope and what can be defended is where land deals stall.  Our desktop estimate works back from what a development could achieve to what can reasonably be paid for the site.
            </p>
            <Link href="/land-estimate" className="mt-6 inline-block border-b border-gold-deep pb-1 text-sm transition hover:text-gold-deep">
              Try the land estimate
            </Link>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Where we work</p>
            <h2 className="mt-5 text-3xl font-light leading-snug">Cape Town first, nationwide when needed</h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-navy/75">
              Our main focus is Cape Town.  We have also been involved in transactions nationwide and can facilitate most of them, wherever the property is.
            </p>
            <Link href="/faq" className="mt-6 inline-block border-b border-gold-deep pb-1 text-sm transition hover:text-gold-deep">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-2xl px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
        <h2 className="max-w-3xl text-4xl font-light leading-tight sm:text-5xl">Tell us what you are looking for.</h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4 text-sm font-light">
          <Link href="/contact" className="rounded-sm bg-navy px-8 py-3 font-medium text-shell transition hover:bg-navy-deep">
            Contact us
          </Link>
          <a href={`tel:${site.phoneTel}`} className="border-b border-gold-deep pb-1">
            {site.phone}
          </a>
          <a href={`mailto:${site.email}`} className="border-b border-gold-deep pb-1">
            {site.email}
          </a>
        </div>
      </section>
    </main>
  );
}
