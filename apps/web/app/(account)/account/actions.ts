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
} from "@workspace/validation/listings"
import { notificationIdParamSchema } from "@workspace/validation/notifications"

import {
  confirmAccountDraftImageUpload,
  createAccountDraft,
  createAccountDraftImageUpload,
  deleteAccountDraft,
  deleteAccountDraftImage,
  markAccountNotificationRead,
  markAllAccountNotificationsRead,
  removeAccountFavorite,
  reorderAccountDraftImages,
  setAccountDraftCoverImage,
  submitAccountDraftForReview,
  updateAccountDraft,
} from "@/lib/api/account"
import { getSessionToken } from "@/lib/auth/session"
import { routes } from "@/lib/routes"

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

  if (!parsed.success) {
    redirectWithStatus(nextPath, "error", "invalid")
  }

  const result = await createAccountDraft(token, parsed.data)

  if (!result.ok && result.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!result.ok) {
    redirectWithStatus(nextPath, "error", "api")
  }

  revalidateAccountPaths(result.data.id)
  redirectWithStatus(routes.accountDraft(result.data.id), "created", "1")
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

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "saved", "1")
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
  redirect(routes.accountListingSubmitted)
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

  const input = listingImageUploadRequestSchema.safeParse({
    mimeType: file.type,
    sizeBytes: file.size,
    isCover: readBooleanFormValue(formData, "isCover"),
  })

  if (!input.success) {
    redirectWithStatus(nextPath, "error", "invalid-image")
  }

  const upload = await createAccountDraftImageUpload(
    token,
    id.data.id,
    input.data
  )

  if (!upload.ok && upload.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!upload.ok) {
    redirectWithStatus(nextPath, "error", "image-api")
  }

  const storageResponse = await fetch(upload.data.upload.url, {
    body: file,
    headers: upload.data.upload.headers,
    method: upload.data.upload.method,
  })

  if (!storageResponse.ok) {
    redirectWithStatus(nextPath, "error", "image-storage")
  }

  const confirmation = await confirmAccountDraftImageUpload(
    token,
    id.data.id,
    upload.data.image.id
  )

  if (!confirmation.ok && confirmation.status === 401) {
    redirect(routes.login(nextPath))
  }

  if (!confirmation.ok) {
    redirectWithStatus(nextPath, "error", "image-confirm")
  }

  revalidateAccountPaths(id.data.id)
  redirectWithStatus(nextPath, "uploaded", "1")
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
      ? moveImageId(imageIds, image.success ? image.data.imageId : "", direction)
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

  return {
    title: readFormString(formData, "title"),
    description: readFormString(formData, "description"),
    breedId: readNullableFormString(formData, "breedId"),
    sex: readFormString(formData, "sex"),
    ageMonthsMin: readNullableFormNumber(formData, "ageMonthsMin"),
    ageMonthsMax: readNullableFormNumber(formData, "ageMonthsMax"),
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
  }
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
  key: "created" | "error" | "saved" | "submitted" | "uploaded",
  value: string
): never {
  const separator = path.includes("?") ? "&" : "?"

  redirect(`${path}${separator}${key}=${encodeURIComponent(value)}`)
}
