"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { RealtimeNotificationBadge } from "@/components/layout/realtime-notification-badge"
import {
  isActiveNavigationItem,
  isCurrentNavigationItem,
  type SiteNavigationItem,
} from "@/components/layout/site-navigation"
import { routes } from "@/lib/routes"
import { cn } from "@workspace/ui/lib/utils"

type DesktopNavigationProps = {
  align?: "end" | "start"
  items: readonly SiteNavigationItem[]
}

function DesktopNavigation({ align = "start", items }: DesktopNavigationProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="Navigazione principale">
      <ul
        className={cn(
          "flex items-center gap-1",
          align === "end" ? "justify-end" : "justify-start"
        )}
      >
        {items.map((item) => {
          const isCurrentPage = isCurrentNavigationItem(pathname, item)
          const isActive = isActiveNavigationItem(pathname, item)
          const isAccent = item.variant === "accent"

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrentPage ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-9 items-center rounded-full px-3 text-[0.72rem] font-semibold tracking-[0.08em] uppercase transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  !isAccent &&
                    "text-foreground/72 hover:bg-muted/70 hover:text-foreground",
                  !isAccent &&
                    "after:absolute after:right-3 after:bottom-1.5 after:left-3 after:h-px after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-200",
                  !isAccent && isActive && "text-foreground after:scale-x-100",
                  isAccent &&
                    "border border-primary/15 bg-primary px-3.5 text-primary-foreground shadow-[0_18px_42px_-28px_color-mix(in_oklab,var(--color-primary)_82%,black)] hover:bg-primary/92 hover:shadow-[0_20px_46px_-32px_color-mix(in_oklab,var(--color-primary)_82%,black)]",
                  isAccent && isActive && "ring-1 ring-primary/30",
                  "active:opacity-90"
                )}
              >
                {item.label}
                {item.href === routes.account ? (
                  <RealtimeNotificationBadge className="ml-2" />
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { DesktopNavigation }
