import Image from "next/image";
import { PORTAL } from "@/lib/site/vacancies";

/** "powered by Parcello", with the Parcello mark.  Parcello is spelled with two l's. */
export default function PoweredByParcello() {
  return (
    <a
      href={PORTAL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 transition hover:opacity-80"
    >
      <span>powered by</span>
      <Image src="/parcello-mark.png" alt="" width={18} height={18} className="h-[18px] w-[18px]" />
      <span className="font-medium text-gold-deep">Parcello</span>
    </a>
  );
}
