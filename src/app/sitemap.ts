import type { MetadataRoute } from "next";
import { offers, site } from "@/lib/site/content";
import { VACANCIES_ON } from "@/lib/site/vacancies";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", ...offers.map((o) => `/${o.slug}`), "/frankendale", ...(VACANCIES_ON ? ["/vacancy-schedules"] : []), "/land-estimate", "/faq", "/contact"];
  return paths.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
