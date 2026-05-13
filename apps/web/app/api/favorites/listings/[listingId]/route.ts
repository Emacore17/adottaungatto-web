import { NextResponse } from "next/server"
import { favoriteListingIdParamSchema } from "@workspace/validation/favorites"

import { addAccountFavorite, removeAccountFavorite } from "@/lib/api/account"
import { listFavoriteListingIds } from "@/lib/api/favorites"
import { getPublicListing } from "@/lib/api/listings"
import { getSessionToken } from "@/lib/auth/session"

type FavoriteRouteContext = {
  params: Promise<{
    listingId: string
  }>
}

export const dynamic = "force-dynamic"

export async function POST(_request: Request, context: FavoriteRouteContext) {
  return mutateListingFavorite(context, "save")
}

export async function GET(_request: Request, context: FavoriteRouteContext) {
  const params = await context.params
  const parsedParams = favoriteListingIdParamSchema.safeParse(params)

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "Invalid listing id." },
      { status: 400 }
    )
  }

  const token = await getSessionToken()

  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
  }

  const listing = await getPublicListing(parsedParams.data.listingId, {
    cache: "no-store",
  })

  if (!listing.ok) {
    return NextResponse.json(
      { message: listing.message },
      { status: listing.status ?? 502 }
    )
  }

  const favoriteListingIds = await listFavoriteListingIds(token, [
    parsedParams.data.listingId,
  ])

  return NextResponse.json({
    favoriteCount: listing.data.stats.favoriteCount,
    favorited: favoriteListingIds.has(parsedParams.data.listingId),
    listingId: parsedParams.data.listingId,
  })
}

export async function DELETE(_request: Request, context: FavoriteRouteContext) {
  return mutateListingFavorite(context, "remove")
}

async function mutateListingFavorite(
  context: FavoriteRouteContext,
  action: "save" | "remove"
) {
  const params = await context.params
  const parsedParams = favoriteListingIdParamSchema.safeParse(params)

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: "Invalid listing id." },
      { status: 400 }
    )
  }

  const token = await getSessionToken()

  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
  }

  const result =
    action === "save"
      ? await addAccountFavorite(token, parsedParams.data.listingId)
      : await removeAccountFavorite(token, parsedParams.data.listingId)

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  const listing = await getPublicListing(parsedParams.data.listingId, {
    cache: "no-store",
  })

  return NextResponse.json({
    ...result.data,
    favoriteCount: listing.ok ? listing.data.stats.favoriteCount : undefined,
    favorited: action === "save",
  })
}
