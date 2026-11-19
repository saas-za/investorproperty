"use client";

import { useState } from "react";

const field =
  "mt-2 w-full rounded border border-navy/20 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-gold-deep";
const label = "block text-xs font-medium uppercase tracking-wide text-navy/60";

/** The contact form.  Sends to /api/enquiry, which passes it to the HubSpot CRM and to Morné's inbox. */
export default function EnquiryForm({ interest }: { interest?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: f.get("firstName"),
          lastName: f.get("lastName"),
          email: f.get("email"),
          company: f.get("company"),
          phone: f.get("phone"),
          message: f.get("message"),
          marketing: f.get("marketing") === "on",
          interest,
          website: f.get("website"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That could not be sent.  Please email us instead.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("We could not reach the server.  Please email us instead.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-lg border border-navy/10 bg-white p-8">
        <h3 className="text-xl font-light text-navy">Thank you</h3>
        <p className="mt-3 text-sm font-light leading-relaxed text-navy/70">
          We have your message and will come back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={label}>First name *</label>
          <input id="firstName" name="firstName" required autoComplete="given-name" className={field} />
        </div>
        <div>
          <label htmlFor="lastName" className={label}>Last name</label>
          <input id="lastName" name="lastName" autoComplete="family-name" className={field} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className={label}>Email *</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={field} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className={label}>Company name</label>
          <input id="company" name="company" autoComplete="organization" className={field} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Mobile phone number</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} />
        </div>
      </div>
      <div>
        <label htmlFor="message" className={label}>How can we help?</label>
        <textarea id="message" name="message" rows={4} maxLength={4000} className={field} />
      </div>
      {/* A real person never sees or fills this. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <p className="text-xs font-light leading-relaxed text-navy/60">
        Investor Property is committed to protecting and respecting your privacy.  We will only use your personal
        information to answer your enquiry and to provide the services you ask for.
      </p>
      <label className="flex items-start gap-2 text-sm font-light text-navy/70">
        <input type="checkbox" name="marketing" className="mt-1 h-4 w-4" />
        <span>I agree to receive other communications from Investor Property.</span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="rounded-sm bg-gold px-6 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light disabled:opacity-60"
      >
        {state === "sending" ? "Sending..." : "Send"}
      </button>
      <p className="text-xs font-light text-navy/50">
        By clicking send you allow Investor Property to store and process the information above so we can respond.
      </p>
    </form>
  );
}
