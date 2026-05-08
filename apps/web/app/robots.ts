import type { MetadataRoute } from "next"

import { isProduction } from "@/lib/config/env"
import { routes } from "@/lib/routes"
import { absoluteUrl } from "@/lib/seo/metadata"

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [routes.account, routes.accountDrafts, routes.moderation],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
