import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
      <Skeleton className="h-64 rounded-lg lg:col-span-2" />
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
    </main>
  )
}
