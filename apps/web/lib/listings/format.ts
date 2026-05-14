type ListingPrice = {
  contributionCents: number | null
  isFree: boolean
}

export function formatAgeMonths(ageMonths: number | null) {
  if (ageMonths === null) {
    return "Eta non indicata"
  }

  if (ageMonths < 12) {
    return ageMonths === 1 ? "1 mese" : `${ageMonths} mesi`
  }

  const years = Math.floor(ageMonths / 12)
  const remainingMonths = ageMonths % 12
  const yearLabel = years === 1 ? "1 anno" : `${years} anni`

  if (remainingMonths === 0) {
    return yearLabel
  }

  return `${yearLabel} e ${remainingMonths} ${
    remainingMonths === 1 ? "mese" : "mesi"
  }`
}

export function formatListingPrice(listing: ListingPrice) {
  if (listing.isFree || listing.contributionCents === null) {
    return "Adozione gratuita"
  }

  return new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    style: "currency",
  }).format(listing.contributionCents / 100)
}
