import { Plus_Jakarta_Sans } from "next/font/google"
import type { Viewport } from "next"

import "@workspace/ui/globals.css"
import { RealtimeNotificationsProvider } from "@/components/providers/realtime-notifications-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { resolveAuthenticatedUser } from "@/lib/auth/resolve-user"
import { siteConfig } from "@/lib/config/site"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Toaster } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  ...createPageMetadata(),
}

export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#ffffff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#18181b",
    },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await resolveAuthenticatedUser()

  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={cn("antialiased font-sans", jakarta.variable)}
    >
      <body className="min-h-svh bg-background text-foreground">
        <ThemeProvider>
          <RealtimeNotificationsProvider
            key={user ? "authenticated" : "anonymous"}
            enabled={Boolean(user)}
          >
            {children}
          </RealtimeNotificationsProvider>
          <Toaster closeButton position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
