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

export default function DraftListingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Bozze annunci</EmptyTitle>
          <EmptyDescription>
            Le bozze salvate saranno disponibili in questa area.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href={routes.account}>Account</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
