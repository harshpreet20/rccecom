import type { MetadataRoute } from "next";
import { storeConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow classic crawlers and common GEO / AI answer-engine bots.
      { userAgent: "*", allow: "/", disallow: ["/checkout", "/api/"] },
    ],
    sitemap: `${storeConfig.siteUrl}/sitemap.xml`,
    host: storeConfig.siteUrl,
  };
}
