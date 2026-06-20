import {
  GiftIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"

import { SiteLogoLink } from "@/components/layout/site-logo-link"

const valueProps: Array<{
  icon: LucideIcon
  title: string
  body: string
}> = [
  {
    icon: ShieldCheckIcon,
    title: "Annunci verificati",
    body: "Ogni annuncio passa da una revisione reale prima di andare online.",
  },
  {
    icon: MessageCircleIcon,
    title: "Contatto diretto",
    body: "Parli con chi si occupa del gatto, senza intermediari.",
  },
  {
    icon: GiftIcon,
    title: "Sempre gratuito",
    body: "Adottare e pubblicare un annuncio non costa nulla.",
  },
]

function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-border bg-gradient-to-br from-brand-coral-soft via-secondary/40 to-brand-teal-soft lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="drift-slow absolute -top-24 -left-16 size-[24rem] rounded-full bg-brand-coral-soft blur-3xl" />
        <div className="drift-slower absolute -right-20 bottom-[12%] size-[20rem] rounded-full bg-brand-teal-soft blur-3xl" />
      </div>

      <div className="relative">
        <SiteLogoLink logoClassName="h-8 w-auto" />
      </div>

      <div className="relative max-w-md">
        <h2 className="text-3xl font-extrabold tracking-tight text-balance text-foreground xl:text-4xl">
          Entra nella community delle{" "}
          <span className="text-brand-gradient">adozioni responsabili</span>.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Crea il tuo spazio per gestire annunci, preferiti e contatti. Gatti
          reali, persone reali, vicino a te.
        </p>

        <ul className="mt-9 flex flex-col gap-5">
          {valueProps.map((prop) => (
            <li key={prop.title} className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background/80 text-primary shadow-sm">
                <prop.icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold tracking-tight text-foreground">
                  {prop.title}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {prop.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-sm text-muted-foreground">
        Una scelta consapevole, non un acquisto.
      </p>
    </aside>
  )
}

export { AuthBrandPanel }
