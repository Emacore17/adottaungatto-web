import { DesktopNavigation } from "@/components/layout/desktop-navigation"
import { HeaderAccountControls } from "@/components/layout/header-account-controls"
import { MobileNavigation } from "@/components/layout/mobile-navigation"
import { createSiteHeaderNavigation } from "@/components/layout/site-navigation"
import { SiteLogoLink } from "@/components/layout/site-logo-link"
import { currentSession } from "@/lib/api/auth"
import { getSessionToken } from "@/lib/auth/session"

async function SiteHeader() {
  const token = await getSessionToken()
  const session = token ? await currentSession(token) : null
  const user = session?.ok ? session.data.user : null
  const navigation = createSiteHeaderNavigation(Boolean(user))

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <SiteLogoLink logoClassName="h-7 w-auto" />
          <div className="hidden lg:block">
            <DesktopNavigation align="start" items={navigation.left} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex lg:items-center lg:gap-3">
            {navigation.right.length > 0 ? (
              <DesktopNavigation align="end" items={navigation.right} />
            ) : null}
          </div>
          {user ? <HeaderAccountControls user={user} /> : null}
          <div className="lg:hidden">
            <MobileNavigation items={navigation.mobile} />
          </div>
        </div>
      </div>
    </header>
  )
}

export { SiteHeader }
