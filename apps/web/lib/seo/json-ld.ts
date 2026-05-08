import { routes } from "@/lib/routes"
import { absoluteUrl } from "@/lib/seo/metadata"
import { siteConfig } from "@/lib/config/site"
import type { PublicListingDetail } from "@/lib/api/types"

export function createOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  }
}

export function createWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl(routes.listings())}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
}

export function createListingJsonLd(listing: PublicListingDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: listing.title,
    description: listing.description,
    availability: "https://schema.org/InStock",
    price: listing.isFree ? "0" : String(listing.contributionCents ?? 0),
    priceCurrency: "EUR",
    url: absoluteUrl(routes.listing(listing.id)),
    areaServed: listing.location?.region.name ?? "Italia",
    seller: {
      "@type": "Organization",
      name: listing.owner.displayName,
    },
  }
}
