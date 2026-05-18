const apiBaseUrl = readRequiredUrl("API_URL")
const webBaseUrl = readRequiredUrl("WEB_URL")
const cloudflareAccessHeaders = createCloudflareAccessHeaders()

await expectJson("api health", `${apiBaseUrl}/health`, (data) => {
  return data?.service === "api" && data?.status === "ok"
})

await expectJson("api readiness", `${apiBaseUrl}/health/ready`, (data) => {
  return data?.service === "api" && data?.status === "ready"
})

await expectJson(
  "public listings",
  `${apiBaseUrl}/listings?page=1&pageSize=1`,
  (data) => {
    return Array.isArray(data?.items)
  }
)

await expectText("web home", `${webBaseUrl}/`, (text) => {
  return text.includes("adottaungatto") || text.includes("Adozione")
})

await expectText("web listings", `${webBaseUrl}/listings`, (text) => {
  return (
    text.includes("data-listing") ||
    text.includes("Nessun annuncio") ||
    text.includes("Nessun risultato")
  )
})

console.log(`REMOTE_SMOKE_OK api=${apiBaseUrl} web=${webBaseUrl}`)

async function expectJson(label, url, predicate) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...cloudflareAccessHeaders,
    },
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  check(label, response.ok && predicate(data), `status=${response.status}`)
}

async function expectText(label, url, predicate) {
  const response = await fetch(url, {
    headers: cloudflareAccessHeaders,
  })
  const text = await response.text()

  check(label, response.ok && predicate(text), `status=${response.status}`)
}

function check(label, condition, detail = "") {
  if (!condition) {
    throw new Error(`FAIL ${label}${detail ? ` ${detail}` : ""}`)
  }

  console.log(`PASS ${label}${detail ? ` ${detail}` : ""}`)
}

function readRequiredUrl(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required env ${name}`)
  }

  return value.replace(/\/+$/, "")
}

function createCloudflareAccessHeaders() {
  const clientId = readOptionalEnv("CLOUDFLARE_ACCESS_CLIENT_ID")
  const clientSecret = readOptionalEnv("CLOUDFLARE_ACCESS_CLIENT_SECRET")

  if (!clientId && !clientSecret) {
    return {}
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      "Configure both CLOUDFLARE_ACCESS_CLIENT_ID and CLOUDFLARE_ACCESS_CLIENT_SECRET."
    )
  }

  return {
    "CF-Access-Client-Id": clientId,
    "CF-Access-Client-Secret": clientSecret,
  }
}

function readOptionalEnv(name) {
  const value = process.env[name]?.trim()

  return value ? value : null
}
