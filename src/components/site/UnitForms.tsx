"use client";

import { useState } from "react";
import { PORTAL } from "@/lib/site/vacancies";

const field = "mt-1 w-full rounded border border-navy/20 bg-white px-3 py-2 text-sm text-navy";
const label = "block text-xs font-medium uppercase tracking-wide text-navy/60";

/** The Enquire and Offer forms on a unit's page.  They go to the landlord through the portal; nothing is stored on this website. */
export default function UnitForms({ spaceId }: { spaceId: string }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Form spaceId={spaceId} kind="enquiry" />
      <Form spaceId={spaceId} kind="offer" />
    </div>
  );
}

function Form({ spaceId, kind }: { spaceId: string; kind: "enquiry" | "offer" }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${PORTAL}/api/public/vacancies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: kind,
          spaceId,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          message: f.get("message"),
          offerRent: f.get("offerRent"),
          termYears: f.get("termYears"),
          website: f.get("website"),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) {
        setError(j.error ?? "That could not be sent.  Please try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("We could not reach the server.  Please try again.");
      setState("idle");
    }
  }

  const id = kind === "offer" ? "offer" : "enquire";
  return (
    <div id={id} className="scroll-mt-24 rounded-lg border border-navy/10 bg-white p-6">
      <h2 className="text-lg font-light">{kind === "offer" ? "Make an offer" : "Make an enquiry"}</h2>
      {state === "sent" ? (
        <p role="status" className="mt-4 text-sm font-light text-navy/70">
          Thank you.  Your {kind === "offer" ? "offer" : "enquiry"} has been sent and we will come back to you.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className={label} htmlFor={`${id}-name`}>Name *</label>
            <input id={`${id}-name`} name="name" required className={field} autoComplete="name" />
          </div>
          <div>
            <label className={label} htmlFor={`${id}-email`}>Email *</label>
            <input id={`${id}-email`} name="email" type="email" required className={field} autoComplete="email" />
          </div>
          <div>
            <label className={label} htmlFor={`${id}-phone`}>Phone</label>
            <input id={`${id}-phone`} name="phone" type="tel" className={field} autoComplete="tel" />
          </div>
          {kind === "offer" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="offerRent">Monthly rental, excl.  VAT *</label>
                <input id="offerRent" name="offerRent" inputMode="decimal" required className={field} />
              </div>
              <div>
                <label className={label} htmlFor="termYears">Years</label>
                <input id="termYears" name="termYears" inputMode="numeric" defaultValue="5" className={field} />
              </div>
            </div>
          )}
          <div>
            <label className={label} htmlFor={`${id}-message`}>Message</label>
            <textarea id={`${id}-message`} name="message" rows={3} maxLength={600} className={field} />
          </div>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button disabled={state === "sending"} className="rounded-sm bg-gold px-6 py-2.5 text-sm font-medium text-navy-deep hover:bg-gold-light disabled:opacity-60">
            {state === "sending" ? "Sending..." : kind === "offer" ? "Send my offer" : "Send my enquiry"}
          </button>
        </form>
      )}
    </div>
  );
}
