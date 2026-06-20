import { Skeleton } from "@/components/ui/skeleton"

export function ItemCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
      <Skeleton className="size-16 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-auto h-2.5 w-full" />
      </div>
    </div>
  )
}
