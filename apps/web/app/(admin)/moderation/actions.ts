"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  moderationCaseIdParamSchema,
  moderationDecisionSchema,
} from "@workspace/validation/moderation"

import {
  decideModerationListingCase,
  type ModerationDecisionAction,
} from "@/lib/api/moderation"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"

const moderationDecisionActions = new Set<string>([
  "approve",
  "reject",
  "suspend",
])

export async function decideModerationCaseAction(formData: FormData) {
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

  revalidatePath(routes.moderation)
  revalidatePath(routes.moderationQueue)
  redirect(`${routes.moderation}?decision=${action}`)
}

export async function decideModerationBatchAction(formData: FormData) {
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
      continue
    }

    if (response.status === 401) {
      redirect(routes.login(nextPath))
    }
  }

  revalidatePath(routes.moderation)
  revalidatePath(routes.moderationQueue)

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

function redirectWithDecisionStatus(path: string, error: string): never {
  const params = new URLSearchParams({
    decisionError: error,
  })

  redirect(withDecisionParams(path, params))
}

function withDecisionParams(path: string, params: URLSearchParams) {
  const url = new URL(path, "http://adottaungatto.local")

  for (const [key, value] of params) {
    url.searchParams.set(key, value)
  }

  return `${url.pathname}${url.search}`
}
