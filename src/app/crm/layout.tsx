import Link from "next/link";

const NAV = [
  { href: "/crm", label: "Overview" },
  { href: "/crm/leads", label: "Leads" },
  { href: "/crm/deals", label: "Deals" },
  { href: "/crm/land", label: "Development Land" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-shell">
      <header className="bg-navy text-shell">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-6 px-4 py-3">
          <Link href="/crm" className="text-sm font-bold uppercase tracking-[0.18em]">
            CRM Matrix
          </Link>
          <nav className="flex gap-1 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-1.5 text-shell/70 transition hover:bg-shell/10 hover:text-shell"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-[11px] text-shell/50">Investor Property</span>
        </div>
      </header>
      {children}
    </div>
  );
}
