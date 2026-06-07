import Link from "next/link"

import { routes } from "@/lib/routes"
import { cn } from "@workspace/ui/lib/utils"

type SiteLogoLinkProps = {
  className?: string
  logoClassName?: string
  onClick?: () => void
}

function SiteLogoLink({
  className,
  logoClassName,
  onClick,
}: SiteLogoLinkProps) {
  return (
    <Link
      href={routes.home}
      aria-label="adottaungatto.it"
      onClick={onClick}
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-sm transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-7 items-center justify-center rounded-md bg-foreground text-background"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4"
        >
          <path d="M12 2c-1.1 0-2 .9-2 2 0 .4.1.7.3 1L5 6.7C3.6 7.5 3 9 3 10.5V18a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-7.5c0-1.5-.6-3-2-3.8l-5.3-1.7c.2-.3.3-.6.3-1 0-1.1-.9-2-2-2zm-3 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-3 4.5c.8 0 1.6.2 2.3.5l-.6.7c-.5.5-.5 1.3 0 1.8.5.5 1.3.5 1.8 0l1-1c.3-.3.4-.7.3-1.1 0-.4-.3-.7-.6-.9C15 15.5 13.5 15 12 15s-3 .5-4.2 1c-.3.2-.6.5-.6.9 0 .4 0 .8.3 1.1l1 1c.5.5 1.3.5 1.8 0s.5-1.3 0-1.8l-.6-.7c.7-.3 1.5-.5 2.3-.5z" />
        </svg>
      </span>
      <span
        className={cn(
          "text-base font-semibold tracking-tight text-foreground",
          logoClassName
        )}
      >
        adottaungatto<span className="text-muted-foreground">.it</span>
      </span>
    </Link>
  )
}

export { SiteLogoLink }
