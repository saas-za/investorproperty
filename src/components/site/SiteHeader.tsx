"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The top of every page. The logo opens large and shrinks to a slim bar once the page is scrolled, and the bar stays at the top.
 */
export function SiteHeaderBar({ name, nav, portalHref }: { name: string; nav: { href: string; label: string }[]; portalHref: string }) {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const on = () => setSmall(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-navy text-shell shadow-sm">
      <div className={`mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 transition-all duration-300 ${small ? "py-2" : "py-4"}`}>
        <Link href="/" aria-label={`${name} home`}>
          <Image
            src="/logo.png"
            alt={name}
            width={2229}
            height={1083}
            priority
            className={`w-auto transition-all duration-300 ${small ? "h-12" : "h-32 sm:h-56"}`}
          />
        </Link>
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
      </div>
      <div className="rule-gold h-px w-full" />
    </header>
  );
}
