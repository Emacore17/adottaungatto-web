import { NextResponse } from "next/server"
import type { PlaceAutocompleteType } from "@workspace/validation/places"

import { autocompletePlaces } from "@/lib/api/places"

const placeTypes = new Set(["municipality", "province", "region"])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const type = searchParams.get("type") ?? undefined

  if (q.length < 2) {
    return NextResponse.json({
      items: [],
      meta: {
        query: q,
        normalizedQuery: q,
        limit: 8,
        type: type ?? "all",
      },
    })
  }

  const result = await autocompletePlaces({
    q,
    limit: Number(searchParams.get("limit") ?? 8),
    type:
      type && placeTypes.has(type)
        ? (type as PlaceAutocompleteType)
        : undefined,
  })

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status ?? 502 }
    )
  }

  return NextResponse.json(result.data)
}
