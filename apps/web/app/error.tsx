"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-svh items-center px-4 py-12">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Errore temporaneo</EmptyTitle>
          <EmptyDescription>
            La pagina non puo essere caricata in questo momento.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" onClick={reset}>
            Riprova
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
