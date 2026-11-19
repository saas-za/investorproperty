import type { Metadata } from "next";
import PageHero from "@/components/site/PageHero";
import Link from "next/link";
import { generalFaqs, offers } from "@/lib/site/content";

export const metadata: Metadata = {
  title: "Commercial property FAQ",
  description:
    "Answers to common questions about buying, selling, leasing, valuing and financing commercial property in South Africa, and about buying in a new development.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const developments = offers.find((o) => o.slug === "developments")!.faqs;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...generalFaqs, ...developments].map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero eyebrow="FAQ" title="Need clarification?" />

      <section className="mx-auto max-w-5xl px-4 sm:px-8 lg:px-12 py-16">
        <div className="space-y-4">
          {generalFaqs.map((f) => (
            <details key={f.q} className="group rounded-lg border border-navy/10 bg-white p-5 open:shadow-sm">
              <summary className="cursor-pointer list-none text-base font-medium">{f.q}</summary>
              <p className="mt-3 text-sm font-light leading-relaxed text-navy/75">{f.a}</p>
            </details>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-light">Buying in a new development</h2>
        <p className="mt-2 text-sm font-light text-navy/70">
          Questions to ask when purchasing a unit that is still under construction.
        </p>
        <div className="mt-6 space-y-4">
          {developments.map((f) => (
            <details key={f.q} className="rounded-lg border border-navy/10 bg-white p-5 open:shadow-sm">
              <summary className="cursor-pointer list-none text-base font-medium">{f.q}</summary>
              <p className="mt-3 text-sm font-light leading-relaxed text-navy/75">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-12 text-sm font-light text-navy/70">
          The answers here are general.  For advice on your own situation, please{" "}
          <Link href="/contact" className="text-gold-deep underline underline-offset-4">
            contact us
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
