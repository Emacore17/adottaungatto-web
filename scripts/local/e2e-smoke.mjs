const apiBaseUrl = readUrl(process.env.API_URL, "http://localhost:4000")
const webBaseUrl = readUrl(process.env.WEB_URL, "http://localhost:3000")
const mailpitBaseUrl = readUrl(process.env.MAILPIT_URL, "http://localhost:8025")
const storagePublicUrl = readUrl(
  process.env.NEXT_PUBLIC_S3_PUBLIC_ENDPOINT ?? process.env.S3_PUBLIC_ENDPOINT,
  "http://localhost:9000"
)
const storageBucket =
  process.env.NEXT_PUBLIC_S3_BUCKET ??
  process.env.S3_BUCKET ??
  "adottaungatto-local"

const password = "Password!12345"
const email = `e2e.${Date.now()}@demo.adottaungatto.local`

let token = null
let draftId = null
let deleteDraftId = null
let listingId = null
let submittedListingId = null

try {
  const health = await api("GET", "/health")
  check("api health", health.status === "ok")

  const listings = await api("GET", "/listings?page=1&pageSize=1")
  check(
    "public listing list",
    Array.isArray(listings.items) && listings.items.length > 0
  )
  check(
    "public sponsored listing",
    listings.items[0]?.sponsorship?.isSponsored === true,
    `listing=${listings.items[0]?.id ?? "none"}`
  )
  listingId = listings.items[0].id
  const coverObjectKey =
    listings.items[0]?.images?.cover?.objectKeyLarge ??
    listings.items[0]?.images?.cover?.objectKeyThumb

  check(
    "public listing cover image",
    typeof coverObjectKey === "string" && coverObjectKey.length > 0
  )

  const coverStorage = await fetch(
    `${storagePublicUrl}/${storageBucket}/${coverObjectKey}`
  )
  check(
    "public listing storage image",
    coverStorage.ok,
    `status=${coverStorage.status}`
  )
  pass("public listing selected", `listing=${listingId}`)

  const listing = await api("GET", `/listings/${listingId}`)
  check("public listing detail", listing.id === listingId)
  await webListingImages()

  const registration = await api("POST", "/auth/register", {
    displayName: "Smoke E2E",
    email,
    password,
    profileType: "private",
  })
  token = registration.session.token
  check("register", typeof token === "string" && token.length > 0)

  const session = await api("GET", "/auth/me", undefined, token)
  check("auth me", session.user.email === email)

  const municipality = await resolveSmokeMunicipality()
  pass("place autocomplete", `municipality=${municipality.label}`)

  const draft = await api(
    "POST",
    "/listings/me/drafts",
    {
      contactRequestsEnabled: true,
      description:
        "Annuncio completo creato dallo smoke test end to end con immagine.",
      isFree: true,
      municipalityId: municipality.id,
      sex: "unknown",
      title: `Smoke draft ${Date.now()}`,
    },
    token
  )
  draftId = draft.id
  check("draft create", typeof draftId === "string" && draftId.length > 0)

  const draftList = await api(
    "GET",
    "/listings/me/drafts?page=1&pageSize=5",
    undefined,
    token
  )
  check(
    "draft list",
    draftList.items.some((item) => item.id === draftId)
  )

  const updatedDraft = await api(
    "PATCH",
    `/listings/me/drafts/${draftId}`,
    { title: `Smoke draft aggiornato ${Date.now()}` },
    token
  )
  check("draft update", updatedDraft.title.startsWith("Smoke draft aggiornato"))

  const imageBuffer = createSmokeImageBuffer()
  const upload = await api(
    "POST",
    `/listings/me/drafts/${draftId}/images/upload-url`,
    {
      isCover: true,
      mimeType: "image/png",
      sizeBytes: imageBuffer.byteLength,
    },
    token
  )
  check(
    "draft image upload url",
    upload.upload?.method === "PUT" && typeof upload.image?.id === "string"
  )

  const storageUpload = await fetch(upload.upload.url, {
    body: imageBuffer,
    headers: upload.upload.headers,
    method: upload.upload.method,
  })
  check(
    "draft image storage upload",
    storageUpload.ok,
    `status=${storageUpload.status}`
  )

  const confirmation = await api(
    "POST",
    `/listings/me/drafts/${draftId}/images/${upload.image.id}/confirm`,
    undefined,
    token
  )
  check(
    "draft image confirm",
    confirmation.confirmed === true &&
      confirmation.image.status === "processing"
  )

  const readyImages = await waitForDraftImagesReady(draftId, token)
  check(
    "draft image processing",
    readyImages.meta.readyCount >= 1 && readyImages.meta.pendingCount === 0
  )

  const favorite = await api(
    "POST",
    `/favorites/listings/${listingId}`,
    {},
    token
  )
  check("favorite add", favorite.favorited === true)
  const favoriteListHtml = await webText(
    "/listings",
    token,
    "web listing favorite saved"
  )
  check(
    "web listing favorite saved state",
    hasFavoriteToggleState(favoriteListHtml, listingId, "saved")
  )
  const favoriteDetailHtml = await webText(
    `/listings/${listingId}`,
    token,
    "web listing detail favorite saved"
  )
  check(
    "web listing detail favorite saved state",
    hasFavoriteToggleState(favoriteDetailHtml, listingId, "saved")
  )

  const favorites = await api(
    "GET",
    "/favorites/listings?page=1&pageSize=10",
    undefined,
    token
  )
  check(
    "favorite list",
    favorites.items.some((item) => item.listing.id === listingId)
  )

  const removedFavorite = await api(
    "DELETE",
    `/favorites/listings/${listingId}`,
    undefined,
    token
  )
  check("favorite delete", removedFavorite.deleted === true)
  const favoriteRemovedHtml = await webText(
    "/listings",
    token,
    "web listing favorite removed"
  )
  check(
    "web listing favorite removed state",
    hasFavoriteToggleState(favoriteRemovedHtml, listingId, "idle")
  )
  const favoriteDetailRemovedHtml = await webText(
    `/listings/${listingId}`,
    token,
    "web listing detail favorite removed"
  )
  check(
    "web listing detail favorite removed state",
    hasFavoriteToggleState(favoriteDetailRemovedHtml, listingId, "idle")
  )

  const like = await api("POST", `/likes/listings/${listingId}`, {}, token)
  check("like add", like.liked === true)

  const likeCount = await api("GET", `/likes/listings/${listingId}`)
  check("like count", likeCount.likeCount >= 1)

  const removedLike = await api(
    "DELETE",
    `/likes/listings/${listingId}`,
    undefined,
    token
  )
  check("like delete", removedLike.liked === false)

  const contact = await api(
    "POST",
    `/contacts/listings/${listingId}`,
    {
      message:
        "Ciao, vorrei ricevere informazioni per uno smoke test end to end.",
      shareEmail: true,
    },
    token
  )
  check(
    "contact owner",
    contact.sent === true && contact.request?.status === "sent"
  )

  const mailpit = await rawJson(`${mailpitBaseUrl}/api/v1/messages`)
  check("mailpit reachable", mailpit !== null)

  const notifications = await api(
    "GET",
    "/notifications?page=1&pageSize=10",
    undefined,
    token
  )
  check("notifications list", Number.isInteger(notifications.meta.unreadCount))

  const readAll = await api("POST", "/notifications/read-all", {}, token)
  check("notifications read all", readAll.updatedCount >= 0)

  const adminLogin = await api("POST", "/auth/login", {
    email: "admin@demo.adottaungatto.local",
    password: "demo-password-123",
  })
  const adminToken = adminLogin.session.token
  check(
    "demo admin login",
    adminLogin.user.email === "admin@demo.adottaungatto.local" &&
      typeof adminToken === "string"
  )

  const pendingReview = await api(
    "GET",
    "/moderation/listings/pending-review?page=1&pageSize=10",
    undefined,
    adminToken
  )
  check(
    "demo moderation pending queue",
    Array.isArray(pendingReview.items) && pendingReview.items.length >= 2
  )

  await webPage("/account", token, "web account authenticated")
  await webPage("/account/favorites", token, "web account favorites")
  await webPage("/account/notifications", token, "web account notifications")
  await webPage("/account/listings/drafts", token, "web account drafts")
  await webPage("/account/listings/drafts/new", token, "web account draft new")
  await webPage(
    `/account/listings/drafts/${draftId}`,
    token,
    "web account draft edit"
  )
  await webPage("/moderation", adminToken, "web moderation admin")

  const submittedDraft = await api(
    "POST",
    `/listings/me/drafts/${draftId}/submit-review`,
    undefined,
    token
  )
  check(
    "draft submit review",
    submittedDraft.submitted === true &&
      submittedDraft.listing.moderationStatus === "pending_review"
  )
  submittedListingId = submittedDraft.listing.id
  draftId = null

  const submittedCase = await findPendingReviewCase(
    submittedListingId,
    adminToken
  )
  pass("demo moderation submitted case", `case=${submittedCase.case.id}`)

  const approval = await api(
    "POST",
    `/moderation/listings/cases/${submittedCase.case.id}/approve`,
    {
      reasonCode: "policy_ok",
    },
    adminToken
  )
  check(
    "demo moderation approve",
    approval.decided === true &&
      approval.listing.id === submittedListingId &&
      approval.listing.moderationStatus === "approved" &&
      approval.listing.lifecycleStatus === "published"
  )

  const publishedListing = await api("GET", `/listings/${submittedListingId}`)
  check(
    "demo moderation published detail",
    publishedListing.id === submittedListingId
  )

  const ownerNotifications = await api(
    "GET",
    "/notifications?page=1&pageSize=10",
    undefined,
    token
  )
  check(
    "demo moderation owner notification",
    ownerNotifications.items.some(
      (item) =>
        item.type === "listing_moderation_decision" &&
        item.payload?.listingId === submittedListingId &&
        item.payload?.decision === "approved"
    )
  )

  await webPage(
    "/account/listings/submitted",
    token,
    "web account listing submitted"
  )

  const deleteDraft = await api(
    "POST",
    "/listings/me/drafts",
    {
      description: "Draft temporaneo creato per verificare la cancellazione.",
      isFree: true,
      sex: "unknown",
      title: `Smoke delete ${Date.now()}`,
    },
    token
  )
  deleteDraftId = deleteDraft.id
  check(
    "draft delete create",
    typeof deleteDraftId === "string" && deleteDraftId.length > 0
  )

  const deletedDraft = await api(
    "DELETE",
    `/listings/me/drafts/${deleteDraftId}`,
    undefined,
    token
  )
  deleteDraftId = null
  check("draft delete", deletedDraft.deleted === true)

  console.log(`E2E_SMOKE_OK email=${email} listing=${listingId}`)
} finally {
  if (token && draftId) {
    try {
      await api("DELETE", `/listings/me/drafts/${draftId}`, undefined, token)
      pass("cleanup draft", `draft=${draftId}`)
    } catch (error) {
      console.error(`WARN cleanup draft failed: ${error.message}`)
    }
  }
  if (token && deleteDraftId) {
    try {
      await api(
        "DELETE",
        `/listings/me/drafts/${deleteDraftId}`,
        undefined,
        token
      )
      pass("cleanup delete draft", `draft=${deleteDraftId}`)
    } catch (error) {
      console.error(`WARN cleanup delete draft failed: ${error.message}`)
    }
  }
}

async function api(method, path, body, bearerToken) {
  const headers = {
    Accept: "application/json",
  }

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  return rawJson(`${apiBaseUrl}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
    method,
  })
}

async function rawJson(url, init) {
  const text = await rawText(url, init)

  return text ? JSON.parse(text) : null
}

async function rawText(url, init) {
  const response = await fetch(url, init)
  const text = await response.text()

  if (!response.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${url} failed: ${response.status} ${text}`
    )
  }

  return text
}

async function webPage(path, sessionToken, label) {
  await webText(path, sessionToken, label)
}

async function webText(path, sessionToken, label) {
  const response = await fetch(`${webBaseUrl}${path}`, {
    headers: {
      Cookie: `aug_session=${sessionToken}`,
    },
    redirect: "manual",
  })

  check(label, response.status === 200, `status=${response.status}`)

  return response.text()
}

async function webListingImages() {
  const html = await rawText(`${webBaseUrl}/listings`)
  const storagePrefix = `${storagePublicUrl}/${storageBucket}/`

  check(
    "web listing storage images",
    html.includes(storagePrefix) && !html.includes("/_next/image?url="),
    `storage=${storagePrefix}`
  )
}

async function resolveSmokeMunicipality() {
  const places = await api(
    "GET",
    "/places/autocomplete?q=Roma&type=municipality&limit=1"
  )
  const municipality = places.items?.find(
    (item) => item.type === "municipality"
  )

  check(
    "place autocomplete result",
    Boolean(municipality?.id),
    `items=${places.items?.length ?? 0}`
  )

  return municipality
}

async function waitForDraftImagesReady(id, bearerToken) {
  const timeoutMs = Number(process.env.SMOKE_IMAGE_TIMEOUT_MS ?? 30_000)
  const startedAt = Date.now()
  let images = null

  while (Date.now() - startedAt <= timeoutMs) {
    images = await api(
      "GET",
      `/listings/me/drafts/${id}/images`,
      undefined,
      bearerToken
    )

    if (images.meta.rejectedCount > 0) {
      throw new Error(
        `FAIL draft image processing rejected=${images.meta.rejectedCount}`
      )
    }

    if (images.meta.readyCount > 0 && images.meta.pendingCount === 0) {
      return images
    }

    await sleep(1_000)
  }

  throw new Error(
    `FAIL draft image processing timeout ready=${
      images?.meta.readyCount ?? 0
    } pending=${images?.meta.pendingCount ?? 0}. Is the worker running?`
  )
}

async function findPendingReviewCase(listingId, bearerToken) {
  const pageSize = 100
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const queue = await api(
      "GET",
      `/moderation/listings/pending-review?page=${page}&pageSize=${pageSize}`,
      undefined,
      bearerToken
    )
    const item = queue.items.find((entry) => entry.listing.id === listingId)

    if (item) {
      return item
    }

    totalPages = queue.meta.totalPages
    page += 1
  }

  throw new Error(`FAIL demo moderation submitted case listing=${listingId}`)
}

function createSmokeImageBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGElEQVR4nGNkYPjPgASYGFABqXwMDAwA6uoCPWkU8lAAAAAASUVORK5CYII=",
    "base64"
  )
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function check(label, condition, detail = "") {
  if (!condition) {
    throw new Error(`FAIL ${label}${detail ? ` ${detail}` : ""}`)
  }

  pass(label, detail)
}

function pass(label, detail = "") {
  console.log(`PASS ${label}${detail ? ` ${detail}` : ""}`)
}

function hasFavoriteToggleState(html, listingId, state) {
  const listingIndex = html.indexOf(`data-listing-id="${listingId}"`)

  if (listingIndex < 0) {
    return false
  }

  const stateIndex = html.lastIndexOf(
    `data-favorite-state="${state}"`,
    listingIndex
  )

  return stateIndex >= 0 && listingIndex - stateIndex < 200
}

function readUrl(value, fallback) {
  return (value || fallback).replace(/\/+$/, "")
}
