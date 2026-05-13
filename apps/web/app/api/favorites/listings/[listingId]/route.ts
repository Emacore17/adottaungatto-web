import { NextResponse } from "next/server"
import { favoriteListingIdParamSchema } from "@workspace/validation/favorites"

import { addAccountFavorite, removeAccountFavorite } from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"

type FavoriteRouteContext = {
  params: Promise<{
    listingId: string
  }>
}

export async function POST(_request: Request, context: FavoriteRouteContext) {
  return mutateListingFavorite(context, "save")
}

export async function DELETE(
  _request: Request,
  context: FavoriteRouteContext
) {
  return mutateListingFavorite(context, "remove")
}

async function mutateListingFavorite(
  context: FavoriteRouteContext,
  action: "save" | "remove"
) {
  const params = await context.params
  const parsedParams = favoriteListingIdParamSchema.safeParse(params)

  if (!parsedParams.success) {
    return NextResponse.json({ message: "Invalid listing id." }, { status: 400 })
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

  return NextResponse.json({
    ...result.data,
    favorited: action === "save",
  })
}
