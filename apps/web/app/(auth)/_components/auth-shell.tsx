import Image from "next/image"
import Link from "next/link"
import { ImageIcon, PawPrintIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

type AuthShellProps = {
  actionHref: string
  actionLabel: string
  children: React.ReactNode
  description: string
  eyebrow: string
  title: string
}

function AuthShell({
  actionHref,
  actionLabel,
  children,
  description,
  eyebrow,
  title,
}: AuthShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-center">
      <section className="relative z-10 flex min-w-0 justify-center lg:justify-start">
        {children}
      </section>

      <aside className="relative hidden min-h-[34rem] overflow-hidden rounded-xl border border-brand-teal/18 bg-card/68 p-5 shadow-[0_32px_92px_-66px_color-mix(in_oklab,var(--color-brand-teal-ink)_70%,transparent)] supports-backdrop-filter:backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Badge
            variant="secondary"
            className="border border-brand-olive/25 bg-brand-olive-soft text-brand-teal-ink"
          >
            {eyebrow}
          </Badge>
          <Button asChild variant="ghost" size="sm">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>

        <div className="relative my-8 overflow-hidden rounded-xl border border-brand-teal/14 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-brand-teal-soft)_76%,var(--color-card))_0%,color-mix(in_oklab,var(--color-brand-coral-soft)_54%,var(--color-card))_100%)] p-6">
          <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-border/70 bg-card/78">
            <Image
              src="/adottaungattoit-logo.svg"
              alt="Adotta un gatto"
              width={260}
              height={84}
              priority
              className="h-auto w-64 max-w-[78%]"
            />
          </div>
          <div
            className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-lg border border-border/70 bg-card/88 text-muted-foreground shadow-sm"
            aria-hidden="true"
          >
            <ImageIcon aria-hidden="true" className="size-4 text-primary" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-teal-ink">
            <PawPrintIcon
              aria-hidden="true"
              className="size-4 text-brand-coral-strong"
            />
            {title}
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </aside>
    </div>
  )
}

export { AuthShell }
