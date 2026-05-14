export const cacheTags = {
  publicCatBreeds: "public-cat-breeds",
  publicListing: (listingId: string) => `public-listing:${listingId}`,
  publicListings: "public-listings",
} as const
