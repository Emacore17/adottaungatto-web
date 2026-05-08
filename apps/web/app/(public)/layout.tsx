import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-svh flex-col pt-24 sm:pt-28">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  )
}
