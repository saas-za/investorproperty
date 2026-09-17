"use client";

import { useState } from "react";

const PHONE = "082 447 1190";
const PHONE_TEL = "+27824471190";
const EMAIL = "morne@investorproperty.co.za";

/**
 * The conversion half of the page. The estimate is the reason someone arrives;
 * this is the reason the visit is worth anything. Contact details sit beside
 * the form rather than behind it, because a broker who hides their number
 * behind a form loses the person who would simply have phoned.
 */
export default function ContactCta({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send that — try the email address instead");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the server — try the email address instead");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="no-print mt-6 overflow-hidden rounded-lg border border-navy/10 bg-navy text-shell shadow-sm">
      <div className="grid gap-6 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-8">
        <div>
          <h2 className="text-xl font-light sm:text-2xl">
            Require more in-depth market research?
          </h2>
          <p className="mt-3 text-sm font-light leading-relaxed text-shell/70">
            This estimate is a starting point. What it cannot tell you is what is actually selling
            in that node, at what rate, and how long it took — which is the part that decides
            whether the scheme works. If you want that for a specific site, ask.
          </p>

          {!open && !sent && (
            <button
              onClick={() => setOpen(true)}
              className="mt-5 rounded-sm bg-gold px-6 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light"
            >
              Request market research
            </button>
          )}

          {sent ? (
            <div className="mt-5 rounded border border-gold/40 bg-white/5 p-4 text-sm font-light">
              Thank you — that&apos;s come through. I&apos;ll come back to you personally, usually
              within a working day.
            </div>
          ) : (
            open && (
              <form onSubmit={submit} className="mt-5 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    aria-label="Your name"
                    className="rounded border border-shell/25 bg-white/10 px-3 py-2 text-sm text-shell placeholder:text-shell/40"
                  />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Email"
                    aria-label="Your email address"
                    className="rounded border border-shell/25 bg-white/10 px-3 py-2 text-sm text-shell placeholder:text-shell/40"
                  />
                </div>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone (optional)"
                  aria-label="Your phone number"
                  className="w-full rounded border border-shell/25 bg-white/10 px-3 py-2 text-sm text-shell placeholder:text-shell/40"
                />
                <textarea
                  required
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Which site, and what do you need to know about it?"
                  aria-label="Your message"
                  className="w-full rounded border border-shell/25 bg-white/10 px-3 py-2 text-sm text-shell placeholder:text-shell/40"
                />
                {error && (
                  <p className="rounded bg-red-500/15 px-3 py-2 text-xs text-red-200">{error}</p>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-sm bg-gold px-6 py-2.5 text-sm font-medium text-navy-deep transition hover:bg-gold-light disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-xs text-shell/50 hover:text-shell"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-shell/40">
                  Your contact details are used to reply to you and nothing else. The property
                  details you entered above are not sent with this and are not stored.
                </p>
              </form>
            )
          )}
        </div>

        <div className="border-t border-shell/15 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-light/80">
            Or simply call
          </p>
          <div className="mt-4 space-y-3 text-sm font-light">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-shell/40">Morné Combrinck</div>
              <a
                href={`tel:${PHONE_TEL}`}
                className="mt-0.5 block text-lg text-gold-light transition hover:text-gold"
              >
                {PHONE}
              </a>
            </div>
            <div>
              <a
                href={`mailto:${EMAIL}`}
                className="block break-all text-shell/80 underline underline-offset-4 transition hover:text-gold-light"
              >
                {EMAIL}
              </a>
            </div>
            <a
              href={`https://wa.me/${PHONE_TEL.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm border border-shell/25 px-4 py-2 text-xs transition hover:border-gold-light hover:text-gold-light"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
