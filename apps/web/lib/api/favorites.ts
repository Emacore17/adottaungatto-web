import { listAccountFavorites } from "@/lib/api/account"

const favoritePageSize = 50

export async function listFavoriteListingIds(
  bearerToken: string,
  candidateListingIds: Iterable<string>
) {
  const remainingIds = new Set(candidateListingIds)
  const favoriteIds = new Set<string>()

  if (remainingIds.size === 0) {
    return favoriteIds
  }

  let page = 1
  let totalPages = 1

  while (page <= totalPages && remainingIds.size > 0) {
    const result = await listAccountFavorites(bearerToken, {
      page,
      pageSize: favoritePageSize,
    })

    if (!result.ok) {
      return favoriteIds
    }

    for (const item of result.data.items) {
      if (remainingIds.has(item.listing.id)) {
        favoriteIds.add(item.listing.id)
        remainingIds.delete(item.listing.id)
      }
    }

    totalPages = result.data.meta.totalPages
    page += 1
  }

  return favoriteIds
}
