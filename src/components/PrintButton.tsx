"use client";

/**
 * A one-line client island so pages that are otherwise static server
 * components can still offer a print/PDF button.
 */
export default function PrintButton({
  label = "Download as PDF",
  className = "rounded-sm border border-navy/20 px-4 py-2 text-xs font-medium text-navy transition hover:bg-navy/5",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
