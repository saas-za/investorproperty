import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import PrintButton from "@/components/PrintButton";
import { portal } from "@/config/platform";

export const metadata: Metadata = {
  title: "Terms of Use — Desktop Land Estimate | Investor Property",
  description:
    "Terms governing use of the Investor Property Desktop Land Estimate, including intellectual property rights and limitations.",
};

const EFFECTIVE = "17 September 2026";

/**
 * Written to be printed as much as read — the print button produces the PDF
 * Morné links to, with the logo in the header, so there is one source of
 * truth rather than a page and a separately maintained document that drift.
 */
const CLAUSES: { heading: string; paras: string[] }[] = [
  {
    heading: "1. Who these terms are between",
    paras: [
      "These terms govern your use of the Desktop Land Estimate and any related calculators, reports or outputs made available at investorproperty.co.za (together, the “Tool”). The Tool is provided by Investor Property (“we”, “us”). By using the Tool you agree to these terms. If you do not agree, do not use it.",
    ],
  },
  {
    heading: "2. The Tool is free, and that is deliberate",
    paras: [
      "The Tool is provided free of charge and without obligation. We provide it because informed counterparties make better decisions and because we would rather be the people who helped you think clearly about a site than the people who sold you a number.",
      "Being free does not make it unowned. Everything in section 4 applies in full.",
    ],
  },
  {
    heading: "3. It is an estimate, not a valuation",
    paras: [
      "The Tool produces an estimate. It is not a valuation. In South Africa only a valuer registered under the Property Valuers Profession Act 47 of 2000 may perform a valuation, and nothing produced by the Tool is, or may be represented as, a valuation by a registered valuer.",
      "No output of the Tool is an offer, an invitation to treat, a mandate, a financial product, or advice on which you should act without your own professional advisers. Every figure is subject to a due diligence, and the figures used are subject to change.",
      "You remain responsible for your own investigations, including town planning, engineering, environmental, traffic, market and legal due diligence.",
    ],
  },
  {
    heading: "4. Intellectual property",
    paras: [
      "All intellectual property rights in and to the Tool are and remain vested exclusively in Investor Property. This includes, without limitation: the calculation methodology; the density, status, coverage and floor-factor assumptions and every calibrated default; the development-charge and capital-expenditure models and their derived rate and demand tables; the structure, wording and layout of the reports the Tool produces; the source code, interface design, and the “Desktop Land Estimate” name and branding.",
      "The assumptions and calibrations underlying the Tool are confidential and proprietary, and were developed through our own work and at our own cost. They are made available to you only through the operation of the Tool on the inputs you supply, and for no other purpose.",
      "You may use the outputs of the Tool for your own internal commercial assessment of a specific property, and you may share a report we generate with your own professional advisers and funders for that purpose, provided it is shared complete and unaltered, including this attribution.",
      "You may not: reverse engineer, decompile, or attempt to derive the methodology, assumptions, rate tables or calibrations underlying the Tool; use automated means to query the Tool, extract its outputs in bulk, or systematically generate outputs in order to infer the underlying tables; reproduce, adapt, republish, sublicense, sell, or commercially exploit the Tool or its outputs; remove, obscure or alter any attribution, branding or notice; or present the outputs as your own work, as a valuation, or as the product of any party other than Investor Property.",
      "All rights not expressly granted are reserved to Investor Property.",
    ],
  },
  {
    heading: "5. Your information, and what we do and do not keep",
    paras: [
      "Certain figures from a calculation you run are recorded so we can improve the assumptions behind the Tool over time — among them the split between developable and non-developable area, what is being proposed for the site, indicative selling prices, and, where given, an asking price. This record is kept at the level of municipality and registration division only; it does not include an erf number, LPI code, exact coordinates, or any other identifier that fixes it to a specific, identifiable property.",
      "This record is never linked to your name, email address, phone number, or any other contact detail. It cannot be used to identify you or, on its own, to identify the property a calculation concerned.",
      "Where you choose to contact us, or to register for a further stage of the service, we will hold the contact details you give us in order to respond to you, separately from the record above. We will process those details in accordance with the Protection of Personal Information Act 4 of 2013. We will not sell them.",
      "The Tool queries publicly available government cadastral data to identify parcels. That query is made to resolve the point you click and is not used to build a record of your interest in any property.",
    ],
  },
  {
    heading: "6. No warranty",
    paras: [
      "The Tool is provided “as is” and “as available”. We do not warrant that it will be accurate, complete, uninterrupted, error free, or fit for any particular purpose. Calibrated assumptions are general and will not match every site. Third-party data, including cadastral and municipal data, is used as published and may be incomplete, out of date, or wrong.",
      "To the fullest extent permitted by law, we exclude all warranties, whether express or implied. Nothing in these terms excludes any liability that cannot lawfully be excluded, including under the Consumer Protection Act 68 of 2008 where it applies.",
    ],
  },
  {
    heading: "7. Limitation of liability",
    paras: [
      "To the fullest extent permitted by law, Investor Property, its directors, employees and agents will not be liable for any loss or damage of any kind arising from your use of, or reliance on, the Tool or its outputs. This includes without limitation any loss of profit, loss of opportunity, loss of anticipated saving, or any indirect or consequential loss, whether arising in contract, delict, or otherwise.",
      "You use the Tool at your own risk, and you indemnify us against any claim brought by a third party arising from your use of the Tool or from your presentation of its outputs to that third party.",
    ],
  },
  {
    heading: "8. Changes",
    paras: [
      "We may change the Tool or these terms at any time. The version of these terms in force is the one published at the time you use the Tool. Continued use after a change constitutes acceptance of it.",
    ],
  },
  {
    heading: "9. Governing law",
    paras: [
      "These terms are governed by the law of the Republic of South Africa, and you consent to the jurisdiction of the South African courts.",
    ],
  },
  {
    heading: "10. Contact",
    paras: [
      "Questions about these terms, or about anything the Tool has told you, are welcome. Investor Property — morne@investorproperty.co.za.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="flex-1 bg-shell">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="no-print mb-6 flex items-center justify-between gap-4">
          <Link href="/valuation" className="text-xs text-gold-deep underline underline-offset-4">
            ← Back to the estimate
          </Link>
          <PrintButton />
        </div>

        <article className="print-sheet rounded-lg border border-navy/10 bg-white shadow-sm">
          <div className="print-pad p-8">
            {/* Logo header — this is what appears at the top of the PDF. */}
            <header className="flex items-center justify-between gap-6 border-b border-navy/10 pb-5">
              <div className="flex items-center gap-4">
                <Image
                  src="/logo.png"
                  alt="Investor Property"
                  width={400}
                  height={400}
                  className="h-24 w-24 object-contain"
                />
                <div>
                  <div className="text-base font-semibold uppercase tracking-wide text-navy">
                    Investor Property
                  </div>
                  <div className="text-sm text-navy/50">{portal.product}</div>
                </div>
              </div>
              <div className="text-right text-xs text-navy/50">
                <div className="font-medium text-navy">Terms of Use</div>
                <div className="mt-1">Effective {EFFECTIVE}</div>
              </div>
            </header>
            <div className="mt-4 h-1 rule-gold" />

            <div className="mt-8 space-y-6">
              {CLAUSES.map((c) => (
                <section key={c.heading}>
                  <h2 className="text-sm font-semibold text-navy">{c.heading}</h2>
                  {c.paras.map((p, i) => (
                    <p key={i} className="mt-2 text-sm leading-relaxed text-navy/75">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
            </div>

            <footer className="mt-10 border-t border-navy/10 pt-4 text-center text-[11px] text-navy/40">
              © {new Date().getFullYear()} Investor Property. All rights reserved.
            </footer>
          </div>
        </article>
      </div>
    </main>
  );
}

