import { DesktopNavigation } from "@/components/layout/desktop-navigation"
import { MobileNavigation } from "@/components/layout/mobile-navigation"
import { createSiteHeaderNavigation } from "@/components/layout/site-navigation"
import { SiteLogoLink } from "@/components/layout/site-logo-link"
import { getSessionToken } from "@/lib/auth/session"

async function SiteHeader() {
  const token = await getSessionToken()
  const navigation = createSiteHeaderNavigation(Boolean(token))

  return (
    <header className="fixed inset-x-0 top-0 z-50 [transform:translateZ(0)] px-3 pt-3 transition-[padding] duration-300 ease-out [backface-visibility:hidden] sm:px-6 sm:pt-4 lg:px-8 xl:transition-[padding,top] xl:duration-500 xl:ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="mx-auto w-full max-w-[92rem] transition-all duration-300 ease-out xl:origin-top xl:scale-[0.995] xl:transition-[max-width,transform] xl:duration-500 xl:ease-[cubic-bezier(0.22,1,0.36,1)] xl:will-change-[max-width,transform] 2xl:max-w-[98rem]">
        <div className="site-header-glass relative rounded-xl border border-border/70 bg-brand-cream/78 px-3 py-2.5 shadow-[0_24px_70px_-54px_color-mix(in_oklab,var(--color-brand-teal-ink)_44%,transparent)] transition-all duration-300 ease-out supports-backdrop-filter:backdrop-blur-2xl sm:px-5 xl:origin-top xl:translate-y-0 xl:px-5 xl:transition-[border-radius,box-shadow,background-color,padding,transform] xl:duration-500 xl:ease-[cubic-bezier(0.22,1,0.36,1)] xl:will-change-[border-radius,box-shadow,background-color,padding]">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:hidden">
            <SiteLogoLink
              className="min-w-0"
              logoClassName="w-full max-w-[15.5rem] max-[360px]:max-w-[14rem] sm:max-w-[17.5rem]"
            />

            <div className="flex justify-end">
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

            <div className="min-w-0 flex-1 pl-16">
              <DesktopNavigation align="end" items={navigation.right} />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export { SiteHeader }
