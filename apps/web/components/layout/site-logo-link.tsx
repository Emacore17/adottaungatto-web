import Image from "next/image"
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
        "inline-flex min-w-0 shrink-0 items-center rounded-sm transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className
      )}
    >
      <Image
        src="/adottaungattoit-logo.svg"
        alt="adottaungatto.it"
        width={147}
        height={32}
        priority
        className={cn("w-auto", logoClassName)}
      />
    </Link>
  )
}

export { SiteLogoLink }
