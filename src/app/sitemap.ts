import type { MetadataRoute } from "next";
import { offers, site } from "@/lib/site/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", ...offers.map((o) => `/${o.slug}`), "/vacancy-schedules", "/land-estimate", "/faq", "/contact"];
  return paths.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
