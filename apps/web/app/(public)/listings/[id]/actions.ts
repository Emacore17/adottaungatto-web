"use server"

import { redirect } from "next/navigation"
import {
  listingContactCreateSchema,
  listingContactListingIdParamSchema,
} from "@workspace/validation/contacts"
import {
  listingReportCreateSchema,
  listingReportListingIdParamSchema,
} from "@workspace/validation/reports"

import { createListingContactRequest } from "@/lib/api/contacts"
import { createListingReport } from "@/lib/api/reports"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

type ContactResult = "error" | "invalid" | "sent" | "unavailable"
type ReportResult =
  | "already_sent"
  | "error"
  | "invalid"
  | "own_listing"
  | "rate_limited"
  | "sent"
  | "unavailable"

export async function contactListingOwnerAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const listingId = readFormString(formData, "listingId")
  const parsedParams = listingContactListingIdParamSchema.safeParse({
    listingId,
  })

  if (!parsedParams.success) {
    redirect(routes.listings())
  }

  const next = routes.listing(parsedParams.data.listingId)
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(next))
  }

  const parsedBody = listingContactCreateSchema.safeParse({
    message: readFormString(formData, "message"),
    shareEmail: readFormString(formData, "shareEmail") === "true",
    sharePhone: readFormString(formData, "sharePhone") === "true",
  })

  if (!parsedBody.success) {
    redirect(createContactResultPath(parsedParams.data.listingId, "invalid"))
  }

  const result = await createListingContactRequest(
    token,
    parsedParams.data.listingId,
    parsedBody.data
  )

  if (result.ok) {
    redirect(createContactResultPath(parsedParams.data.listingId, "sent"))
  }

  if (result.status === 401) {
    redirect(routes.login(next))
  }

  if (result.status === 404) {
    redirect(
      createContactResultPath(parsedParams.data.listingId, "unavailable")
    )
  }

  redirect(createContactResultPath(parsedParams.data.listingId, "error"))
}

export async function reportListingAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const listingId = readFormString(formData, "listingId")
  const parsedParams = listingReportListingIdParamSchema.safeParse({
    listingId,
  })

  if (!parsedParams.success) {
    redirect(routes.listings())
  }

  const next = routes.listing(parsedParams.data.listingId)
  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(`${next}#report-listing`))
  }

  const parsedBody = listingReportCreateSchema.safeParse({
    reasonCode: readFormString(formData, "reasonCode"),
    description: readOptionalFormString(formData, "description"),
  })

  if (!parsedBody.success) {
    redirect(createReportResultPath(parsedParams.data.listingId, "invalid"))
  }

  const result = await createListingReport(
    token,
    parsedParams.data.listingId,
    parsedBody.data
  )

  if (result.ok) {
    redirect(
      createReportResultPath(
        parsedParams.data.listingId,
        result.data.created ? "sent" : "already_sent"
      )
    )
  }

  if (result.status === 401) {
    redirect(routes.login(`${next}#report-listing`))
  }

  if (result.status === 404) {
    redirect(createReportResultPath(parsedParams.data.listingId, "unavailable"))
  }

  if (result.status === 400 && result.reason === "listing_report_own_listing") {
    redirect(createReportResultPath(parsedParams.data.listingId, "own_listing"))
  }

  if (result.status === 429) {
    redirect(createReportResultPath(parsedParams.data.listingId, "rate_limited"))
  }

  redirect(createReportResultPath(parsedParams.data.listingId, "error"))
}

function createContactResultPath(listingId: string, result: ContactResult) {
  return `${routes.listing(listingId)}?contact=${result}#contact-owner`
}

function createReportResultPath(listingId: string, result: ReportResult) {
  return `${routes.listing(listingId)}?report=${result}#report-listing`
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value : ""
}

function readOptionalFormString(formData: FormData, key: string) {
  const value = readFormString(formData, key).trim()

  return value || undefined
}
