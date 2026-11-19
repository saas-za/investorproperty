import Link from "next/link";
import { portal } from "@/config/platform";

export default function SignInPage() {
  return (
    <main className="flex-1 bg-shell">
      <section className="mx-auto max-w-xl px-4 py-20">
        <div className="rounded-lg border border-navy/10 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">{portal.name}</p>
          <h1 className="mt-3 text-3xl font-light text-navy">Sign in</h1>
          <p className="mt-4 text-sm font-light leading-relaxed text-navy/70">
            Sign in to save your estimate and continue to the land valuation calculator.
          </p>

          <div className="mt-8 space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-navy/60">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="mt-2 w-full rounded border border-navy/20 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/valuation"
              className="inline-flex rounded-sm bg-gold px-6 py-3 text-sm font-medium text-navy-deep transition hover:bg-gold-light"
            >
              Continue to calculator
            </Link>
            <Link href="/" className="text-sm text-navy/60 underline underline-offset-2">
              Back home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
