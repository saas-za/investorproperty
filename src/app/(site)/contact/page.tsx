import type { Metadata } from "next";
import EnquiryForm from "@/components/site/EnquiryForm";
import { offers, site } from "@/lib/site/content";

export const metadata: Metadata = {
  title: "Contact Investor Property",
  description:
    "Contact Investor Property, commercial property brokers in Cape Town, about buying, selling, renting or developing industrial and commercial property and vacant land.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { about } = await searchParams;
  const slug = Array.isArray(about) ? about[0] : about;
  const interest = offers.find((o) => o.slug === slug)?.name;

  return (
    <main>
      <section className="bg-navy text-shell">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-light">Contact us</p>
          <h1 className="mt-4 text-3xl font-light sm:text-4xl">Let us help you get started</h1>
          {interest && <p className="mt-4 text-sm font-light text-shell/70">Your enquiry is about: {interest}</p>}
        </div>
        <div className="rule-gold h-px w-full" />
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1fr_20rem]">
        <EnquiryForm interest={interest} />
        <aside className="text-sm font-light leading-relaxed text-navy/80">
          <h2 className="text-lg font-medium text-navy">Or reach us directly</h2>
          <p className="mt-4">
            <a href={`tel:${site.phoneTel}`} className="underline underline-offset-4">
              {site.phone}
            </a>
          </p>
          <p className="mt-2">
            <a href={`mailto:${site.email}`} className="underline underline-offset-4">
              {site.email}
            </a>
          </p>
          <p className="mt-4">{site.place}</p>
        </aside>
      </section>
    </main>
  );
}
