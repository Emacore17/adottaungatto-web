"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { favoriteListingIdParamSchema } from "@workspace/validation/favorites"
import {
  listingDraftCreateSchema,
  listingDraftIdParamSchema,
  listingDraftUpdateSchema,
  listingImageIdParamSchema,
  listingImageOrderSchema,
  listingImageUploadRequestSchema,
  listingPhoneVerificationConfirmSchema,
} from "@workspace/validation/listings"
import { notificationIdParamSchema } from "@workspace/validation/notifications"
import { authChangePasswordSchema } from "@workspace/validation/auth"
import {
  userAccountPasswordConfirmationSchema,
  userPhoneVerificationConfirmSchema,
} from "@workspace/validation/users"

import {
  confirmAccountDraftImageUpload,
  confirmAccountDraftPhoneVerification,
  createAccountDraft,
  createAccountDraftImageUpload,
  deleteAccountDraft,
  deleteAccountDraftImage,
  deleteAccountNotification,
  markAccountNotificationRead,
  markAllAccountNotificationsRead,
  removeAccountFavorite,
  reorderAccountDraftImages,
  requestAccountDraftPhoneVerification,
  setAccountDraftCoverImage,
  submitAccountDraftForReview,
  updateAccountDraft,
} from "@/lib/api/account"
import {
  updateCurrentUserNotificationPreferences,
  updateCurrentUserProfile,
  confirmCurrentUserPhoneVerification,
  deactivateCurrentUserAccount,
  deleteCurrentUserAccount,
  requestCurrentUserPhoneVerification,
} from "@/lib/api/users"
import { changePassword } from "@/lib/api/auth"
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/cookies"
import { getSessionToken } from "@/lib/auth/session"
import { normalizePhoneE164, phoneE164Pattern } from "@/lib/phone"
import { routes } from "@/lib/routes"
import { assertTrustedActionOrigin } from "@/lib/security/server-action-origin"

export async function updateProfileAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountSettings)
  const token = await requireActionToken(nextPath)
  const parsed = readAccountProfileFormPayload(formData)

  if (!parsed.ok) {
    redirectWithStatus(nextPath, "settings", "invalid-profile")
  }

  const result = await updateCurrentUserProfile(token, parsed.data)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "settings", "profile-api")
  }

  revalidateAccountPaths()
  redirectWithStatus(nextPath, "settings", "profile-saved")
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountSettings)
  const token = await requireActionToken(nextPath)
  const input = {
    listingModerationDecisionEmail: readAnyBooleanFormValue(
      formData,
      "listingModerationDecisionEmail"
    ),
    listingReportDecisionEmail: readAnyBooleanFormValue(
      formData,
      "listingReportDecisionEmail"
    ),
  }

  const result = await updateCurrentUserNotificationPreferences(token, input)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "settings", "notifications-api")
  }

  revalidateAccountPaths()
  redirectWithStatus(nextPath, "settings", "notifications-saved")
}

export async function changePasswordAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountSettings)
  const token = await requireActionToken(nextPath)
  const password = readFormString(formData, "password")
  const passwordConfirm = readFormString(formData, "passwordConfirm")

  if (password !== passwordConfirm) {
    redirectWithStatus(nextPath, "settings", "password-mismatch")
  }

  const parsed = authChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password,
  })

  if (!parsed.success) {
    redirectWithStatus(nextPath, "settings", "invalid-password")
  }

  const result = await changePassword(token, parsed.data)

  if (!result.ok) {
    redirectWithStatus(
      nextPath,
      "settings",
      result.status === 401 ? "password-current" : "password-api"
    )
  }

  await setSessionCookie(result.data.session)
  revalidateAccountPaths()
  redirectWithStatus(nextPath, "settings", "password-saved")
}

export async function requestPhoneVerificationAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountSettings)
  const token = await requireActionToken(nextPath)
  const result = await requestCurrentUserPhoneVerification(token)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "settings", "phone-code-api")
  }

  const status = result.data.alreadyVerified
    ? "phone-already-verified"
    : "phone-code-sent"
  const devCode =
    result.data.devCode && result.data.devCode.length > 0
      ? result.data.devCode
      : null

  revalidateAccountPaths()
  redirectWithStatus(nextPath, "settings", status, {
    phoneCode: devCode,
  })
}

export async function confirmPhoneVerificationAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountSettings)
  const token = await requireActionToken(nextPath)
  const parsed = userPhoneVerificationConfirmSchema.safeParse({
    code: formData.get("code"),
  })

  if (!parsed.success) {
    redirectWithStatus(nextPath, "settings", "phone-code-invalid")
  }

  const result = await confirmCurrentUserPhoneVerification(token, parsed.data)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "settings", "phone-code-invalid")
  }

  revalidateAccountPaths()
  redirectWithStatus(nextPath, "settings", "phone-verified")
}

export async function deactivateAccountAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountSettings)
  const token = await requireActionToken(nextPath)
  const parsed = userAccountPasswordConfirmationSchema.safeParse({
    password: formData.get("password"),
  })

  if (!parsed.success) {
    redirectWithStatus(nextPath, "settings", "account-password-invalid")
  }

  const result = await deactivateCurrentUserAccount(token, parsed.data)

  if (!result.ok && result.status === 401) {
    redirectWithStatus(nextPath, "settings", "account-password-invalid")
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "settings", "account-api")
  }

  await clearSessionCookie()
  revalidateAccountPaths()
  redirect(`${routes.login()}?account=deactivated`)
}

export async function deleteAccountAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountSettings)
  const token = await requireActionToken(nextPath)
  const confirmation = readFormString(formData, "confirmation").trim()
  const parsed = userAccountPasswordConfirmationSchema.safeParse({
    password: formData.get("password"),
  })

  if (!parsed.success) {
    redirectWithStatus(nextPath, "settings", "account-password-invalid")
  }

  if (confirmation !== "ELIMINA") {
    redirectWithStatus(nextPath, "settings", "account-confirm-invalid")
  }

  const result = await deleteCurrentUserAccount(token, parsed.data)

  if (!result.ok && result.status === 401) {
    redirectWithStatus(nextPath, "settings", "account-password-invalid")
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "settings", "account-api")
  }

  await clearSessionCookie()
  revalidateAccountPaths()
  redirect(`${routes.login()}?account=deleted`)
}

export async function removeFavoriteAction(formData: FormData) {
  const nextPath = readNextPath(formData)
  const token = await requireActionToken(nextPath)
  const parsed = favoriteListingIdParamSchema.safeParse({
    listingId: readFormString(formData, "listingId"),
  })

  if (!parsed.success) {
    redirect(nextPath)
  }

  const result = await removeAccountFavorite(token, parsed.data.listingId)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  revalidateAccountPaths()
  redirect(nextPath)
}

export async function markNotificationReadAction(formData: FormData) {
  const nextPath = readNextPath(formData)
  const token = await requireActionToken(nextPath)
  const parsed = notificationIdParamSchema.safeParse({
    notificationId: readFormString(formData, "notificationId"),
  })

  if (!parsed.success) {
    redirect(nextPath)
  }

  const result = await markAccountNotificationRead(
    token,
    parsed.data.notificationId
  )

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  revalidateAccountPaths()
  redirect(nextPath)
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const nextPath = readNextPath(formData)
  const token = await requireActionToken(nextPath)
  const result = await markAllAccountNotificationsRead(token)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  revalidateAccountPaths()
  redirect(nextPath)
}

export async function deleteNotificationAction(formData: FormData) {
  const nextPath = readNextPath(formData)
  const token = await requireActionToken(nextPath)
  const parsed = notificationIdParamSchema.safeParse({
    notificationId: readFormString(formData, "notificationId"),
  })

  if (!parsed.success) {
    redirect(nextPath)
  }

  const result = await deleteAccountNotification(
    token,
    parsed.data.notificationId
  )

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  revalidateAccountPaths()
  redirect(nextPath)
}

export async function deleteDraftAction(formData: FormData) {
  const nextPath = readNextPath(formData)
  const token = await requireActionToken(nextPath)
  const parsed = listingDraftIdParamSchema.safeParse({
    id: readFormString(formData, "draftId"),
  })

  if (!parsed.success) {
    redirect(nextPath)
  }

  const result = await deleteAccountDraft(token, parsed.data.id)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  revalidateAccountPaths()
  redirect(nextPath)
}

export async function createDraftAction(formData: FormData) {
  const nextPath = readNextPath(formData, routes.accountDraftNew)
  const token = await requireActionToken(nextPath)
  const parsed = listingDraftCreateSchema.safeParse(
    readDraftFormPayload(formData)
  )
  const initialImages = readFormFiles(formData, "images")
  const initialCoverIndex = readFormInteger(formData, "initialCoverIndex")

  if (!parsed.success) {
    redirectWithStatus(nextPath, "error", "invalid")
  }

  if (initialImages.length > 10) {
    redirectWithStatus(nextPath, "error", "invalid-image")
  }

  const result = await createAccountDraft(token, parsed.data)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (
    !result.ok &&
    result.status === 409 &&
    result.reason === "listing_account_limit_reached"
  ) {
    redirectWithStatus(nextPath, "error", "listing-limit")
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "api")
  }

  await maybeSaveListingPhoneToAccount(token, formData, parsed.data)

  const draftPath = routes.accountDraft(result.data.id)

  for (const [index, file] of initialImages.entries()) {
    const upload = await uploadDraftImageFile(
      token,
      result.data.id,
      file,
      index === initialCoverIndex
    )

    if (!upload.ok) {
      if (upload.status === 401) {
        redirect(routes.login(draftPath))
      }

      revalidateAccountPaths(result.data.id)
      redirectWithStatus(draftPath, "error", upload.error)
    }
  }

  revalidateAccountPaths(result.data.id)
  redirectWithStatus(
    draftPath,
    "created",
    initialImages.length > 0 ? "with-images" : "1"
  )
}

export async function updateDraftAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })
  const draftPayload = listingDraftUpdateSchema.safeParse(
    readDraftFormPayload(formData)
  )

  if (!id.success || !draftPayload.success) {
    redirectWithStatus(nextPath, "error", "invalid")
  }

  const result = await updateAccountDraft(token, id.data.id, draftPayload.data)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "api")
  }

  await maybeSaveListingPhoneToAccount(token, formData, draftPayload.data)

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "saved", "1")
}

export async function requestDraftPhoneVerificationAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })

  if (!id.success) {
    redirectWithStatus(nextPath, "error", "invalid")
  }

  const result = await requestAccountDraftPhoneVerification(token, id.data.id)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "phone-code-api")
  }

  const status = result.data.alreadyVerified
    ? "phone-already-verified"
    : "phone-code-sent"
  const devCode =
    result.data.devCode && result.data.devCode.length > 0
      ? result.data.devCode
      : null

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "phone", status, {
    phoneCode: devCode,
  })
}

export async function confirmDraftPhoneVerificationAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })
  const code = listingPhoneVerificationConfirmSchema.safeParse({
    code: formData.get("code"),
  })

  if (!id.success || !code.success) {
    redirectWithStatus(nextPath, "error", "phone-code-invalid")
  }

  const result = await confirmAccountDraftPhoneVerification(
    token,
    id.data.id,
    code.data
  )

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "phone-code-invalid")
  }

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "phone", "phone-verified")
}

export async function submitDraftForReviewAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })

  if (!id.success) {
    redirectWithStatus(nextPath, "error", "invalid")
  }

  const result = await submitAccountDraftForReview(token, id.data.id)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(
      nextPath,
      "error",
      result.status === 400 ? "not-ready" : "api"
    )
  }

  revalidateAccountPaths(id.data.id)
  redirect(`${routes.accountListingSubmitted}?draftId=${id.data.id}`)
}

export async function uploadDraftImageAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })
  const file = readFormFile(formData, "image")

  if (!id.success || !file) {
    redirectWithStatus(nextPath, "error", "invalid-image")
  }

  const upload = await uploadDraftImageFile(
    token,
    id.data.id,
    file,
    readBooleanFormValue(formData, "isCover")
  )

  if (!upload.ok && upload.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!upload.ok) {
    redirectWithStatus(nextPath, "error", upload.error)
  }

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "uploaded", "1")
}

type DraftImageUploadError =
  | "image-api"
  | "image-confirm"
  | "image-storage"
  | "invalid-image"

async function uploadDraftImageFile(
  token: string,
  draftId: string,
  file: File,
  isCover: boolean
): Promise<
  | {
      ok: true
    }
  | {
      error: DraftImageUploadError
      ok: false
      status?: number | null
    }
> {
  const input = listingImageUploadRequestSchema.safeParse({
    mimeType: file.type,
    sizeBytes: file.size,
    isCover,
  })

  if (!input.success) {
    return { error: "invalid-image", ok: false }
  }

  const upload = await createAccountDraftImageUpload(token, draftId, input.data)

  if (!upload.ok) {
    return { error: "image-api", ok: false, status: upload.status }
  }

  const storageResponse = await fetch(upload.data.upload.url, {
    body: file,
    headers: upload.data.upload.headers,
    method: upload.data.upload.method,
  })

  if (!storageResponse.ok) {
    return { error: "image-storage", ok: false }
  }

  const confirmation = await confirmAccountDraftImageUpload(
    token,
    draftId,
    upload.data.image.id
  )

  if (!confirmation.ok) {
    return { error: "image-confirm", ok: false, status: confirmation.status }
  }

  return { ok: true }
}

export async function deleteDraftImageAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })
  const image = listingImageIdParamSchema.safeParse({
    imageId: readFormString(formData, "imageId"),
  })

  if (!id.success || !image.success) {
    redirectWithStatus(nextPath, "error", "invalid-image")
  }

  const result = await deleteAccountDraftImage(
    token,
    id.data.id,
    image.data.imageId
  )

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "image-delete")
  }

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "uploaded", "deleted")
}

export async function setDraftImageCoverAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })
  const image = listingImageIdParamSchema.safeParse({
    imageId: readFormString(formData, "imageId"),
  })

  if (!id.success || !image.success) {
    redirectWithStatus(nextPath, "error", "invalid-image")
  }

  const result = await setAccountDraftCoverImage(
    token,
    id.data.id,
    image.data.imageId
  )

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "image-cover")
  }

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "uploaded", "cover")
}

export async function moveDraftImageAction(formData: FormData) {
  const draftId = readFormString(formData, "draftId")
  const nextPath = readNextPath(formData, routes.accountDraft(draftId))
  const token = await requireActionToken(nextPath)
  const id = listingDraftIdParamSchema.safeParse({ id: draftId })
  const image = listingImageIdParamSchema.safeParse({
    imageId: readFormString(formData, "imageId"),
  })
  const direction = readFormString(formData, "direction")
  const imageIds = readFormStrings(formData, "imageIds")
  const nextImageIds =
    direction === "up" || direction === "down"
      ? moveImageId(
          imageIds,
          image.success ? image.data.imageId : "",
          direction
        )
      : imageIds
  const order = listingImageOrderSchema.safeParse({
    imageIds: nextImageIds,
  })

  if (!id.success || !image.success || !order.success) {
    redirectWithStatus(nextPath, "error", "invalid-image")
  }

  const result = await reorderAccountDraftImages(token, id.data.id, order.data)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "image-order")
  }

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "uploaded", "order")
}

async function requireActionToken(nextPath: string) {
  await assertTrustedActionOrigin()

  const token = await getSessionToken()

  if (!token) {
    redirect(routes.login(nextPath))
  }

  return token
}

function revalidateAccountPaths(draftId?: string) {
  revalidatePath(routes.account)
  revalidatePath(routes.accountDrafts)
  revalidatePath(routes.accountFavorites)
  revalidatePath(routes.accountNotifications)
  revalidatePath(routes.accountSettings)
  revalidatePath(routes.accountSecurity)
  revalidatePath(routes.accountDanger)

  if (draftId) {
    revalidatePath(routes.accountDraft(draftId))
  }
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === "string" ? value : ""
}

function readFormStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
}

function readNextPath(formData: FormData, fallback = routes.account) {
  const value = readFormString(formData, "nextPath")

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value
  }

  return fallback
}

function readDraftFormPayload(formData: FormData) {
  const isFree = readBooleanFormValue(formData, "isFree")
  const contactPhoneMode = readFormString(formData, "contactPhoneMode")
  const contactPhoneE164 =
    contactPhoneMode === "listing"
      ? normalizePhoneE164(
          readFormString(formData, "listingPhoneCountryCode"),
          readFormString(formData, "listingPhoneNationalNumber")
        )
      : null

  return {
    title: readFormString(formData, "title"),
    description: readFormString(formData, "description"),
    breedId: readNullableFormString(formData, "breedId"),
    sex: readFormString(formData, "sex"),
    ageMonths: readAgeMonthsFormValue(formData),
    municipalityId: readNullableFormString(formData, "municipalityId"),
    contributionCents: isFree
      ? null
      : readNullableEuroCents(formData, "contributionEuro"),
    isFree,
    isVaccinated: readNullableFormBoolean(formData, "isVaccinated"),
    isSterilized: readNullableFormBoolean(formData, "isSterilized"),
    isDewormed: readNullableFormBoolean(formData, "isDewormed"),
    hasMicrochip: readNullableFormBoolean(formData, "hasMicrochip"),
    contactRequestsEnabled: readBooleanFormValue(
      formData,
      "contactRequestsEnabled"
    ),
    contactPhoneMode,
    contactPhoneE164,
  }
}

async function maybeSaveListingPhoneToAccount(
  token: string,
  formData: FormData,
  draftPayload: {
    contactPhoneE164?: string | null
    contactPhoneMode?: string | null
  }
) {
  if (
    !readBooleanFormValue(formData, "saveListingPhoneToAccount") ||
    draftPayload.contactPhoneMode !== "listing" ||
    !draftPayload.contactPhoneE164
  ) {
    return
  }

  const result = await updateCurrentUserProfile(token, {
    phoneE164: draftPayload.contactPhoneE164,
  })

  if (!result.ok && result.status === 401) {
    redirect(routes.login(readNextPath(formData)))
  }

  if (!result.ok) {
    redirectWithStatus(readNextPath(formData), "error", "api")
  }
}

function readAgeMonthsFormValue(formData: FormData) {
  const value = readNullableFormNumber(formData, "ageValue")

  if (value === null) {
    return null
  }

  const unit = readFormString(formData, "ageUnit")
  const multiplier = unit === "years" ? 12 : 1

  return value * multiplier
}

function readAccountProfileFormPayload(formData: FormData):
  | {
      ok: true
      data: {
        displayName: string
        phoneE164: string | null
        showPhoneOnListings: boolean
      }
    }
  | {
      ok: false
    } {
  const displayName = readFormString(formData, "displayName").trim()
  const phoneE164 = readPhoneE164FormValue(formData)

  if (displayName.length < 2 || displayName.length > 80) {
    return { ok: false }
  }

  if (phoneE164 && !phoneE164Pattern.test(phoneE164)) {
    return { ok: false }
  }

  return {
    data: {
      displayName,
      phoneE164,
      showPhoneOnListings: readBooleanFormValue(
        formData,
        "showPhoneOnListings"
      ),
    },
    ok: true,
  }
}

function readPhoneE164FormValue(formData: FormData) {
  if (readFormString(formData, "phoneIntent") === "remove") {
    return null
  }

  const directPhoneE164 = readNullableFormString(formData, "phoneE164")

  if (directPhoneE164) {
    return directPhoneE164.replace(/[\s().-]/g, "")
  }

  return normalizePhoneE164(
    readFormString(formData, "phoneCountryCode"),
    readFormString(formData, "phoneNationalNumber")
  )
}

function readNullableFormString(formData: FormData, key: string) {
  const value = readFormString(formData, key).trim()

  return value ? value : null
}

function readNullableFormNumber(formData: FormData, key: string) {
  const value = readFormString(formData, key).trim()

  return value ? Number(value) : null
}

function readNullableEuroCents(formData: FormData, key: string) {
  const value = readFormString(formData, key).trim()

  return value ? Math.round(Number(value) * 100) : null
}

function readBooleanFormValue(formData: FormData, key: string) {
  const value = readFormString(formData, key)

  return value === "true" || value === "on"
}

function readAnyBooleanFormValue(formData: FormData, key: string) {
  const values = readFormStrings(formData, key)

  return values.some((value) => value === "true" || value === "on")
}

function readNullableFormBoolean(formData: FormData, key: string) {
  const value = readFormString(formData, key)

  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return null
}

function readFormFile(formData: FormData, key: string) {
  const value = formData.get(key)

  if (!(value instanceof File) || value.size <= 0) {
    return null
  }

  return value
}

function readFormFiles(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0)
}

function readFormInteger(formData: FormData, key: string) {
  const value = Number(readFormString(formData, key))

  return Number.isInteger(value) && value >= 0 ? value : 0
}

function moveImageId(
  imageIds: string[],
  imageId: string,
  direction: "up" | "down"
) {
  const nextImageIds = [...imageIds]
  const currentIndex = nextImageIds.indexOf(imageId)

  if (currentIndex < 0) {
    return nextImageIds
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

  if (targetIndex < 0 || targetIndex >= nextImageIds.length) {
    return nextImageIds
  }

  const [current] = nextImageIds.splice(currentIndex, 1)
  if (!current) {
    return nextImageIds
  }

  nextImageIds.splice(targetIndex, 0, current)

  return nextImageIds
}

function redirectWithStatus(
  path: string,
  key:
    | "created"
    | "error"
    | "phone"
    | "saved"
    | "settings"
    | "submitted"
    | "uploaded",
  value: string,
  extraParams: Record<string, string | null | undefined> = {}
): never {
  const params = new URLSearchParams({
    [key]: value,
  })

  for (const [extraKey, extraValue] of Object.entries(extraParams)) {
    if (extraValue) {
      params.set(extraKey, extraValue)
    }
  }

  const separator = path.includes("?") ? "&" : "?"

  redirect(`${path}${separator}${params.toString()}`)
}
