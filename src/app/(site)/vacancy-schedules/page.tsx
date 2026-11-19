import type { Metadata } from "next";
import PageHero from "@/components/site/PageHero";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KINDS, VACANCIES_ON, fetchListings, rand } from "@/lib/site/vacancies";

export const metadata: Metadata = {
  title: "Vacancy schedules: commercial space to let",
  description: "Available office, industrial and retail space to let.  Filter by type, size and price, then enquire or make an offer.",
  alternates: { canonical: "/vacancy-schedules" },
};

const field = "mt-1 w-full rounded border border-navy/20 bg-white px-3 py-2 text-sm text-navy";
const label = "block text-xs font-medium uppercase tracking-wide text-navy/60";

export default async function VacancySchedules({ searchParams }: PageProps<"/vacancy-schedules">) {
  if (!VACANCIES_ON) notFound();
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) ?? "";
  const q = new URLSearchParams();
  for (const k of ["kind", "status", "minSize", "maxSize", "maxMonthly", "q"]) if (one(k)) q.set(k, one(k));
  const listings = await fetchListings(q);

  return (
    <main>
      <PageHero eyebrow="Vacancy schedules" title="Commercial space to let">
        The spaces landlords have available now.  All rentals exclude VAT. Open a space to see more, then enquire or make an offer.
      </PageHero>

      <section className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12 py-10">
        <form method="get" className="grid gap-3 rounded-lg border border-navy/10 bg-white p-4 sm:grid-cols-7">
          <div>
            <label className={label} htmlFor="kind">Type</label>
            <select id="kind" name="kind" defaultValue={one("kind")} className={field}>
              {KINDS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="status">Availability</label>
            <select id="status" name="status" defaultValue={one("status")} className={field}>
              <option value="">Available now</option>
              <option value="offered">Under offer</option>
              <option value="all">Both</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="minSize">Smallest m²</label>
            <input id="minSize" name="minSize" inputMode="numeric" defaultValue={one("minSize")} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="maxSize">Largest m²</label>
            <input id="maxSize" name="maxSize" inputMode="numeric" defaultValue={one("maxSize")} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="maxMonthly">Most per month</label>
            <input id="maxMonthly" name="maxMonthly" inputMode="numeric" defaultValue={one("maxMonthly")} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={one("q")} className={field} />
          </div>
          <div className="flex items-end gap-3">
            <button className="rounded-sm bg-gold px-5 py-2 text-sm font-medium text-navy-deep hover:bg-gold-light">Filter</button>
            <Link href="/vacancy-schedules" className="pb-2 text-xs text-navy/60 underline">Clear</Link>
          </div>
        </form>

        <p className="mt-4 text-sm font-light text-navy/60">
          {listings.length} space{listings.length === 1 ? "" : "s"} available
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-navy/10 bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-shell text-xs uppercase tracking-wide text-navy/60">
              <tr>
                <th className="px-4 py-3">Space</th>
                <th className="px-4 py-3">Building</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">m²</th>
                <th className="px-4 py-3 text-right">Per month</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-shell/60">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/vacancy-schedules/${l.id}`} className="hover:underline">{l.name}</Link>
                  </td>
                  <td className="px-4 py-3 font-light">{l.building}</td>
                  <td className="px-4 py-3 font-light capitalize">{l.kind}</td>
                  <td className="px-4 py-3 text-right font-light">{l.size ?? ""}</td>
                  <td className="px-4 py-3 text-right font-light">{l.price?.monthly ? rand(l.price.monthly) : "Price on request"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    <Link href={`/vacancy-schedules/${l.id}#enquire`} className="mr-2 rounded-sm bg-gold px-3 py-1.5 font-medium text-navy-deep hover:bg-gold-light">Enquire</Link>
                    <Link href={`/vacancy-schedules/${l.id}#offer`} className="rounded-sm border border-navy/30 px-3 py-1.5 hover:border-gold-deep">Offer</Link>
                  </td>
                </tr>
              ))}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-light text-navy/60">
                    Nothing matches right now.  Try fewer filters, or <Link href="/contact" className="underline">tell us what you need</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
