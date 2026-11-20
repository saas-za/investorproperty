import type { Metadata } from "next";
import type { ReactNode } from "react";
import InterestForm from "./InterestForm";
import PhaseMap, { COLOUR, OPEN } from "./PhaseMap";

export const metadata: Metadata = {
  title: "Frankendale Green Industrial Park",
  description:
    "Approved, subdivided Risk Industry and General Industrial land at Frankendale Green Industrial Park, Blaauwberg, Cape Town.  Phases 1, 2, 5 and 6 are open for interest.",
  alternates: { canonical: "/frankendale" },
};

const FACTS: [string, string][] = [
  ["Where", "Blaauwberg, Cape Town"],
  ["Zoned for", "Risk Industry (RI) and General Industrial 1 (GI1)"],
  ["Approved", "City-approved subdivision and phasing plan, with vested zoning rights"],
  ["Open now", "Phases 1, 2, 5 and 6, south of Berkshire Road"],
];

const WHY: [string, ReactNode][] = [
  ["Zoned for risk industry", "Risk zoning (for noxious trade) is rare to find in Cape Town.  Frankendale has it, alongside General Industrial 1, in one park."],
  ["Approvals behind you", "The planning risk and waiting that usually sit between raw land and a building are already done."],
  ["Road and rail", "Close to major intersections for easy access, with the railway line nearby and a rail siding proposed on the plan."],
  ["Buy what you need", "Seventeen phases, with portions from about 1 ha.  Start with the land you need now with room to grow."],
  ["Room to grow", "About 214 ha of sellable land: roughly 134 ha Risk Industry and 80 ha General Industrial 1."],
  ["Value", <>Zoned, approved and phased land carries less risk and less delay than raw land.  <strong className="font-semibold">Pricing is shared with registered buyers.</strong></>],
];

export default function FrankendalePage() {
  return (
    <main>
      <section className="bg-navy text-shell">
        <div className="mx-auto max-w-screen-2xl px-4 py-24 sm:px-8 sm:py-32 lg:px-12">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-light">Blaauwberg, Cape Town</p>
          <h1 className="mt-6 max-w-4xl text-4xl font-light leading-tight sm:text-6xl">
            Frankendale <span className="text-gold-gradient">Green Industrial Park</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg font-light leading-relaxed text-shell/75">
            Investor Property has been mandated to introduce buyers to Frankendale.  Approved, subdivided industrial land, released in phases.  The first release is the southern portion: phases 1, 2, 5 and 6.  Register your interest to be added to the launch of this exciting new development.
          </p>
          <a href="#express-interest" className="mt-10 inline-block rounded-sm bg-gold px-8 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light">
            Express interest
          </a>
        </div>
        <div className="rule-gold h-px w-full" />
      </section>

      <section className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <dl className="grid divide-navy/15 sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
          {FACTS.map(([h, t]) => (
            <div key={h} className="py-10 sm:px-8 sm:first:pl-0">
              <dt className="text-xs uppercase tracking-[0.2em] text-gold-deep">{h}</dt>
              <dd className="mt-3 text-sm font-light leading-relaxed text-navy/80">{t}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-screen-2xl border-t border-navy/15 px-4 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-3">
          <h2 className="text-3xl font-light">Why Frankendale</h2>
          <ol className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-2">
            {WHY.map(([h, t], i) => (
              <li key={h} className="border-t border-gold-deep/50 pt-5">
                <span className="text-xs text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-lg font-light">{h}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-navy/75">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-navy/15 bg-white">
        <div className="mx-auto max-w-screen-2xl px-4 py-20 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-light">The land</h2>
          <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-navy/75">
            If you need land for a warehouse, a factory, a depot or a plant, access the Frankendale Deal Room to tell us your requirement, the year you expect and the use.
          </p>
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PhaseMap />
              <div className="mt-4 flex flex-wrap gap-6 text-xs font-light text-navy/70">
                <span><i className="mr-2 inline-block h-2.5 w-2.5 align-middle" style={{ background: COLOUR.ri }} />Risk Industry</span>
                <span><i className="mr-2 inline-block h-2.5 w-2.5 align-middle" style={{ background: COLOUR.mix }} />Risk Industry and General Industrial 1</span>
                <span><i className="mr-2 inline-block h-2.5 w-2.5 align-middle" style={{ background: COLOUR.locked }} />Later release</span>
              </div>
            </div>
            <div className="lg:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">Open for interest</p>
              <table className="mt-4 w-full text-sm font-light">
                <thead>
                  <tr className="border-b border-navy/30 text-left text-xs uppercase tracking-wider text-navy/60">
                    <th className="py-3 font-normal">Phase</th>
                    <th className="py-3 font-normal">Zoning</th>
                    <th className="py-3 text-right font-normal">Land</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/15">
                  {Object.entries(OPEN).map(([n, o]) => (
                    <tr key={n}>
                      <td className="py-4">{n}</td>
                      <td className="py-4 pr-4">{o.zoning}</td>
                      <td className="py-4 text-right">{o.land}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs font-light text-navy/55">Sizes are from the subdivision plan and must be confirmed by a Professional Land Surveyor.  Some phases are further subdivided into portions that may differ from the zoning on the interest map.  The map is for indication only and the Parcello Deal Room contains more detailed information.</p>
              <a href="#express-interest" className="mt-8 inline-block rounded-sm bg-navy px-8 py-3 text-sm font-medium text-shell transition hover:bg-navy-deep">
                Access the Deal Room
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-navy/15 bg-white">
        <div className="mx-auto grid max-w-screen-2xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-3 lg:px-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">The Parcello Deal Room</p>
            <h2 className="mt-5 text-3xl font-light leading-snug">Everything about Frankendale, in one private room</h2>
          </div>
          <ul className="grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:col-span-2">
            {[
              ["The project documents", "Every document on Frankendale, kept together in a private deal room."],
              ["The interactive map", "Every phase on the map, with its zoning and size, and which phases are open for interest."],
              ["The professional team", "See the professionals behind the project, with their contact details.  For any further information, contact Investor Property."],
              ["Your expression of interest", "A short form to tell us the phase, the size and the year you need.  It is simple and non-binding, and it is recorded with the date."],
            ].map(([h, t]) => (
              <li key={h} className="border-t border-gold-deep/50 pt-5">
                <h3 className="text-base font-light">{h}</h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-navy/75">{t}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="express-interest" className="bg-navy text-shell">
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-8">
          <h2 className="text-3xl font-light">Step inside the Frankendale Deal Room</h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-shell/75">
            Tell us who you are and we will send you an invitation to the Parcello Deal Room for Frankendale.  When you open it, you add your name, company and phone number, and you are in.
          </p>
          <InterestForm />
        </div>
      </section>

    </main>
  );
}
