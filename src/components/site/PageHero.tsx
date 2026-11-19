import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The heading of an inside page: quiet, on the page itself, with a gold rule under it.
 * With an image (or any drawing, as `backdrop`), it fills the right of the block and fades out to the left, so text that runs over it stays readable.
 */
export default function PageHero({
  eyebrow,
  title,
  image,
  backdrop,
  children,
}: {
  eyebrow: string;
  title: string;
  image?: string;
  backdrop?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section>
      <div className="relative overflow-hidden">
        {(image || backdrop) && (
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-full lg:w-[70%]">
            {image ? <Image src={image} alt="" fill priority sizes="70vw" className="object-cover object-right" /> : backdrop}
            <div className="absolute inset-0 bg-gradient-to-r from-shell via-shell/85 to-shell/0 lg:via-shell/60" />
            <div className="absolute inset-0 bg-shell/30 lg:hidden" />
          </div>
        )}
        <div className="relative mx-auto max-w-screen-2xl px-4 pb-12 pt-16 sm:px-8 sm:pt-24 lg:px-12">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-deep">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-light leading-tight sm:text-5xl">{title}</h1>
          {children && <div className="mt-6 max-w-2xl text-base font-light leading-relaxed text-navy/75">{children}</div>}
        </div>
      </div>
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <div className="rule-gold h-px w-full" />
      </div>
    </section>
  );
}
