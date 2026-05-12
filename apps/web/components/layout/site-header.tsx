import Link from "next/link"

import { DesktopNavigation } from "@/components/layout/desktop-navigation"
import { MobileNavigation } from "@/components/layout/mobile-navigation"
import {
  createSiteHeaderNavigation,
  type SiteNavigationItem,
} from "@/components/layout/site-navigation"
import { SiteLogoLink } from "@/components/layout/site-logo-link"
import { getSessionToken } from "@/lib/auth/session"
import { Button } from "@workspace/ui/components/button"

function getMobileAction(items: readonly SiteNavigationItem[]) {
  return items.find((item) => item.variant === "accent") ?? items[0]
}

async function SiteHeader() {
  const token = await getSessionToken()
  const navigation = createSiteHeaderNavigation(Boolean(token))
  const mobileAction = getMobileAction(navigation.right)

  return (
    <header className="fixed inset-x-0 top-0 z-50 [transform:translateZ(0)] px-4 pt-4 transition-[padding] duration-300 ease-out [backface-visibility:hidden] sm:px-6 lg:px-8 xl:transition-[padding,top] xl:duration-500 xl:ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="mx-auto w-full max-w-[96rem] transition-all duration-300 ease-out xl:origin-top xl:scale-[0.995] xl:transition-[max-width,transform] xl:duration-500 xl:ease-[cubic-bezier(0.22,1,0.36,1)] xl:will-change-[max-width,transform] 2xl:max-w-[100rem]">
        <div className="site-header-glass relative rounded-[2rem] border border-white/14 bg-black/34 px-4 py-3 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.8)] transition-all duration-300 ease-out supports-backdrop-filter:backdrop-blur-2xl sm:px-6 xl:origin-top xl:translate-y-0 xl:px-5 xl:transition-[border-radius,box-shadow,background-color,padding,transform] xl:duration-500 xl:ease-[cubic-bezier(0.22,1,0.36,1)] xl:will-change-[border-radius,box-shadow,background-color,padding] 2xl:px-6">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <SiteLogoLink
              className="min-w-0 shrink"
              logoClassName="h-9 max-w-[42vw] max-[360px]:h-8 max-[360px]:max-w-[7.5rem] sm:h-10 sm:max-w-[11rem]"
            />

            <div className="flex shrink-0 items-center justify-end gap-2">
              {mobileAction ? (
                <Button
                  asChild
                  variant={
                    mobileAction.variant === "accent" ? "default" : "ghost"
                  }
                  size="sm"
                  className="h-9 rounded-full px-2.5 text-[0.66rem] font-semibold tracking-[0.06em] uppercase max-[350px]:px-2 max-[350px]:text-[0.6rem]"
                >
                  <Link href={mobileAction.href}>{mobileAction.label}</Link>
                </Button>
              ) : null}

              <MobileNavigation items={navigation.mobile} />
            </div>
          </div>

          <div className="relative hidden items-center lg:flex">
            <div className="min-w-0 flex-1 pr-16">
              <DesktopNavigation align="start" items={navigation.left} />
            </div>

            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="pointer-events-auto">
                <SiteLogoLink logoClassName="h-10 max-w-[12rem] xl:h-11 xl:max-w-[13rem]" />
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
