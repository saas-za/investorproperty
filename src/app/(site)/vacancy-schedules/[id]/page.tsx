import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UnitForms from "@/components/site/UnitForms";
import ViewBeacon from "@/components/site/ViewBeacon";
import { VACANCIES_ON, brochureUrl, fetchListing, photoUrl, rand } from "@/lib/site/vacancies";

export async function generateMetadata({ params }: PageProps<"/vacancy-schedules/[id]">): Promise<Metadata> {
  const { id } = await params;
  const l = await fetchListing(id);
  if (!l) return { title: "Space no longer available", robots: { index: false } };
  return {
    title: `${l.name}, ${l.building}: ${l.kind} space to let`,
    description: `${l.size ? `${l.size} m2 ` : ""}${l.kind} space to let at ${l.building}${l.address ? `, ${l.address}` : ""}. Enquire or make an offer.`,
    alternates: { canonical: `/vacancy-schedules/${id}` },
  };
}

export default async function UnitPage({ params }: PageProps<"/vacancy-schedules/[id]">) {
  if (!VACANCIES_ON) notFound();
  const { id } = await params;
  const l = await fetchListing(id);
  if (!l) notFound();
  const rent = l.price
    ? [l.price.monthly ? `${rand(l.price.monthly)} a month` : null, l.price.perM2 ? `${rand(l.price.perM2)} per m²` : null].filter(Boolean).join(", ")
    : "Price on request";

  return (
    <main>
      <ViewBeacon spaceId={l.id} />
      <section className="bg-navy text-shell">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-12">
          <Link href="/vacancy-schedules" className="text-xs text-gold-light underline underline-offset-4">All vacancies</Link>
          <h1 className="mt-4 text-3xl font-light sm:text-4xl">{l.name}</h1>
          <p className="mt-2 text-sm font-light text-shell/70">{[l.building, l.address].filter(Boolean).join(", ")}</p>
        </div>
        <div className="rule-gold h-px w-full" />
      </section>

      <section className="mx-auto grid max-w-screen-2xl gap-10 px-4 py-12 md:grid-cols-[1fr_20rem]">
        <div>
          {l.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {l.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={photoUrl(p)} alt={`${l.name}, picture ${i + 1}`} className={`w-full rounded-lg object-cover ${i === 0 ? "col-span-2 h-72" : "h-44"}`} />
              ))}
            </div>
          )}
          {l.note && <p className="mt-6 text-sm font-light leading-relaxed text-navy/80">{l.note}</p>}
        </div>
        <aside className="h-fit rounded-lg border border-navy/10 bg-white p-6 text-sm">
          <dl className="space-y-3 font-light">
            <div><dt className="text-xs uppercase tracking-wide text-navy/50">Type</dt><dd className="capitalize">{l.kind}</dd></div>
            {l.size != null && <div><dt className="text-xs uppercase tracking-wide text-navy/50">Size</dt><dd>{l.size} m²</dd></div>}
            {l.floor && <div><dt className="text-xs uppercase tracking-wide text-navy/50">Floor</dt><dd>{l.floor}</dd></div>}
            <div><dt className="text-xs uppercase tracking-wide text-navy/50">Rental</dt><dd>{rent}</dd><dd className="text-xs text-navy/50">Excluding VAT</dd></div>
            {l.opexPerM2 != null && <div><dt className="text-xs uppercase tracking-wide text-navy/50">Operating costs</dt><dd>{rand(l.opexPerM2)} per m²</dd></div>}
          </dl>
          <a href={brochureUrl(l.id)} target="_blank" rel="noreferrer" className="mt-6 block rounded-sm border border-navy/30 px-4 py-2.5 text-center hover:border-gold-deep">
            Download the brochure
          </a>
        </aside>
      </section>

      <section className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 pb-20">
        <UnitForms spaceId={l.id} />
      </section>
    </main>
  );
}
