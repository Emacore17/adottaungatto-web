import type {
  ListingPublicSort,
  ListingSex,
} from "@workspace/validation/listings"
import type { PlaceAutocompleteType } from "@workspace/validation/places"

export const sexOptions = [
  { label: "Qualsiasi", value: "" },
  { label: "Maschio", value: "male" },
  { label: "Femmina", value: "female" },
  { label: "Non indicato", value: "unknown" },
] as const satisfies readonly { label: string; value: "" | ListingSex }[]

export const sortOptions = [
  { label: "Rilevanza", value: "relevance" },
  { label: "Piu recenti", value: "recent" },
  { label: "Distanza", value: "distance" },
] as const satisfies readonly { label: string; value: ListingPublicSort }[]

export const ageOptions = [
  { label: "Qualsiasi", value: "" },
  { label: "3 mesi", value: "3" },
  { label: "6 mesi", value: "6" },
  { label: "1 anno", value: "12" },
  { label: "2 anni", value: "24" },
  { label: "5 anni", value: "60" },
  { label: "10 anni", value: "120" },
] as const

export const radiusOptions = [
  { label: "10 km", value: "10" },
  { label: "25 km", value: "25" },
  { label: "50 km", value: "50" },
  { label: "100 km", value: "100" },
  { label: "200 km", value: "200" },
] as const

export const priceRangeOptions = [
  { label: "Qualsiasi", value: "all" },
  { label: "In regalo", value: "free", isFree: true },
  { label: "Fino a 50 euro", value: "to-50", contributionCentsMax: 5000 },
  {
    label: "50-100 euro",
    value: "50-100",
    contributionCentsMin: 5000,
    contributionCentsMax: 10000,
  },
  {
    label: "100-200 euro",
    value: "100-200",
    contributionCentsMin: 10000,
    contributionCentsMax: 20000,
  },
  { label: "Oltre 200 euro", value: "over-200", contributionCentsMin: 20000 },
] as const

export const booleanFilterOptions = [
  { label: "Con foto", key: "hasImages" },
  { label: "Vaccinati", key: "isVaccinated" },
  { label: "Sterilizzati", key: "isSterilized" },
  { label: "Sverminati", key: "isDewormed" },
  { label: "Microchip", key: "hasMicrochip" },
] as const

export function formatPlaceType(type: PlaceAutocompleteType) {
  if (type === "municipality") {
    return "comune"
  }

  if (type === "province") {
    return "provincia"
  }

  return "regione"
}
