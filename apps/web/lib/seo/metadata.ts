import type { Metadata } from "next"

import { siteConfig } from "@/lib/config/site"
import { webEnv } from "@/lib/config/env"

type PageMetadataInput = {
  title?: string
  description?: string
  path?: string
  noIndex?: boolean
  image?: string
}

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${siteConfig.url}${normalizedPath}`
}

export function createPageMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  noIndex = false,
  image = "/opengraph-image",
}: PageMetadataInput = {}): Metadata {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.title
  const url = absoluteUrl(path)
  const imageUrl = absoluteUrl(image)

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: pageTitle,
      description,
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
    },
    robots:
      noIndex || !webEnv.searchIndexingEnabled
        ? {
            index: false,
            follow: false,
          }
        : undefined,
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [imageUrl],
    },
  }
}
