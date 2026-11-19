"use client";

import { useState } from "react";

const field =
  "mt-2 block w-full border-0 border-b border-shell/30 bg-transparent px-0 py-2 text-base font-light text-shell placeholder:text-shell/40 focus:border-gold-light focus:outline-none focus:ring-0";
const label = "block text-xs uppercase tracking-[0.15em] text-shell/60";

/** Express interest.  The answer comes from Parcello, which sends the invitation; nothing is kept on this site. */
export default function InterestForm() {
  const [f, setF] = useState({ email: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (done) return <p role="status" className="mt-8 max-w-xl text-lg font-light leading-relaxed text-shell">{done}</p>;

  return (
    <form
      className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          const r = await fetch("/api/frankendale-interest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(f),
          });
          const j = await r.json().catch(() => ({}));
          if (j.ok) setDone(j.message ?? "Thank you.  We will email you an invitation.");
          else setErr(j.error ?? "That did not work.  Please try again.");
        } catch {
          setErr("That did not work.  Please try again.");
        }
        setBusy(false);
      }}
    >
      <label className={`${label} sm:col-span-2`}>Email address<input required type="email" className={field} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></label>
      </div>
      {err && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className="rounded-sm bg-gold px-8 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light disabled:opacity-60">
          {busy ? "Sending…" : "Send me my invitation"}
        </button>
      </div>
    </form>
  );
}
