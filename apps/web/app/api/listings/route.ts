import { NextResponse } from "next/server"

import {
  listPublicListings,
  parseListingSearchParams,
} from "@/lib/api/listings"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = parseListingSearchParams(
    Object.fromEntries(searchParams.entries())
  )

  if (parsed.error) {
    return NextResponse.json({ message: parsed.error }, { status: 400 })
  }

  const result = await listPublicListings(parsed.query)

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  return NextResponse.json(result.data)
}
