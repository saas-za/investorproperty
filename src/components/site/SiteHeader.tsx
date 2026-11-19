"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type NavItem = { href: string; label: string };

/**
 * One slim bar, always the same size, fixed to the top of the page.
 * "What we do" opens the four kinds of property; the rest are single links.  On a phone everything folds into one menu.
 */
export function SiteHeaderBar({
  name,
  services,
  links,
  portalHref,
}: {
  name: string;
  services: NavItem[];
  links: NavItem[];
  portalHref: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="sticky top-0 z-40 bg-navy text-shell">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-6 px-4 py-3 sm:px-8 lg:px-12">
        <Link href="/" aria-label={`${name} home`} onClick={close}>
          <Image src="/logo.png" alt={name} width={2229} height={1083} priority className="-my-2 h-[4.5rem] w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 text-sm font-light lg:flex">
          <div className="group relative">
            <button type="button" className="py-2 transition hover:text-gold-light group-focus-within:text-gold-light" aria-haspopup="true">
              What we do
            </button>
            <div className="invisible absolute left-0 top-full w-56 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <ul className="border border-shell/15 bg-navy-deep py-2 shadow-lg">
                {services.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="block px-5 py-2.5 transition hover:text-gold-light">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-gold-light">
              {l.label}
            </Link>
          ))}
          <a href={portalHref} className="border-b border-gold/60 py-1 text-gold-light transition hover:border-gold-light">
            Client portal
          </a>
        </nav>

        <button
          type="button"
          className="py-2 text-sm font-light lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-shell/15 bg-navy-deep px-4 pb-6 pt-2 text-base font-light lg:hidden">
          <ul className="divide-y divide-shell/10">
            {[...services, ...links].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="block py-3">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={portalHref} className="block py-3 text-gold-light">
                Client portal
              </a>
            </li>
          </ul>
        </nav>
      )}
      <div className="rule-gold h-px w-full" />
    </header>
  );
}
