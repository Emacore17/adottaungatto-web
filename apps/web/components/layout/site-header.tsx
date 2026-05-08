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
    <header className="fixed inset-x-0 top-0 z-50 [transform:translateZ(0)] px-3 pt-3 [backface-visibility:hidden] sm:px-6 sm:pt-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative rounded-[2rem] border border-border/70 bg-background/82 px-3 py-2.5 text-foreground shadow-[0_24px_70px_-42px_rgba(20,14,20,0.56)] backdrop-blur-2xl supports-backdrop-filter:bg-background/76 sm:px-4 lg:px-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:hidden">
            <div className="flex min-w-0 justify-start">
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
            </div>

            <SiteLogoLink
              className="justify-self-center"
              markClassName="size-10 max-[350px]:size-9"
            />

            <div className="flex min-w-0 justify-end">
              <MobileNavigation items={navigation.mobile} />
            </div>
          </div>

          <div className="relative hidden items-center lg:flex">
            <div className="min-w-0 flex-1 pr-16">
              <DesktopNavigation align="start" items={navigation.left} />
            </div>

            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="pointer-events-auto">
                <SiteLogoLink markClassName="size-11" />
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
