import { createFileRoute } from "@tanstack/react-router"
import { getActivityPage } from "@/lib/activity"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { parsePage } from "@/lib/pagination"

const PAGE_SIZE = 25

type ActivitySearch = {
  page?: number
}

export const Route = createFileRoute("/activity")({
  staleTime: 30_000,
  validateSearch: (search: Record<string, unknown>): ActivitySearch => ({
    page: parsePage(search.page),
  }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ deps }) =>
    getActivityPage({ data: { page: deps.page, pageSize: PAGE_SIZE } }),
  pendingComponent: ActivitySkeleton,
})

export function ActivitySkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 px-2 sm:px-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}