"use server"

import { redirect } from "next/navigation"
import {
  listingContactCreateSchema,
  listingContactListingIdParamSchema,
} from "@workspace/validation/contacts"

import { createListingContactRequest } from "@/lib/api/contacts"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

type ContactResult = "error" | "invalid" | "sent" | "unavailable"

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

function createContactResultPath(listingId: string, result: ContactResult) {
  return `${routes.listing(listingId)}?contact=${result}#contact-owner`
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value : ""
}
