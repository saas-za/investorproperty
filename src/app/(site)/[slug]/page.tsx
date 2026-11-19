import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/site/PageHero";
import { offers, site } from "@/lib/site/content";

import PhaseMap from "../frankendale/PhaseMap";

export const dynamicParams = false;

/** Blue-toned, royalty-free (CC0) photographs behind each page heading.  Developments uses a zoomed crop of the Frankendale map instead. */
const HERO_IMAGE: Record<string, string> = {
  industrial: "/industrial.jpg",
  commercial: "/commercial-blue.jpg",
  "vacant-land": "/vacant-land-blue.jpg",
};

export function generateStaticParams() {
  return offers.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const o = offers.find((x) => x.slug === slug);
  if (!o) return {};
  return { title: o.title, description: o.description, alternates: { canonical: `/${o.slug}` } };
}

export default async function OfferPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const o = offers.find((x) => x.slug === slug);
  if (!o) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: o.title,
        description: o.description,
        provider: { "@type": "RealEstateAgent", name: site.name, url: site.url },
        areaServed: { "@type": "City", name: "Cape Town" },
      },
      {
        "@type": "FAQPage",
        mainEntity: o.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow={o.name} title={o.title} image={HERO_IMAGE[o.slug]} backdrop={o.slug === "developments" ? <PhaseMap backdrop /> : undefined}>
        <p>{o.intro}</p>
        <Link
          href={`/contact?about=${o.slug}`}
          className="mt-8 inline-block rounded-sm bg-navy px-8 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep"
        >
          Talk to us about {o.name.toLowerCase()}
        </Link>
      </PageHero>

      <section className="mx-auto grid max-w-screen-2xl gap-16 px-4 py-20 sm:px-8 md:grid-cols-2 lg:px-12">
        <div>
          <h2 className="text-2xl font-light">Who we help</h2>
          <ul className="mt-6 space-y-3 text-sm font-light leading-relaxed text-navy/80">
            {o.forWho.map((w) => (
              <li key={w} className="flex gap-3">
                <span className="rule-gold mt-2 h-px w-4 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-light">How it works</h2>
          <ol className="mt-6 space-y-6">
            {o.how.map((s, i) => (
              <li key={s.head}>
                <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Step {i + 1}</p>
                <h3 className="mt-1 text-base font-medium">{s.head}</h3>
                <p className="mt-1 text-sm font-light leading-relaxed text-navy/75">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-navy/10 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 lg:px-12 py-16">
          <h2 className="text-2xl font-light">Common questions</h2>
          <div className="mt-8 space-y-8">
            {o.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-base font-medium">{f.q}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-navy/75">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm font-light text-navy/70">
            More answers are on our{" "}
            <Link href="/faq" className="text-gold-deep underline underline-offset-4">
              FAQ page
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
