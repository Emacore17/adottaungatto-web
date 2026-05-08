"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileTextIcon,
  HomeIcon,
  LogInIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
  UserPlusIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { SiteLogoLink } from "@/components/layout/site-logo-link"
import {
  isActiveNavigationItem,
  isCurrentNavigationItem,
  type SiteNavigationIcon,
  type SiteNavigationItem,
} from "@/components/layout/site-navigation"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

type MobileNavigationProps = {
  items: readonly SiteNavigationItem[]
}

type MenuReveal = {
  diameter: number
  x: number
  y: number
}

const closeAnimationMs = 420
const contentDelayMs = 72

const navigationIcons = {
  "file-text": FileTextIcon,
  home: HomeIcon,
  "log-in": LogInIcon,
  search: SearchIcon,
  user: UserIcon,
  "user-plus": UserPlusIcon,
} as const satisfies Record<SiteNavigationIcon, LucideIcon>

function MobileNavigation({ items }: MobileNavigationProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)
  const [reveal, setReveal] = useState<MenuReveal>({
    diameter: 0,
    x: 0,
    y: 0,
  })
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const contentTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const clearMenuTimers = useCallback(() => {
    if (contentTimerRef.current !== null) {
      window.clearTimeout(contentTimerRef.current)
      contentTimerRef.current = null
    }

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const syncRevealFromTrigger = useCallback(() => {
    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    setReveal({
      diameter: radius * 2 + 24,
      x,
      y,
    })
  }, [])

  const closeMenu = useCallback(() => {
    clearMenuTimers()
    setContentVisible(false)
    setClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
      closeTimerRef.current = null
      triggerRef.current?.focus()
    }, closeAnimationMs)
  }, [clearMenuTimers])

  const openMenu = useCallback(() => {
    clearMenuTimers()
    syncRevealFromTrigger()
    setClosing(false)
    setContentVisible(false)
    setOpen(true)
    contentTimerRef.current = window.setTimeout(() => {
      setContentVisible(true)
      contentTimerRef.current = null
      closeButtonRef.current?.focus()
    }, contentDelayMs)
  }, [clearMenuTimers, syncRevealFromTrigger])

  useEffect(() => {
    return () => {
      clearMenuTimers()
    }
  }, [clearMenuTimers])

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [closeMenu, open])

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Apri menu"
        aria-expanded={open}
        aria-controls="site-mobile-navigation"
        onClick={openMenu}
        className="rounded-full border border-border/70 bg-background/70 text-foreground shadow-sm backdrop-blur-md hover:bg-muted/80 hover:text-foreground"
      >
        <MenuIcon aria-hidden="true" />
      </Button>

      {open ? (
        <div
          id="site-mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Navigazione principale"
          className={cn(
            "fixed inset-0 z-[60] h-[100svh] overflow-hidden bg-foreground/14 transition-opacity duration-300 ease-out motion-reduce:transition-none",
            contentVisible && !closing ? "opacity-100" : "opacity-0"
          )}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMenu()
            }
          }}
        >
          <div
            className={cn(
              "absolute rounded-full bg-background transition-transform duration-[520ms] ease-[cubic-bezier(0.2,0.9,0.22,1)] will-change-transform motion-reduce:transition-none",
              contentVisible && !closing ? "scale-100" : "scale-[0.04]"
            )}
            style={{
              height: reveal.diameter,
              left: reveal.x - reveal.diameter / 2,
              top: reveal.y - reveal.diameter / 2,
              width: reveal.diameter,
            }}
          />

          <div className="relative flex h-[100svh] min-h-0 flex-col overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 bg-background/88 px-4 pt-4 backdrop-blur-xl sm:px-6">
              <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 py-1">
                <SiteLogoLink
                  showLabel
                  onClick={closeMenu}
                  markClassName="size-10"
                />

                <Button
                  ref={closeButtonRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Chiudi menu"
                  onClick={closeMenu}
                  className="rounded-full border border-border bg-background/88 text-foreground shadow-sm hover:bg-muted hover:text-foreground"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>

              <div className="mx-auto mt-3 w-full max-w-2xl">
                <Separator />
              </div>
            </div>

            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] [-webkit-overflow-scrolling:touch] motion-reduce:transition-none sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+2rem)]",
                contentVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-2 opacity-0"
              )}
            >
              <nav
                aria-label="Menu mobile"
                className="mx-auto w-full max-w-2xl"
              >
                <ul className="flex flex-col gap-1.5">
                  {items.map((item, index) => {
                    const Icon = navigationIcons[item.icon]
                    const isCurrentPage = isCurrentNavigationItem(
                      pathname,
                      item
                    )
                    const isActive = isActiveNavigationItem(pathname, item)
                    const isAccent = item.variant === "accent"

                    return (
                      <li
                        key={item.href}
                        style={
                          {
                            "--menu-item-delay": `${96 + index * 28}ms`,
                          } as CSSProperties
                        }
                        className={cn(
                          "transition-[opacity,transform] [transition-delay:var(--menu-item-delay)] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:[transition-delay:0ms]",
                          contentVisible
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0"
                        )}
                      >
                        <Link
                          href={item.href}
                          aria-current={isCurrentPage ? "page" : undefined}
                          onClick={closeMenu}
                          className={cn(
                            "group flex min-h-16 items-center gap-3 rounded-[1.35rem] border p-2.5 transition-[background-color,border-color,box-shadow,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                            isActive
                              ? "border-border bg-muted/70 text-foreground shadow-sm"
                              : "border-transparent bg-transparent text-foreground hover:border-border/80 hover:bg-muted/55",
                            isAccent &&
                              "border-primary/15 bg-primary text-primary-foreground shadow-[0_20px_48px_-32px_color-mix(in_oklab,var(--color-primary)_82%,black)] hover:bg-primary/92 hover:text-primary-foreground",
                            "active:scale-[0.99]"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
                              isAccent
                                ? "bg-primary-foreground/14 text-primary-foreground"
                                : isActive
                                  ? "bg-background text-primary shadow-sm"
                                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            <Icon aria-hidden="true" className="size-5" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block text-[1rem] font-semibold tracking-normal",
                                isAccent
                                  ? "text-primary-foreground"
                                  : isActive
                                    ? "text-foreground"
                                    : "text-foreground"
                              )}
                            >
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block text-xs leading-5",
                                isAccent
                                  ? "text-primary-foreground/72"
                                  : "text-muted-foreground"
                              )}
                            >
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export { MobileNavigation }
