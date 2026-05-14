import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

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
const demoPassword = "demo-password-123"
const primaryEmail = `e2e.${Date.now()}@demo.adottaungatto.local`
const demoOwnerAccounts = new Map([
  [
    "11111111-1111-4111-8111-111111111111",
    {
      email: "rifugio.torino@demo.adottaungatto.local",
      password: demoPassword,
    },
  ],
  [
    "11111111-1111-4111-8111-111111111112",
    {
      email: "volontari.italia@demo.adottaungatto.local",
      password: demoPassword,
    },
  ],
  [
    "11111111-1111-4111-8111-111111111113",
    {
      email: "marta.demo@demo.adottaungatto.local",
      password: demoPassword,
    },
  ],
])

let token = null
let otherToken = null
let accountEmail = primaryEmail
let draftId = null
let deleteDraftId = null
let listingId = null
let submittedListingId = null

try {
  const healthResponse = await apiResponse("GET", "/health", undefined)
  const health = healthResponse.data

  check("api health", health.status === "ok")
  check(
    "api request correlation headers",
    Boolean(healthResponse.headers.get("x-request-id")) &&
      Boolean(healthResponse.headers.get("x-trace-id"))
  )

  const readiness = await api("GET", "/health/ready")
  check(
    "api readiness",
    readiness.status === "ready" && Array.isArray(readiness.checks)
  )

  const metrics = await api("GET", "/health/metrics")
  check(
    "api observability metrics",
    metrics.http?.requestsTotal >= 1 &&
      Number.isInteger(metrics.http?.inFlightRequests)
  )

  const alerts = await api("GET", "/health/alerts")
  check(
    "api observability alerts",
    ["ok", "alerting"].includes(alerts.status) &&
      Array.isArray(alerts.alerts) &&
      Number.isFinite(alerts.thresholds?.p95DurationMsThreshold)
  )

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
  const previewImages = listings.items[0]?.images?.preview ?? []

  check(
    "public listing cover image",
    typeof coverObjectKey === "string" && coverObjectKey.length > 0
  )
  check(
    "public listing preview images",
    Array.isArray(previewImages) &&
      previewImages.length > 0 &&
      previewImages.length <= 4 &&
      previewImages[0]?.id === listings.items[0]?.images?.cover?.id,
    `preview=${previewImages.length}`
  )
  check(
    "public listing favorite count",
    Number.isInteger(listings.items[0]?.stats?.favoriteCount),
    `count=${listings.items[0]?.stats?.favoriteCount ?? "missing"}`
  )
  const relaxedSearch = await api(
    "GET",
    "/listings?q=zzzxqvnotfound&page=1&pageSize=3"
  )
  check(
    "public listing relaxed search fallback",
    relaxedSearch.items.length > 0 &&
      relaxedSearch.meta?.expansion?.type === "relaxed_filters",
    `items=${relaxedSearch.items.length} expansion=${
      relaxedSearch.meta?.expansion?.type ?? "none"
    }`
  )
  const expandedNearby = await api(
    "GET",
    "/listings?lat=0&lng=0&radiusKm=1&sort=distance&page=1&pageSize=3"
  )
  check(
    "public listing expanded nearby fallback",
    expandedNearby.items.length > 0 &&
      expandedNearby.meta?.expansion?.type === "expanded_radius",
    `items=${expandedNearby.items.length} expansion=${
      expandedNearby.meta?.expansion?.type ?? "none"
    }`
  )

  const coverStorage = await fetch(
    `${storagePublicUrl}/${storageBucket}/${coverObjectKey}`
  )
  check(
    "public listing storage image",
    coverStorage.ok,
    `status=${coverStorage.status}`
  )
  const proxiedCoverStorage = await fetch(
    `${webBaseUrl}/api/storage/${encodeStorageObjectKey(coverObjectKey)}`
  )
  check(
    "web proxied listing storage image",
    proxiedCoverStorage.ok &&
      proxiedCoverStorage.headers.get("content-type")?.startsWith("image/"),
    `status=${proxiedCoverStorage.status}`
  )
  pass("public listing selected", `listing=${listingId}`)

  const listing = await api("GET", `/listings/${listingId}`)
  check("public listing detail", listing.id === listingId)
  await webListingImages()

  const primaryAuth = await createPrimaryAuth()
  token = primaryAuth.token
  accountEmail = primaryAuth.email
  check("auth primary session", typeof token === "string" && token.length > 0)

  const session = await api("GET", "/auth/me", undefined, token)
  check("auth me", session.user.email === accountEmail)

  const otherLogin = await api("POST", "/auth/login", {
    email: "volontari.italia@demo.adottaungatto.local",
    password: demoPassword,
  })
  otherToken = otherLogin.session.token
  check(
    "authz other login",
    otherLogin.user.email === "volontari.italia@demo.adottaungatto.local" &&
      typeof otherToken === "string" &&
      otherToken.length > 0
  )
  const otherFavoriteSetup = await api(
    "DELETE",
    `/favorites/listings/${listingId}`,
    undefined,
    otherToken
  )
  pass("authz other favorite setup", `deleted=${otherFavoriteSetup.deleted}`)

  const profileDisplayName = `Smoke Profilo ${Date.now()}`
  const profile = await api(
    "PATCH",
    "/users/me",
    {
      displayName: profileDisplayName,
      phoneE164: "+390600000001",
    },
    token
  )
  check(
    "account profile update",
    profile.displayName === profileDisplayName &&
      profile.phoneE164 === "+390600000001"
  )

  const notificationPreferences = await api(
    "PATCH",
    "/users/me/notification-preferences",
    {
      listingModerationDecisionEmail: false,
      listingReportDecisionEmail: true,
    },
    token
  )
  check(
    "account notification preferences update",
    notificationPreferences.listingModerationDecisionEmail === false &&
      notificationPreferences.listingReportDecisionEmail === true
  )

  const municipality = await resolveSmokeMunicipality()
  pass("place autocomplete", `municipality=${municipality.label}`)

  const draft = await api(
    "POST",
    "/listings/me/drafts",
    {
      contactRequestsEnabled: true,
      description:
        "Annuncio completo creato dallo smoke test end to end con immagine.",
      ageMonths: 18,
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

  const smokeImages = await loadSmokeImageFixtures(2)
  pass(
    "draft image fixtures",
    smokeImages.map((image) => image.fileName).join(", ")
  )

  for (const [index, smokeImage] of smokeImages.entries()) {
    const upload = await uploadDraftSmokeImage(
      draftId,
      smokeImage,
      index === 0,
      token
    )
    check(
      `draft image ${index + 1} upload url`,
      upload.upload?.method === "PUT" && typeof upload.image?.id === "string"
    )
  }

  const readyImages = await waitForDraftImagesReady(draftId, token)
  check(
    "draft image processing",
    readyImages.meta.readyCount >= smokeImages.length &&
      readyImages.meta.pendingCount === 0
  )

  await expectApiStatus(
    "authz other draft detail denied",
    "GET",
    `/listings/me/drafts/${draftId}`,
    undefined,
    otherToken,
    [404]
  )
  await expectApiStatus(
    "authz other draft image list denied",
    "GET",
    `/listings/me/drafts/${draftId}/images`,
    undefined,
    otherToken,
    [404]
  )
  await expectApiStatus(
    "authz other draft image upload denied",
    "POST",
    `/listings/me/drafts/${draftId}/images/upload-url`,
    {
      isCover: true,
      mimeType: "image/png",
      sizeBytes: smokeImages[0].buffer.byteLength,
    },
    otherToken,
    [404]
  )
  await expectApiStatus(
    "authz other draft update denied",
    "PATCH",
    `/listings/me/drafts/${draftId}`,
    { title: "Tentativo utente non proprietario" },
    otherToken,
    [404]
  )
  const ownerDraftAfterAuthz = await api(
    "GET",
    `/listings/me/drafts/${draftId}`,
    undefined,
    token
  )
  check(
    "authz owner draft intact",
    ownerDraftAfterAuthz.id === draftId &&
      ownerDraftAfterAuthz.title.startsWith("Smoke draft aggiornato")
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

  const otherFavorites = await api(
    "GET",
    "/favorites/listings?page=1&pageSize=10",
    undefined,
    otherToken
  )
  check(
    "authz other favorite isolation",
    !otherFavorites.items.some((item) => item.listing.id === listingId)
  )

  const otherFavoriteDelete = await api(
    "DELETE",
    `/favorites/listings/${listingId}`,
    undefined,
    otherToken
  )
  check(
    "authz other favorite delete isolated",
    otherFavoriteDelete.deleted === false
  )

  const ownerFavoritesAfterOtherDelete = await api(
    "GET",
    "/favorites/listings?page=1&pageSize=10",
    undefined,
    token
  )
  check(
    "authz owner favorite intact",
    ownerFavoritesAfterOtherDelete.items.some(
      (item) => item.listing.id === listingId
    )
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
  const webFavorite = await rawJson(
    `${webBaseUrl}/api/favorites/listings/${listingId}`,
    {
      headers: {
        Cookie: `aug_session=${token}`,
        Origin: webBaseUrl,
      },
      method: "POST",
    }
  )
  check("web favorite api add", webFavorite.favorited === true)
  const webFavoriteState = await rawJson(
    `${webBaseUrl}/api/favorites/listings/${listingId}`,
    {
      headers: {
        Cookie: `aug_session=${token}`,
      },
    }
  )
  check(
    "web favorite api state saved",
    webFavoriteState.favorited === true &&
      Number.isInteger(webFavoriteState.favoriteCount)
  )
  const webFavoriteSavedHtml = await webText(
    "/listings",
    token,
    "web listing favorite api saved"
  )
  check(
    "web listing favorite api saved state",
    hasFavoriteToggleState(webFavoriteSavedHtml, listingId, "saved")
  )
  const webFavoriteRemoved = await rawJson(
    `${webBaseUrl}/api/favorites/listings/${listingId}`,
    {
      headers: {
        Cookie: `aug_session=${token}`,
        Origin: webBaseUrl,
      },
      method: "DELETE",
    }
  )
  check("web favorite api delete", webFavoriteRemoved.favorited === false)
  const webFavoriteRemovedState = await rawJson(
    `${webBaseUrl}/api/favorites/listings/${listingId}`,
    {
      headers: {
        Cookie: `aug_session=${token}`,
      },
    }
  )
  check(
    "web favorite api state removed",
    webFavoriteRemovedState.favorited === false &&
      Number.isInteger(webFavoriteRemovedState.favoriteCount)
  )
  const webFavoriteApiRemovedHtml = await webText(
    "/listings",
    token,
    "web listing favorite api removed"
  )
  check(
    "web listing favorite api removed state",
    hasFavoriteToggleState(webFavoriteApiRemovedHtml, listingId, "idle")
  )

  const contactCase = await createSmokeContactRequest(token, [
    session.user.id,
    otherLogin.user.id,
  ])
  const contact = contactCase.contact
  check(
    "contact owner",
    contact.sent === true &&
      contact.request?.status === "sent" &&
      contact.request?.phoneShared === true,
    `listing=${contactCase.listing.id}`
  )

  const ownerAccount = demoOwnerAccounts.get(contactCase.listing.owner.id)
  check(
    "contact owner fixture account",
    Boolean(ownerAccount),
    `owner=${contactCase.listing.owner.id}`
  )
  const ownerLogin =
    contactCase.ownerLogin ??
    (await api("POST", "/auth/login", {
      email: ownerAccount.email,
      password: ownerAccount.password,
    }))
  const ownerToken = ownerLogin.session.token
  check(
    "contact owner login",
    ownerLogin.user.id === contactCase.listing.owner.id &&
      typeof ownerToken === "string"
  )

  const receivedContacts = await api(
    "GET",
    "/contacts/me/received?page=1&pageSize=20",
    undefined,
    ownerToken
  )
  const receivedContact = receivedContacts.items.find(
    (item) => item.id === contact.request.id
  )
  check(
    "contact owner received list",
    receivedContact?.listing.id === contactCase.listing.id &&
      receivedContact?.requester.email === accountEmail &&
      receivedContact?.requester.phoneE164 === "+390600000001" &&
      receivedContact?.emailShared === true &&
      receivedContact?.phoneShared === true
  )

  const otherReceivedContacts = await api(
    "GET",
    "/contacts/me/received?page=1&pageSize=20",
    undefined,
    otherToken
  )
  check(
    "authz other contact received isolation",
    !otherReceivedContacts.items.some((item) => item.id === contact.request.id)
  )

  const ownerContactsHtml = await webText(
    "/account/contacts",
    ownerToken,
    "web account contacts"
  )
  check(
    "web account contacts content",
    ownerContactsHtml.includes("Contatti ricevuti") &&
      ownerContactsHtml.includes(contactCase.listing.title) &&
      ownerContactsHtml.includes("+390600000001")
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

  const adminLogin = await loginDemoInternalModerator()
  const adminToken = adminLogin.session.token
  check(
    "demo admin login",
    [
      "admin@demo.adottaungatto.local",
      "moderatore@demo.adottaungatto.local",
    ].includes(adminLogin.user.email) && typeof adminToken === "string"
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

  const accountHtml = await webText(
    "/account",
    token,
    "web account authenticated"
  )
  check(
    "web account dashboard content",
    accountHtml.includes("Dashboard account") &&
      accountHtml.includes("Attivita operative") &&
      accountHtml.includes("Azioni rapide")
  )
  await webPage("/account/settings", token, "web account settings")
  await webPage("/account/contacts", token, "web account contacts requester")
  await webPage("/account/favorites", token, "web account favorites")
  await webPage("/account/notifications", token, "web account notifications")
  await webPage("/account/listings/drafts", token, "web account drafts")
  await webPage("/account/listings/drafts/new", token, "web account draft new")
  await webPage(
    `/account/listings/drafts/${draftId}`,
    token,
    "web account draft edit"
  )
  const moderationHtml = await webText(
    "/moderation",
    adminToken,
    "web moderation admin"
  )
  check(
    "web moderation admin shell",
    moderationHtml.includes("Area interna") &&
      moderationHtml.includes("Dashboard moderazione") &&
      moderationHtml.includes("Coda rapida") &&
      moderationHtml.includes("Controllo code") &&
      moderationHtml.includes("Apri coda rapida")
  )
  const moderationQueueHtml = await webText(
    "/moderation/queue?queue=pending",
    adminToken,
    "web moderation quick queue"
  )
  check(
    "web moderation quick queue content",
    moderationQueueHtml.includes("Revisione operativa") &&
      moderationQueueHtml.includes("Vista tabellare") &&
      moderationQueueHtml.includes("In revisione") &&
      moderationQueueHtml.includes("Seleziona casi dalla tabella") &&
      moderationQueueHtml.includes("Azioni")
  )
  const deniedModerationHtml = await webText(
    "/moderation",
    otherToken,
    "web moderation access denied"
  )
  check(
    "web moderation access denied content",
    deniedModerationHtml.includes("Accesso alla moderazione non consentito")
  )
  const reportedModerationHtml = await webText(
    "/moderation?queue=reported",
    adminToken,
    "web moderation reported filter"
  )
  check(
    "web moderation reported filter content",
    reportedModerationHtml.includes("Filtro code moderazione") &&
      reportedModerationHtml.includes("Annunci segnalati") &&
      !reportedModerationHtml.includes("Annunci in attesa")
  )

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
  const submissionNotifications = await api(
    "GET",
    "/notifications?page=1&pageSize=10",
    undefined,
    token
  )
  check(
    "draft submit review notification",
    submissionNotifications.items.some(
      (item) =>
        item.type === "listing_review_submission" &&
        item.payload?.listingId === submittedListingId &&
        item.payload?.moderationStatus === "pending_review"
    )
  )

  const submittedCase = await findPendingReviewCase(
    submittedListingId,
    adminToken
  )
  pass("demo moderation submitted case", `case=${submittedCase.case.id}`)
  check(
    "demo moderation submitted case images",
    submittedCase.images.readyCount >= 2 &&
      submittedCase.images.preview?.length >= 2,
    `ready=${submittedCase.images.readyCount} preview=${
      submittedCase.images.preview?.length ?? 0
    }`
  )

  const notificationStream = await openWebNotificationStream(token)
  const realtimeNotificationPromise = readWebNotificationEvent(
    notificationStream,
    (event) =>
      event.type === "created" &&
      event.data?.notification?.type === "listing_moderation_decision" &&
      event.data?.notification?.payload?.listingId === submittedListingId &&
      event.data?.notification?.payload?.decision === "approved"
  )
  let approval = null

  try {
    approval = await api(
      "POST",
      `/moderation/listings/cases/${submittedCase.case.id}/approve`,
      {
        reasonCode: "policy_ok",
      },
      adminToken
    )
  } catch (error) {
    notificationStream.close()
    realtimeNotificationPromise.catch(() => undefined)

    throw error
  }

  check(
    "demo moderation approve",
    approval.decided === true &&
      approval.listing.id === submittedListingId &&
      approval.listing.moderationStatus === "approved" &&
      approval.listing.lifecycleStatus === "published"
  )
  const realtimeNotification = await realtimeNotificationPromise.finally(() => {
    notificationStream.close()
  })
  check(
    "web notification realtime stream",
    realtimeNotification.data?.notification?.payload?.listingId ===
      submittedListingId
  )

  const publishedListing = await api("GET", `/listings/${submittedListingId}`)
  check(
    "demo moderation published detail",
    publishedListing.id === submittedListingId &&
      publishedListing.images.items.length >= smokeImages.length
  )
  const publishedListingHtml = await rawText(
    `${webBaseUrl}/listings/${submittedListingId}`
  )
  check(
    "web listing detail carousel",
    publishedListingHtml.includes("data-listing-carousel") &&
      publishedListingHtml.includes(
        `data-carousel-count="${smokeImages.length}"`
      )
  )
  check(
    "web listing detail image lightbox trigger",
    publishedListingHtml.includes("data-carousel-image-trigger") &&
      publishedListingHtml.includes('aria-haspopup="dialog"')
  )
  check(
    "web listing detail carousel thumbnails",
    countOccurrences(publishedListingHtml, "data-carousel-thumb") >=
      smokeImages.length,
    `thumbs=${countOccurrences(publishedListingHtml, "data-carousel-thumb")}`
  )

  const ownerNotifications = await api(
    "GET",
    "/notifications?page=1&pageSize=10",
    undefined,
    token
  )
  const ownerModerationNotification = ownerNotifications.items.find(
    (item) =>
      item.type === "listing_moderation_decision" &&
      item.payload?.listingId === submittedListingId &&
      item.payload?.decision === "approved"
  )
  check(
    "demo moderation owner notification",
    Boolean(ownerModerationNotification)
  )

  await expectApiStatus(
    "authz other notification read denied",
    "POST",
    `/notifications/${ownerModerationNotification.id}/read`,
    {},
    otherToken,
    [404]
  )
  const ownerNotificationsAfterOtherRead = await api(
    "GET",
    "/notifications?page=1&pageSize=10",
    undefined,
    token
  )
  check(
    "authz owner notification intact",
    ownerNotificationsAfterOtherRead.items.some(
      (item) =>
        item.id === ownerModerationNotification.id && item.readAt === null
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

  console.log(`E2E_SMOKE_OK email=${accountEmail} listing=${listingId}`)
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

async function createPrimaryAuth() {
  const registration = await apiResponse("POST", "/auth/register", {
    displayName: "Smoke E2E",
    email: primaryEmail,
    password,
    profileType: "private",
  })

  if (registration.ok) {
    pass("register", `email=${primaryEmail}`)

    return {
      email: primaryEmail,
      token: registration.data.session.token,
    }
  }

  if (registration.status !== 429) {
    throw new Error(
      `POST ${apiBaseUrl}/auth/register failed: ${registration.status} ${registration.text}`
    )
  }

  pass(
    "register fallback",
    `retryAfterSeconds=${registration.data?.retryAfterSeconds ?? "unknown"}`
  )
  const login = await api("POST", "/auth/login", {
    email: "marta.demo@demo.adottaungatto.local",
    password: demoPassword,
  })
  pass("demo user login", `email=${login.user.email}`)

  return {
    email: login.user.email,
    token: login.session.token,
  }
}

async function loginDemoInternalModerator() {
  const accounts = [
    "admin@demo.adottaungatto.local",
    "moderatore@demo.adottaungatto.local",
  ]

  for (const email of accounts) {
    const login = await apiResponse("POST", "/auth/login", {
      email,
      password: demoPassword,
    })

    if (login.ok) {
      pass("demo internal login", `email=${email}`)

      return login.data
    }

    if (
      login.status === 429 &&
      login.data?.reason === "auth_login_email_limit"
    ) {
      pass(
        "demo internal login skipped",
        `email=${email} retryAfterSeconds=${
          login.data.retryAfterSeconds ?? "unknown"
        }`
      )
      continue
    }

    throw new Error(
      `POST ${apiBaseUrl}/auth/login failed: ${login.status} ${login.text}`
    )
  }

  throw new Error("FAIL demo admin login all internal accounts rate limited")
}

async function createSmokeContactRequest(requesterToken, excludedOwnerIds) {
  const excludedOwners = new Set(excludedOwnerIds)
  const publicListings = await api("GET", "/listings?page=1&pageSize=20")
  const candidates = publicListings.items.filter(
    (item) =>
      item.contactRequestsEnabled &&
      item.owner?.id &&
      !excludedOwners.has(item.owner.id) &&
      demoOwnerAccounts.has(item.owner.id)
  )

  for (const candidate of candidates) {
    const ownerAccount = demoOwnerAccounts.get(candidate.owner.id)
    const ownerLogin = await api("POST", "/auth/login", {
      email: ownerAccount.email,
      password: ownerAccount.password,
    })
    const notificationStream = await openWebNotificationStream(
      ownerLogin.session.token
    )
    const realtimeNotificationPromise = readWebNotificationEvent(
      notificationStream,
      (event) =>
        event.type === "created" &&
        event.data?.notification?.type === "listing_contact_request" &&
        event.data?.notification?.payload?.listingId === candidate.id
    )
    let response = null

    try {
      response = await apiResponse(
        "POST",
        `/contacts/listings/${candidate.id}`,
        {
          message:
            "Ciao, vorrei ricevere informazioni per uno smoke test end to end.",
          shareEmail: true,
          sharePhone: true,
        },
        requesterToken
      )
    } catch (error) {
      notificationStream.close()
      realtimeNotificationPromise.catch(() => undefined)

      throw error
    }

    if (response.ok) {
      const realtimeNotification = await realtimeNotificationPromise.finally(
        () => {
          notificationStream.close()
        }
      )

      check(
        "contact owner realtime notification",
        realtimeNotification.data?.notification?.payload?.contactRequestId ===
          response.data.request.id
      )
      pass("contact listing selected", `listing=${candidate.id}`)

      return {
        contact: response.data,
        listing: candidate,
        ownerLogin,
      }
    }

    notificationStream.close()
    realtimeNotificationPromise.catch(() => undefined)

    if (
      response.status === 400 ||
      (response.status === 429 &&
        response.data?.reason === "listing_contact_cooldown")
    ) {
      pass(
        "contact listing skipped",
        `listing=${candidate.id} status=${response.status}`
      )
      continue
    }

    throw new Error(
      `POST ${apiBaseUrl}/contacts/listings/${candidate.id} failed: ${response.status} ${response.text}`
    )
  }

  throw new Error("FAIL contact owner no contactable demo listing available")
}

async function uploadDraftSmokeImage(
  draftId,
  smokeImage,
  isCover,
  bearerToken
) {
  const upload = await api(
    "POST",
    `/listings/me/drafts/${draftId}/images/upload-url`,
    {
      isCover,
      mimeType: smokeImage.mimeType,
      sizeBytes: smokeImage.buffer.byteLength,
    },
    bearerToken
  )

  const storageUpload = await fetch(upload.upload.url, {
    body: smokeImage.buffer,
    headers: upload.upload.headers,
    method: upload.upload.method,
  })
  check(
    `draft image storage upload ${smokeImage.fileName}`,
    storageUpload.ok,
    `status=${storageUpload.status}`
  )

  const confirmation = await api(
    "POST",
    `/listings/me/drafts/${draftId}/images/${upload.image.id}/confirm`,
    undefined,
    bearerToken
  )
  check(
    `draft image confirm ${smokeImage.fileName}`,
    confirmation.confirmed === true &&
      confirmation.image.status === "processing"
  )

  return upload
}

async function loadSmokeImageFixtures(count) {
  const fixtures = await loadCatImageFixtures(count)

  if (fixtures.length >= count) {
    return fixtures
  }

  return [
    ...fixtures,
    ...Array.from({ length: count - fixtures.length }, (_, index) => ({
      buffer: createFallbackSmokeImageBuffer(),
      fileName: `fallback-${index + 1}.png`,
      mimeType: "image/png",
    })),
  ]
}

async function loadCatImageFixtures(count) {
  const imagesDir = path.join(process.cwd(), "immagini-gattini")

  try {
    const entries = await readdir(imagesDir, { withFileTypes: true })
    const candidates = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => supportedSmokeImageMimeType(fileName) !== null)
      .sort((left, right) => left.localeCompare(right, "it"))
    const fixtures = []

    for (const fileName of candidates) {
      const buffer = await readFile(path.join(imagesDir, fileName))
      const mimeType = supportedSmokeImageMimeType(fileName)

      if (!mimeType || buffer.byteLength > 10 * 1024 * 1024) {
        continue
      }

      fixtures.push({
        buffer,
        fileName,
        mimeType,
      })

      if (fixtures.length >= count) {
        return fixtures
      }
    }
  } catch {
    return []
  }

  return []
}

function supportedSmokeImageMimeType(fileName) {
  const extension = path.extname(fileName).toLowerCase()

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg"
  }

  if (extension === ".png") {
    return "image/png"
  }

  if (extension === ".webp") {
    return "image/webp"
  }

  return null
}

async function apiResponse(method, path, body, bearerToken) {
  const headers = {
    Accept: "application/json",
  }

  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers,
    method,
  })
  const text = await response.text()

  return {
    data: text ? JSON.parse(text) : null,
    headers: response.headers,
    ok: response.ok,
    status: response.status,
    text,
  }
}

async function expectApiStatus(
  label,
  method,
  path,
  body,
  bearerToken,
  expectedStatuses
) {
  const response = await apiResponse(method, path, body, bearerToken)

  check(
    label,
    expectedStatuses.includes(response.status),
    `status=${response.status}${
      response.text ? ` body=${response.text.slice(0, 160)}` : ""
    }`
  )

  return response.data
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

async function openWebNotificationStream(sessionToken) {
  const controller = new AbortController()
  const response = await fetch(`${webBaseUrl}/api/notifications/stream`, {
    headers: {
      Accept: "text/event-stream",
      Cookie: `aug_session=${sessionToken}`,
    },
    signal: controller.signal,
  })

  check(
    "web notification stream open",
    response.status === 200 && Boolean(response.body),
    `status=${response.status}`
  )
  check(
    "web notification stream content type",
    response.headers.get("content-type")?.includes("text/event-stream"),
    `content-type=${response.headers.get("content-type") ?? "none"}`
  )

  const reader = response.body.getReader()

  return {
    close() {
      controller.abort()
      void reader.cancel().catch(() => undefined)
    },
    reader,
  }
}

async function readWebNotificationEvent(stream, predicate) {
  const timeoutMs = Number(process.env.SMOKE_NOTIFICATION_TIMEOUT_MS ?? 15_000)
  const deadline = Date.now() + timeoutMs
  const decoder = new TextDecoder()
  let buffer = ""

  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now())
    const chunk = await Promise.race([
      stream.reader.read(),
      sleep(remaining).then(() => ({ timeout: true })),
    ])

    if (chunk.timeout) {
      break
    }

    if (chunk.done) {
      throw new Error("FAIL web notification realtime stream closed")
    }

    buffer += decoder.decode(chunk.value, { stream: true })

    let separator = findSseEventSeparator(buffer)

    while (separator) {
      const rawEvent = buffer.slice(0, separator.index)
      buffer = buffer.slice(separator.index + separator.length)

      const event = parseSseEvent(rawEvent)

      if (event && predicate(event)) {
        return event
      }

      separator = findSseEventSeparator(buffer)
    }
  }

  throw new Error(
    `FAIL web notification realtime stream timeout after ${timeoutMs}ms`
  )
}

function findSseEventSeparator(buffer) {
  const separators = [
    {
      index: buffer.indexOf("\r\n\r\n"),
      length: 4,
    },
    {
      index: buffer.indexOf("\n\n"),
      length: 2,
    },
  ].filter((separator) => separator.index >= 0)

  return separators.sort((left, right) => left.index - right.index)[0] ?? null
}

function parseSseEvent(rawEvent) {
  const lines = rawEvent.split(/\r?\n/)
  const dataLines = []
  let type = "message"

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue
    }

    const separatorIndex = line.indexOf(":")
    const field =
      separatorIndex >= 0 ? line.slice(0, separatorIndex) : line.trim()
    const value =
      separatorIndex >= 0
        ? line.slice(separatorIndex + 1).replace(/^ /, "")
        : ""

    if (field === "event") {
      type = value
    }

    if (field === "data") {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  const dataText = dataLines.join("\n")

  try {
    return {
      data: JSON.parse(dataText),
      type,
    }
  } catch {
    return {
      data: dataText,
      type,
    }
  }
}

async function webListingImages() {
  const html = await rawText(`${webBaseUrl}/listings`)

  check(
    "web listing storage images",
    html.includes("/api/storage/") &&
      !html.includes(`${storagePublicUrl}/${storageBucket}/`) &&
      !html.includes("/_next/image?url="),
    "storage proxy present"
  )
  check(
    "web listing image previews",
    html.includes("data-listing-image-preview") &&
      html.includes("data-preview-count"),
    "preview markup present"
  )
}

function encodeStorageObjectKey(objectKey) {
  return objectKey.split("/").map(encodeURIComponent).join("/")
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

function createFallbackSmokeImageBuffer() {
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

function countOccurrences(value, pattern) {
  return value.split(pattern).length - 1
}

function readUrl(value, fallback) {
  return (value || fallback).replace(/\/+$/, "")
}
