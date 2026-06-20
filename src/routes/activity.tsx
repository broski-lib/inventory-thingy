import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { getActivityPage } from "@/lib/activity"
import type { ActivityLog } from "@/lib/activity"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ActivityList } from "@/components/ActivityLog"
import { Pagination } from "@/components/Pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { parsePage } from "@/lib/pagination"
import { pluralize } from "@/lib/format"

const PAGE_SIZE = 25

type ActivitySearch = {
  page?: number
}

export const Route = createFileRoute("/activity")({
  validateSearch: (search: Record<string, unknown>): ActivitySearch => ({
    page: parsePage(search.page),
  }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ deps }) =>
    getActivityPage({ data: { page: deps.page, pageSize: PAGE_SIZE } }),
  component: ActivityRoute,
})

function ActivityRoute() {
  const navigate = useNavigate()
  const router = useRouter()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const page = search.page ?? 1
  const { logs, total, totalPages } = data

  const setPage = (newPage: number) => {
    navigate({ to: "/activity", search: { page: newPage }, replace: true })
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleItemClick = (log: ActivityLog) => {
    if (!log.itemId) return
    navigate({
      to: "/stock/$id/history",
      params: { id: log.itemId },
    })
  }

  const isEmpty = total === 0

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader />

        <div className="mt-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Activity Log</h2>
            <p className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              {isEmpty
                ? "No events yet"
                : `${total} ${pluralize(total, "event")} · latest first`}
            </p>
          </div>

          {isEmpty ? (
            <Card>
              <CardContent className="text-center">
                <p className="text-xs text-muted-foreground">
                  No activity yet. Add or update an item to see it here.
                </p>
                <button
                  type="button"
                  onClick={() => router.invalidate()}
                  className="mt-2 cursor-pointer text-xs font-semibold text-primary hover:underline"
                >
                  Refresh
                </button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="px-2 sm:px-3">
                  <ActivityList logs={logs} onItemClick={handleItemClick} />
                </CardContent>
              </Card>
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </section>
      <BottomNav />
    </main>
  )
}

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
