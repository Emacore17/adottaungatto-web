import Link from "next/link"
import Image from "next/image"

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
        "inline-flex min-w-0 items-center rounded-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className
      )}
    >
      <span className="sr-only">adottaungatto.it</span>
      <Image
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        width={1971}
        height={323}
        preload
        unoptimized
        className={cn(
          "h-auto w-52 max-w-full shrink-0 object-contain sm:w-60",
          logoClassName
        )}
      />
    </Link>
  )
}

export { SiteLogoLink }
