"use server"

import { revalidatePath, updateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  moderationCaseIdParamSchema,
  moderationCommentSchema,
  moderationDecisionSchema,
} from "@workspace/validation/moderation"

import {
  claimModerationListingCase,
  commentModerationListingCase,
  decideModerationListingCase,
  type ModerationDecisionAction,
} from "@/lib/api/moderation"
import { getSessionToken } from "@/lib/auth/session"
import { cacheTags } from "@/lib/cache/tags"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

const moderationDecisionActions = new Set<string>([
  "approve",
  "reject",
  "suspend",
])

export async function decideModerationCaseAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(routes.moderation))
  }

  const action = normalizeString(formData.get("decisionAction"))

  if (!isModerationDecisionAction(action)) {
    redirect(`${routes.moderation}?decisionError=invalid_action`)
  }

  const caseId = moderationCaseIdParamSchema.safeParse({
    caseId: formData.get("caseId"),
  })
  const decision = moderationDecisionSchema.safeParse({
    reasonCode: normalizeString(formData.get("reasonCode")),
    reasonText: normalizeString(formData.get("reasonText")),
  })

  if (
    !caseId.success ||
    !decision.success ||
    requiresOtherReasonText(decision.data)
  ) {
    redirect(`${routes.moderation}?decisionError=invalid_reason`)
  }

  const response = await decideModerationListingCase(
    token,
    caseId.data.caseId,
    action,
    decision.data
  )

  if (!response.ok) {
    if (response.status === 401) {
      redirect(routes.login(routes.moderation))
    }

    redirect(
      `${routes.moderation}?decisionError=${encodeURIComponent(
        response.status ? String(response.status) : "request"
      )}`
    )
  }

  revalidateModerationPages()
  revalidatePublicListingCaches([response.data.listing.id])
  redirect(`${routes.moderation}?decision=${action}`)
}

export async function decideModerationBatchAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const token = await getSessionToken()
  const nextPath = readNextPath(formData, routes.moderationQueue)

  if (!token) {
    redirect(routes.login(nextPath))
  }

  const action = normalizeString(formData.get("decisionAction"))

  if (!isModerationDecisionAction(action)) {
    redirectWithDecisionStatus(nextPath, "invalid_action")
  }

  const caseIds = readCaseIds(formData)

  if (caseIds.length === 0) {
    redirectWithDecisionStatus(nextPath, "no_selection")
  }

  const decision = moderationDecisionSchema.safeParse({
    reasonCode: normalizeReasonCode(formData, action),
    reasonText: normalizeString(formData.get("reasonText")),
  })

  if (!decision.success || requiresOtherReasonText(decision.data)) {
    redirectWithDecisionStatus(nextPath, "invalid_reason")
  }

  const decidedListingIds = new Set<string>()
  let decidedCount = 0

  for (const caseId of caseIds) {
    const response = await decideModerationListingCase(
      token,
      caseId,
      action,
      decision.data
    )

    if (response.ok) {
      decidedCount += 1
      decidedListingIds.add(response.data.listing.id)
      continue
    }

    if (response.status === 401) {
      redirect(routes.login(nextPath))
    }
  }

  revalidateModerationPages()

  revalidatePublicListingCaches([...decidedListingIds])

  if (decidedCount === 0) {
    redirectWithDecisionStatus(nextPath, "no_cases_updated")
  }

  const params = new URLSearchParams({
    decision: action,
    decisionCount: String(decidedCount),
  })

  if (decidedCount < caseIds.length) {
    params.set("decisionFailed", String(caseIds.length - decidedCount))
  }

  redirect(withDecisionParams(nextPath, params))
}

export async function claimModerationCaseAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const token = await getSessionToken()
  const nextPath = readNextPath(formData, routes.moderationQueue)

  if (!token) {
    redirect(routes.login(nextPath))
  }

  const caseId = moderationCaseIdParamSchema.safeParse({
    caseId: formData.get("caseId"),
  })

  if (!caseId.success) {
    redirectWithClaimStatus(nextPath, "invalid_case")
  }

  const response = await claimModerationListingCase(token, caseId.data.caseId)

  if (!response.ok) {
    if (response.status === 401) {
      redirect(routes.login(nextPath))
    }

    redirectWithClaimStatus(
      nextPath,
      response.status === 409
        ? "already_assigned"
        : response.status
          ? String(response.status)
          : "request"
    )
  }

  revalidateModerationPages()
  redirectWithClaimStatus(nextPath, "claimed")
}

export async function commentModerationCaseAction(formData: FormData) {
  await assertTrustedActionOrigin()

  const token = await getSessionToken()
  const nextPath = readNextPath(formData, routes.moderationQueue)

  if (!token) {
    redirect(routes.login(nextPath))
  }

  const caseId = moderationCaseIdParamSchema.safeParse({
    caseId: formData.get("caseId"),
  })
  const comment = moderationCommentSchema.safeParse({
    note: normalizeString(formData.get("note")),
  })

  if (!caseId.success || !comment.success) {
    redirectWithCommentStatus(nextPath, "invalid_comment")
  }

  const response = await commentModerationListingCase(
    token,
    caseId.data.caseId,
    comment.data
  )

  if (!response.ok) {
    if (response.status === 401) {
      redirect(routes.login(nextPath))
    }

    redirectWithCommentStatus(
      nextPath,
      response.status ? String(response.status) : "request"
    )
  }

  revalidateModerationPages()
  redirectWithCommentStatus(nextPath, "added")
}

function normalizeString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed || undefined
}

function normalizeReasonCode(
  formData: FormData,
  action: ModerationDecisionAction
) {
  const reasonCode = normalizeString(formData.get("reasonCode"))

  if (!reasonCode || reasonCode === "auto") {
    return getDefaultReasonCode(action)
  }

  return reasonCode
}

function getDefaultReasonCode(action: ModerationDecisionAction) {
  if (action === "approve") {
    return "policy_ok"
  }

  if (action === "reject") {
    return "policy_violation"
  }

  return "risk_review"
}

function readCaseIds(formData: FormData) {
  const ids = new Set<string>()

  for (const value of formData.getAll("caseId")) {
    const parsed = moderationCaseIdParamSchema.safeParse({
      caseId: value,
    })

    if (parsed.success) {
      ids.add(parsed.data.caseId)
    }
  }

  return [...ids]
}

function readNextPath(formData: FormData, fallback: string) {
  const value = normalizeString(formData.get("nextPath"))

  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value
  }

  return fallback
}

function isModerationDecisionAction(
  value: string | undefined
): value is ModerationDecisionAction {
  return value !== undefined && moderationDecisionActions.has(value)
}

function requiresOtherReasonText(decision: {
  reasonCode?: string
  reasonText?: string
}) {
  return decision.reasonCode === "other" && !decision.reasonText
}

function revalidateModerationPages() {
  revalidatePath(routes.moderation)
  revalidatePath(routes.moderationQueue)
}

function revalidatePublicListingCaches(listingIds: string[]) {
  updateTag(cacheTags.publicListings)
  revalidatePath(routes.listings())

  for (const listingId of listingIds) {
    updateTag(cacheTags.publicListing(listingId))
    revalidatePath(routes.listing(listingId))
  }
}

function redirectWithDecisionStatus(path: string, error: string): never {
  const params = new URLSearchParams({
    decisionError: error,
  })

  redirect(withDecisionParams(path, params))
}

function redirectWithClaimStatus(path: string, status: string): never {
  const params = new URLSearchParams()

  if (status === "claimed") {
    params.set("claim", "claimed")
  } else {
    params.set("claimError", status)
  }

  redirect(withDecisionParams(path, params))
}

function redirectWithCommentStatus(path: string, status: string): never {
  const params = new URLSearchParams()

  if (status === "added") {
    params.set("comment", "added")
  } else {
    params.set("commentError", status)
  }

  redirect(withDecisionParams(path, params))
}

function withDecisionParams(path: string, params: URLSearchParams) {
  const url = new URL(path, "http://adottaungatto.local")

  for (const [key, value] of params) {
    url.searchParams.set(key, value)
  }

  return `${url.pathname}${url.search}`
}
