import { webEnv } from "@/lib/config/env"
import { Button } from "@workspace/ui/components/button"

type GoogleLoginButtonProps = {
  label: string
}

// Reso solo quando NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED e' attivo: finche' i secret
// non sono configurati, il social login resta nascosto. Il link punta
// all'endpoint API che avvia il flusso OAuth (state + PKCE lato server).
function GoogleLoginButton({ label }: GoogleLoginButtonProps) {
  if (!webEnv.googleOAuthEnabled) {
    return null
  }

  const startUrl = `${webEnv.publicApiBaseUrl}/auth/oauth/google/start`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        oppure
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <Button asChild variant="outline" size="lg" className="w-full">
        <a href={startUrl}>
          <GoogleGlyph />
          {label}
        </a>
      </Button>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg
      aria-hidden="true"
      data-icon="inline-start"
      viewBox="0 0 24 24"
      className="size-4"
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.73Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.09C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  )
}

export { GoogleLoginButton }
