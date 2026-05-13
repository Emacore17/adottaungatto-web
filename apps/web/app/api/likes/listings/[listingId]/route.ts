import { NextResponse } from "next/server"
import { likeListingIdParamSchema } from "@workspace/validation/likes"

import { likeListing, unlikeListing } from "@/lib/api/likes"
import { getSessionToken } from "@/lib/auth/session"

type LikeRouteContext = {
  params: Promise<{
    listingId: string
  }>
}

export async function POST(_request: Request, context: LikeRouteContext) {
  return mutateListingLike(context, "like")
}

export async function DELETE(_request: Request, context: LikeRouteContext) {
  return mutateListingLike(context, "unlike")
}

async function mutateListingLike(
  context: LikeRouteContext,
  action: "like" | "unlike"
) {
  const params = await context.params
  const parsedParams = likeListingIdParamSchema.safeParse(params)

  if (!parsedParams.success) {
    return NextResponse.json({ message: "Invalid listing id." }, { status: 400 })
  }

  const token = await getSessionToken()

  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 })
  }

  const result =
    action === "like"
      ? await likeListing(token, parsedParams.data.listingId)
      : await unlikeListing(token, parsedParams.data.listingId)

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  return NextResponse.json(result.data)
}
