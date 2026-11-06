import Image from "next/image";
import Link from "next/link";
import { offers, site } from "@/lib/site/content";
import { PORTAL } from "@/lib/site/vacancies";

const nav = [
  ...offers.map((o) => ({ href: `/${o.slug}`, label: o.name })),
  { href: "/vacancy-schedules", label: "Vacancy schedules" },
  { href: "/land-estimate", label: "Land estimate" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="bg-navy text-shell">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-3">
        <Link href="/" aria-label={`${site.name} home`}>
          <Image src="/logo.png" alt={site.name} width={2229} height={1083} priority className="h-14 w-auto" />
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-light">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="transition hover:text-gold-light">
              {n.label}
            </Link>
          ))}
          {/* The client portal is Parcello's: a magic link, and the client's own area including Frankendale for those invited. */}
          <a
            href={`${PORTAL}/login?next=${encodeURIComponent("/frankendale")}`}
            className="rounded-sm border border-gold/60 px-4 py-1.5 text-gold-light transition hover:bg-gold hover:text-navy-deep"
          >
            Client portal
          </a>
        </nav>
      </div>
      <div className="rule-gold h-px w-full" />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-shell/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm font-light sm:grid-cols-3">
        <div>
          <p className="font-medium text-shell">{site.name}</p>
          <p className="mt-3 leading-relaxed">{site.tagline}</p>
          <p className="mt-3">{site.place}</p>
        </div>
        <div>
          <p className="font-medium text-shell">What we do</p>
          <ul className="mt-3 space-y-2">
            {offers.map((o) => (
              <li key={o.slug}>
                <Link href={`/${o.slug}`} className="hover:text-gold-light">
                  {o.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/land-estimate" className="hover:text-gold-light">
                Land estimate
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-shell">Contact</p>
          <ul className="mt-3 space-y-2">
            <li>
              <a href={`tel:${site.phoneTel}`} className="hover:text-gold-light">
                {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="hover:text-gold-light">
                {site.email}
              </a>
            </li>
            <li>
              <Link href="/terms" className="hover:text-gold-light">
                Terms and privacy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-shell/10 px-4 py-5 text-center text-xs font-light text-shell/50">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
