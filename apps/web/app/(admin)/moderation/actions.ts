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

  if (!caseId.success || !decision.success) {
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
  redirect(`${routes.moderation}?decision=${action}`)
}

function normalizeString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed || undefined
}

function isModerationDecisionAction(
  value: string | undefined
): value is ModerationDecisionAction {
  return value !== undefined && moderationDecisionActions.has(value)
}
