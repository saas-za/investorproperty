import Link from "next/link";
import { offers, site } from "@/lib/site/content";
import { SiteHeaderBar } from "@/components/site/SiteHeader";
import { PORTAL } from "@/lib/site/vacancies";

const nav = [
  ...offers.map((o) => ({ href: `/${o.slug}`, label: o.name })),
  { href: "/vacancy-schedules", label: "Vacancy schedules" },
  { href: "/land-estimate", label: "Land estimate" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  // The client portal is Parcello's: a magic link, and the client's own area including Frankendale for those invited.
  return <SiteHeaderBar name={site.name} nav={nav} portalHref={`${PORTAL}/login?next=${encodeURIComponent("/frankendale")}`} />;
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
