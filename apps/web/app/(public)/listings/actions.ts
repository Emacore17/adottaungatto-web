"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { favoriteListingIdParamSchema } from "@workspace/validation/favorites"

import { addAccountFavorite } from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"

type FavoriteResult = "error" | "saved" | "unavailable"

export async function saveFavoriteAction(formData: FormData) {
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

  const result = await addAccountFavorite(token, parsed.data.listingId)

  if (result.ok) {
    revalidatePath(routes.account)
    revalidatePath(routes.accountFavorites)
    redirectWithFavoriteStatus(nextPath, "saved")
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

function redirectWithFavoriteStatus(path: string, result: FavoriteResult): never {
  const separator = path.includes("?") ? "&" : "?"
  const hashIndex = path.indexOf("#")

  if (hashIndex >= 0) {
    const basePath = path.slice(0, hashIndex)
    const hash = path.slice(hashIndex)
    const baseSeparator = basePath.includes("?") ? "&" : "?"

    redirect(`${basePath}${baseSeparator}favorite=${result}${hash}`)
  }

  redirect(`${path}${separator}favorite=${result}#save-favorite`)
}
