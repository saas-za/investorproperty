import type { MetadataRoute } from "next";
import { site } from "@/lib/site/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/crm/", "/sign-in", "/valuation"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
