import { DesktopNavigation } from "@/components/layout/desktop-navigation"
import { HeaderAccountControls } from "@/components/layout/header-account-controls"
import { MobileNavigation } from "@/components/layout/mobile-navigation"
import { createSiteHeaderNavigation } from "@/components/layout/site-navigation"
import { SiteLogoLink } from "@/components/layout/site-logo-link"
import { currentSession } from "@/lib/api/auth"
import { getSessionToken } from "@/lib/auth/session"
import { cn } from "@workspace/ui/lib/utils"

async function SiteHeader() {
  const token = await getSessionToken()
  const session = token ? await currentSession(token) : null
  const user = session?.ok ? session.data.user : null
  const navigation = createSiteHeaderNavigation(Boolean(user))

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
      <div className="mx-auto w-full max-w-[92rem] 2xl:max-w-[98rem]">
        <div className="site-header-glass relative rounded-xl border border-border/70 bg-brand-cream/78 px-3 py-2.5 shadow-[0_24px_70px_-54px_color-mix(in_oklab,var(--color-brand-teal-ink)_44%,transparent)] supports-backdrop-filter:backdrop-blur-2xl sm:px-5 xl:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:hidden">
            <SiteLogoLink
              className="min-w-0"
              logoClassName={cn(
                "w-full sm:max-w-[17.5rem]",
                user
                  ? "max-w-[10.5rem] max-[360px]:max-w-[9.5rem]"
                  : "max-w-[15.5rem] max-[360px]:max-w-[14rem]"
              )}
            />

            <div className="flex items-center justify-end gap-2.5">
              {user ? <HeaderAccountControls user={user} /> : null}
              <MobileNavigation items={navigation.mobile} />
            </div>
          </div>

          <div className="relative hidden items-center lg:flex">
            <div className="min-w-0 flex-1 pr-16">
              <DesktopNavigation align="start" items={navigation.left} />
            </div>

            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="pointer-events-auto">
                <SiteLogoLink logoClassName="w-[19rem] xl:w-[21rem]" />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-4 pl-16">
              {navigation.right.length > 0 ? (
                <DesktopNavigation align="end" items={navigation.right} />
              ) : null}
              {user ? <HeaderAccountControls user={user} /> : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export { SiteHeader }
