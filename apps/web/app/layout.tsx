import { Geist_Mono, Inter } from "next/font/google"
import type { Viewport } from "next"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { siteConfig } from "@/lib/config/site"
import { createPageMetadata } from "@/lib/seo/metadata"
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
      color: "#ffffff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#20191f",
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
