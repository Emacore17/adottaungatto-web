import type { MetadataRoute } from "next"

import { listPublicListings } from "@/lib/api/listings"
import { webEnv } from "@/lib/config/env"
import { routes } from "@/lib/routes"
import { absoluteUrl } from "@/lib/seo/metadata"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!webEnv.searchIndexingEnabled) {
    return []
  }

  const now = new Date()
  const listings = await listPublicListings({
    page: 1,
    pageSize: 50,
    sort: "recent",
  })

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(routes.home),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl(routes.listings()),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ]

  if (!listings.ok) {
    return staticRoutes
  }

  return [
    ...staticRoutes,
    ...listings.data.items.map((listing) => ({
      url: absoluteUrl(routes.listing(listing.id)),
      lastModified: new Date(listing.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ]
}
