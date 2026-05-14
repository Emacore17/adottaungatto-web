"use server"

import { revalidatePath, updateTag } from "next/cache"
import { redirect } from "next/navigation"
import { favoriteListingIdParamSchema } from "@workspace/validation/favorites"

import { addAccountFavorite, removeAccountFavorite } from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"
import { cacheTags } from "@/lib/cache/tags"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

type FavoriteAction = "add" | "remove"
type FavoriteResult = "error" | "removed" | "saved" | "unavailable"

export async function saveFavoriteAction(formData: FormData) {
  formData.set("favoriteAction", "add")

  return toggleFavoriteAction(formData)
}

export async function toggleFavoriteAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const parsed = favoriteListingIdParamSchema.safeParse({
    listingId: readFormString(formData, "listingId"),
  })

  if (!parsed.success) {
    redirect(routes.listings())
  }

  const nextPath = readNextPath(formData, routes.listing(parsed.data.listingId))
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(nextPath))
  }

  const favoriteAction = readFavoriteAction(formData)
  const result =
    favoriteAction === "remove"
      ? await removeAccountFavorite(token, parsed.data.listingId)
      : await addAccountFavorite(token, parsed.data.listingId)

  if (result.ok) {
    updateTag(cacheTags.publicListings)
    updateTag(cacheTags.publicListing(parsed.data.listingId))
    revalidatePath(routes.listings())
    revalidatePath(routes.listing(parsed.data.listingId))
    revalidatePath(routes.account)
    revalidatePath(routes.accountFavorites)
    redirectWithFavoriteStatus(
      nextPath,
      favoriteAction === "remove" ? "removed" : "saved"
    )
  }

  if (result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (result.status === 404) {
    redirectWithFavoriteStatus(nextPath, "unavailable")
  }

  redirectWithFavoriteStatus(nextPath, "error")
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value : ""
}

function readNextPath(formData: FormData, fallback: string) {
  const value = readFormString(formData, "nextPath")

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value
  }

  return fallback
}

function readFavoriteAction(formData: FormData): FavoriteAction {
  return readFormString(formData, "favoriteAction") === "remove"
    ? "remove"
    : "add"
}

function redirectWithFavoriteStatus(
  path: string,
  result: FavoriteResult
): never {
  const url = new URL(path, "http://adottaungatto.local")

  url.searchParams.set("favorite", result)

  redirect(`${url.pathname}${url.search}${url.hash}`)
}
