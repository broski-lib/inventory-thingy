import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, sql } from "drizzle-orm"
import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon, DeliveryTruck01Icon } from "@hugeicons/core-free-icons"
import { getDb } from "@/lib/db"
import { items } from "@/lib/schema"
import { authRequiredMiddleware } from "@/lib/auth-middleware"
import type { ActivityLog } from "@/lib/activity"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { HomeActivity } from "@/components/HomeActivity"
import { SearchInput } from "@/components/SearchInput"
import { Card, CardContent } from "@/components/ui/card"
import type { ItemStatus } from "@/lib/item-status"

const loadHome = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }) => {
    const { orgId } = context
    const db = getDb()

    const statusCounts = await db
      .select({ status: items.status, count: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.orgId, orgId))
      .groupBy(items.status)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const movesTodayResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(and(eq(items.orgId, orgId), sql`${items.updatedAt} >= ${today}`))

    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.orgId, orgId))
    const totalCount = total[0]?.count ?? 0

    return {
      totalCount,
      stats: { statusCounts, movesToday: movesTodayResult[0]?.count || 0 },
    }
  })

export const Route = createFileRoute("/home")({
  loader: async () => loadHome(),
  component: HomeRoute,
})

function HomeRoute() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")

  const openScanner = () => navigate({ to: "/scan" })

  const handleActivityItemClick = (log: ActivityLog) => {
    if (!log.itemId) return
    navigate({
      to: "/stock/$id/history",
      params: { id: log.itemId },
    })
  }

  const { stats } = data
  const getCount = (statuses: readonly ItemStatus[]) =>
    stats.statusCounts
      .filter((sc: { status: string; count: number }) =>
        (statuses as readonly string[]).includes(sc.status)
      )
      .reduce(
        (sum: number, sc: { status: string; count: number }) => sum + sc.count,
        0
      )
  const availableCount = getCount(["Available", "In Storage"])
  const stagedCount = getCount(["Staged", "Reserved"])
  const repairCount = getCount(["Repair"])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    navigate({ to: "/stock", search: { q: value, page: 1 } })
  }

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader />

        <div className="mt-5 space-y-5">
          <Card className="rounded-xl border-primary bg-primary text-primary-foreground [--card-spacing:--spacing(4)]">
            <CardContent className="gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-primary-foreground/70">Today</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {stats.movesToday} updates
                  </p>
                </div>
                <div className="rounded-md bg-primary-foreground/10 p-3">
                  <HugeiconsIcon
                    icon={DeliveryTruck01Icon}
                    size={28}
                    strokeWidth={1.6}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-md bg-primary-foreground/10 p-2 text-center">
                  <p className="text-lg font-semibold">{availableCount}</p>
                  <p className="truncate text-[10px] text-primary-foreground/70">
                    Available
                  </p>
                </div>
                <div className="rounded-md bg-primary-foreground/10 p-2 text-center">
                  <p className="text-lg font-semibold">{stagedCount}</p>
                  <p className="truncate text-[10px] text-primary-foreground/70">
                    Staged/Res
                  </p>
                </div>
                <div className="rounded-md bg-primary-foreground/10 p-2 text-center">
                  <p className="text-lg font-semibold">{repairCount}</p>
                  <p className="truncate text-[10px] text-primary-foreground/70">
                    Repair
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <button
            type="button"
            onClick={openScanner}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary text-base font-semibold text-primary-foreground shadow-xs transition active:scale-[0.99]"
          >
            <HugeiconsIcon icon={Camera01Icon} size={20} strokeWidth={1.8} />
            Scan a tag
          </button>

          <SearchInput
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search live inventory..."
          />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Activity Log
              </h2>
              <Link
                to="/activity"
                className="inline-flex h-8 items-center px-2 text-xs font-medium text-muted-foreground hover:text-primary"
              >
                View all activity →
              </Link>
            </div>
            <Card>
              <CardContent>
                <HomeActivity onItemClick={handleActivityItemClick} />
              </CardContent>
            </Card>
          </section>
        </div>
      </section>
      <BottomNav active="home" />
    </main>
  )
}
