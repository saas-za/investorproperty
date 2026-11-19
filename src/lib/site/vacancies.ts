/**
 * Vacancies come live from the Parcello portal, which holds what each landlord has chosen to publish. Nothing here is stored on this website.
 */
export const PORTAL = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://portal.parcello.co.za").replace(/\/$/, "");

/** The "To let" section is switched off until real vacancies are published. Set NEXT_PUBLIC_VACANCIES=on to show it again. */
export const VACANCIES_ON = process.env.NEXT_PUBLIC_VACANCIES === "on";

export type Listing = {
  id: string;
  kind: string;
  name: string;
  floor: string | null;
  size: number | null;
  status: string;
  note: string | null;
  building: string;
  address: string | null;
  price: { monthly: number | null; perM2: number | null } | null;
  opexPerM2: number | null;
  photos: string[];
};

export const KINDS: [string, string][] = [
  ["", "All types"],
  ["office", "Office"],
  ["industrial", "Industrial"],
  ["retail", "Retail"],
  ["parking", "Parking"],
  ["store", "Store room"],
  ["other", "Other"],
];

export const rand = (n: number) => `R ${Math.round(n).toLocaleString("en-ZA").replace(/,/g, " ")}`;
export const photoUrl = (id: string) => `${PORTAL}/api/public/vacancies?photo=${id}`;
export const brochureUrl = (id: string) => `${PORTAL}/api/public/vacancies?brochure=${id}`;

export async function fetchListings(query: URLSearchParams): Promise<Listing[]> {
  try {
    const res = await fetch(`${PORTAL}/api/public/vacancies?${query}`, { next: { revalidate: 120 } });
    const j = await res.json();
    return j.ok ? j.listings : [];
  } catch {
    return [];
  }
}

export async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${PORTAL}/api/public/vacancies?id=${encodeURIComponent(id)}`, { next: { revalidate: 120 } });
    const j = await res.json();
    return j.ok ? j.listing : null;
  } catch {
    return null;
  }
}
