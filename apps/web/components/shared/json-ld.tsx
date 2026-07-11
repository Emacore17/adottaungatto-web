type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue }

import { headers } from "next/headers"

type JsonLdProps = {
  data: JsonLdValue
}

// Server component async: legge il nonce CSP impostato dal middleware cosi' il
// blocco JSON-LD supera la Content-Security-Policy con `strict-dynamic`.
async function JsonLd({ data }: JsonLdProps) {
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}

export { JsonLd }
