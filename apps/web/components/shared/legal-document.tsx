import type { ReactNode } from "react"

type LegalDocumentProps = {
  title: string
  lastUpdated: string
  children: ReactNode
}

function LegalDocument({ title, lastUpdated, children }: LegalDocumentProps) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-normal tracking-[-0.015em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ultimo aggiornamento: {lastUpdated}
        </p>
      </div>

      <div className="mt-6 rounded-md border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground">
        Bozza da far validare da un consulente legale prima della pubblicazione:
        completa i dati del titolare e verifica i contenuti.
      </div>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-7 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </main>
  )
}

export { LegalDocument }
