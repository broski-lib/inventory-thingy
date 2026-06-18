import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { getActivityPage } from "@/lib/activity"
import type { ActivityLog } from "@/lib/activity"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ActivityList } from "@/components/ActivityLog"
import { Pagination } from "@/components/Pagination"
import { Skeleton } from "@/components/ItemCardSkeleton"
import { Card, CardContent } from "@/components/ui/card"
import { parsePage } from "@/lib/pagination"
import { useEffect, useRef, useState } from "react"

const PAGE_SIZE = 25

type ActivitySearch = {
  page?: number
}

export const Route = createFileRoute("/activity")({
  validateSearch: (search: Record<string, unknown>): ActivitySearch => ({
    page: parsePage(search.page),
  }),
  component: ActivityRoute,
})

function ActivityRoute() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const page = search.page ?? 1

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    const reqId = ++reqIdRef.current
    setLoading(true)
    setError(null)
    getActivityPage({ data: { page, pageSize: PAGE_SIZE } })
      .then((result) => {
        if (reqId !== reqIdRef.current) return
        setLogs(result.logs)
        setTotal(result.total)
        setTotalPages(result.totalPages)
        setLoading(false)
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return
        console.error(err)
        setError(err instanceof Error ? err.message : "Failed to load activity")
        setLogs([])
        setTotal(0)
        setTotalPages(1)
        setLoading(false)
      })
  }, [page])

  const setPage = (newPage: number) => {
    navigate({ to: "/activity", search: { page: newPage }, replace: true })
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const retry = () => {
    setError(null)
    ++reqIdRef.current
    setLoading(true)
    getActivityPage({ data: { page, pageSize: PAGE_SIZE } })
      .then((result) => {
        setLogs(result.logs)
        setTotal(result.total)
        setTotalPages(result.totalPages)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load activity")
        setLoading(false)
      })
  }

  const handleItemClick = (log: ActivityLog) => {
    if (!log.itemId) return
    navigate({
      to: "/stock/$id/history",
      params: { id: log.itemId },
    })
  }

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader />

        <div className="mt-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Activity Log</h2>
            <p className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              {loading && total === 0
                ? "Loading…"
                : `${total} ${total === 1 ? "event" : "events"} · latest first`}
            </p>
          </div>

          {error ? (
            <Card>
              <CardContent className="gap-2 text-center">
                <p className="text-xs text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                >
                  Try again
                </button>
              </CardContent>
            </Card>
          ) : loading && logs.length === 0 ? (
            <ActivitySkeleton />
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="text-center">
                <p className="text-xs text-muted-foreground">
                  No activity yet. Add or update an item to see it here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="px-2 sm:px-3">
                  <ActivityList logs={logs} onItemClick={handleItemClick} />
                </CardContent>
              </Card>
              {loading && (
                <p className="animate-pulse text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Loading…
                </p>
              )}
            </>
          )}

          {!loading && total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>
      </section>
      <BottomNav active="home" />
    </main>
  )
}

function ActivitySkeleton() {
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
