import Link from "next/link"

import { routes } from "@/lib/routes"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center px-4 py-12">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Pagina non trovata</EmptyTitle>
          <EmptyDescription>
            Il contenuto richiesto non risulta disponibile.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={routes.home}>Torna alla home</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
