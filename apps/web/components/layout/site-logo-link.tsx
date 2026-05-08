import Link from "next/link"
import { CatIcon } from "lucide-react"

import { routes } from "@/lib/routes"
import { cn } from "@workspace/ui/lib/utils"

type SiteLogoLinkProps = {
  className?: string
  markClassName?: string
  showLabel?: boolean
  onClick?: () => void
}

function SiteLogoLink({
  className,
  markClassName,
  onClick,
  showLabel = false,
}: SiteLogoLinkProps) {
  return (
    <Link
      href={routes.home}
      aria-label="adottaungatto.it"
      onClick={onClick}
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-full p-1 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_36px_-24px_color-mix(in_oklab,var(--color-primary)_82%,black)] transition-[background-color,color,box-shadow]",
          markClassName
        )}
      >
        <CatIcon aria-hidden="true" className="size-5" />
      </span>
      {showLabel ? (
        <span className="truncate font-heading text-sm font-semibold tracking-normal">
          adottaungatto.it
        </span>
      ) : null}
    </Link>
  )
}

export { SiteLogoLink }
