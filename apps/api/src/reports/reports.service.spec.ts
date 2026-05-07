import { BadRequestException, NotFoundException } from "@nestjs/common"
import { describe, expect, it, vi } from "vitest"

import type { DatabaseService } from "../database/database.service.js"
import { ReportsService } from "./reports.service.js"

describe("ReportsService", () => {
  it("creates a listing report linked to a moderation case", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            owner_user_id: "owner-id",
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "report-id",
            moderation_case_id: "case-id",
            listing_id: "listing-id",
            reason_code: "suspected_scam",
            description: "Richiesta sospetta.",
            status: "linked",
            created_at: "2026-04-01T12:00:00.000Z",
            updated_at: "2026-04-01T12:00:00.000Z",
            moderation_case_status: "open",
            action_id: "action-id",
          },
        ]),
    } as unknown as DatabaseService
    const service = new ReportsService(databaseService)

    await expect(
      service.reportListing("reporter-id", "listing-id", {
        reasonCode: "suspected_scam",
        description: "Richiesta sospetta.",
      })
    ).resolves.toEqual({
      created: true,
      report: {
        id: "report-id",
        listingId: "listing-id",
        moderationCaseId: "case-id",
        reasonCode: "suspected_scam",
        description: "Richiesta sospetta.",
        status: "linked",
        createdAt: "2026-04-01T12:00:00.000Z",
        updatedAt: "2026-04-01T12:00:00.000Z",
      },
      moderationCase: {
        id: "case-id",
        status: "open",
      },
      action: {
        id: "action-id",
      },
    })
    expect(vi.mocked(databaseService.queryRows).mock.calls[0]?.[1]).toEqual([
      "listing-id",
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[1]?.[1]).toEqual([
      "reporter-id",
      "listing-id",
    ])
    expect(vi.mocked(databaseService.queryRows).mock.calls[2]?.[1]).toEqual([
      "reporter-id",
      "listing-id",
      "suspected_scam",
      "Richiesta sospetta.",
    ])
  })

  it("returns an existing active report instead of duplicating it", async () => {
    const databaseService = {
      queryRows: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: "listing-id",
            owner_user_id: "owner-id",
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "report-id",
            moderation_case_id: "case-id",
            listing_id: "listing-id",
            reason_code: "abuse",
            description: null,
            status: "linked",
            created_at: "2026-04-01T12:00:00.000Z",
            updated_at: "2026-04-01T12:00:00.000Z",
            moderation_case_status: "open",
          },
        ]),
    } as unknown as DatabaseService
    const service = new ReportsService(databaseService)

    await expect(
      service.reportListing("reporter-id", "listing-id", {
        reasonCode: "abuse",
      })
    ).resolves.toEqual({
      created: false,
      report: {
        id: "report-id",
        listingId: "listing-id",
        moderationCaseId: "case-id",
        reasonCode: "abuse",
        description: null,
        status: "linked",
        createdAt: "2026-04-01T12:00:00.000Z",
        updatedAt: "2026-04-01T12:00:00.000Z",
      },
      moderationCase: {
        id: "case-id",
        status: "open",
      },
      action: null,
    })
    expect(databaseService.queryRows).toHaveBeenCalledTimes(2)
  })

  it("rejects reports for own listings", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([
        {
          id: "listing-id",
          owner_user_id: "reporter-id",
        },
      ]),
    } as unknown as DatabaseService
    const service = new ReportsService(databaseService)

    await expect(
      service.reportListing("reporter-id", "listing-id", {
        reasonCode: "false_information",
      })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })

  it("rejects reports for listings that are not reportable", async () => {
    const databaseService = {
      queryRows: vi.fn().mockResolvedValueOnce([]),
    } as unknown as DatabaseService
    const service = new ReportsService(databaseService)

    await expect(
      service.reportListing("reporter-id", "listing-id", {
        reasonCode: "not_relevant",
      })
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(databaseService.queryRows).toHaveBeenCalledTimes(1)
  })
})
