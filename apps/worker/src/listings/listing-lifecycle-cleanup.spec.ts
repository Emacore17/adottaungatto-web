import { describe, expect, it, vi } from "vitest"

import { cleanupListingLifecycleWithClient } from "./listing-lifecycle-cleanup.js"

describe("cleanupListingLifecycle", () => {
  it("soft-deletes stale editable listings in bounded batches", async () => {
    const client = createClientMock()
    client.unsafe.mockResolvedValueOnce([{ listing_id: "draft-id" }])
    client.unsafe.mockResolvedValueOnce([])

    const result = await cleanupListingLifecycleWithClient(client, {
      batchSize: 25,
      staleDraftTtlDays: 30,
    })

    expect(result).toEqual({
      job: "cleanup-listing-lifecycle",
      processed: 1,
      publishedExpired: 0,
      searchDocumentsDeleted: 0,
      staleDraftsDeleted: 1,
      status: "ok",
    })
    expect(client.unsafe.mock.calls[0]?.[0]).toContain(
      "moderation_status in ('draft', 'pending_review')"
    )
    expect(client.unsafe.mock.calls[0]?.[0]).toContain(
      "lifecycle_status = 'deleted'"
    )
    expect(client.unsafe.mock.calls[0]?.[1]).toEqual([30, 25])
  })

  it("expires published listings and removes their search documents", async () => {
    const client = createClientMock()
    client.unsafe.mockResolvedValueOnce([])
    client.unsafe.mockResolvedValueOnce([
      {
        listing_id: "published-id",
        search_document_deleted: true,
      },
    ])

    const result = await cleanupListingLifecycleWithClient(client, {
      batchSize: 10,
      staleDraftTtlDays: 30,
    })

    expect(result).toMatchObject({
      processed: 1,
      publishedExpired: 1,
      searchDocumentsDeleted: 1,
      staleDraftsDeleted: 0,
    })
    expect(client.unsafe.mock.calls[1]?.[0]).toContain("expires_at <= now()")
    expect(client.unsafe.mock.calls[1]?.[0]).toContain(
      "delete from listing_search_documents"
    )
    expect(client.unsafe.mock.calls[1]?.[1]).toEqual([10])
  })
})

function createClientMock() {
  return {
    unsafe: vi.fn(),
  }
}
