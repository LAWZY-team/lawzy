import type { MetadataRoute } from "next";
import {
  getProductionSiteUrl,
  isRobotIndexingAllowed,
} from "@/lib/seo/site-env";

export default function robots(): MetadataRoute.Robots {
  if (!isRobotIndexingAllowed()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${getProductionSiteUrl()}/sitemap.xml`,
  };
}
