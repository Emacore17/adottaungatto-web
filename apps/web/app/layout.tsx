import { Geist_Mono, Inter } from "next/font/google"
import type { Viewport } from "next"

import "@workspace/ui/globals.css"
import { RealtimeNotificationsProvider } from "@/components/providers/realtime-notifications-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { getSessionToken } from "@/lib/auth/session"
import { siteConfig } from "@/lib/config/site"
import { createPageMetadata } from "@/lib/seo/metadata"
import { Toaster } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  ...createPageMetadata(),
}

export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#fffbf5",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#123f43",
    },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const token = await getSessionToken()

  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body className="min-h-svh">
        <ThemeProvider>
          <RealtimeNotificationsProvider
            key={token ? "authenticated" : "anonymous"}
            enabled={Boolean(token)}
          >
            {children}
          </RealtimeNotificationsProvider>
          <Toaster closeButton position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
