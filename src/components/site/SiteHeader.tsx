"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };

function Nav({ nav, portalHref }: { nav: NavItem[]; portalHref: string }) {
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-light">
      {nav.map((n) => (
        <Link key={n.href} href={n.href} className="transition hover:text-gold-light">
          {n.label}
        </Link>
      ))}
      <a href={portalHref} className="rounded-sm border border-gold/60 px-4 py-1.5 text-gold-light transition hover:bg-gold hover:text-navy-deep">
        Client portal
      </a>
    </nav>
  );
}

/**
 * The top of every page. The large logo sits at the top of the page and scrolls away with it, so nothing resizes under the reader's finger.
 * Once the page is scrolled past it, a slim bar with the small logo slides in and stays at the top.
 */
export function SiteHeaderBar({ name, nav, portalHref }: { name: string; nav: NavItem[]; portalHref: string }) {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const on = () => setStuck(window.scrollY > 260);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <header className="bg-navy text-shell">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-4">
          <Link href="/" aria-label={`${name} home`}>
            <Image src="/logo.png" alt={name} width={2229} height={1083} priority className="h-28 w-auto sm:h-56" />
          </Link>
          <Nav nav={nav} portalHref={portalHref} />
        </div>
        <div className="rule-gold h-px w-full" />
      </header>
      <div
        aria-hidden={!stuck}
        className={`fixed inset-x-0 top-0 z-40 bg-navy text-shell shadow-md transition-transform duration-300 ${stuck ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-x-8 px-4 py-2">
          <Link href="/" aria-label={`${name} home`} tabIndex={stuck ? 0 : -1}>
            <Image src="/logo.png" alt="" width={2229} height={1083} className="h-12 w-auto" />
          </Link>
          <div className="hidden sm:block">
            <Nav nav={nav} portalHref={portalHref} />
          </div>
        </div>
        <div className="rule-gold h-px w-full" />
      </div>
    </>
  );
}
