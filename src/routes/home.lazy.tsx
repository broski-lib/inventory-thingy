import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BoxIcon,
  Camera01Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons"
import type { ActivityLog } from "@/lib/activity"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { HomeActivity } from "@/components/HomeActivity"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createLazyFileRoute("/home")({
  component: HomeRoute,
})

function HomeRoute() {
  const { stats, recent } = Route.useLoaderData()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const totalItems = stats.statusCounts.reduce(
    (sum, sc) => sum + sc.count,
    0
  )

  const handleActivityItemClick = (log: ActivityLog) => {
    if (!log.itemId) return
    navigate({
      to: "/stock/$id/history",
      params: { id: log.itemId },
    })
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({ to: "/stock", search: { q: value, page: 1 } })
    }, 300)
  }

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AppHeader />

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/scan/camera"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-12 justify-center gap-2"
              )}
            >
              <HugeiconsIcon icon={Camera01Icon} size={18} strokeWidth={1.6} />
              Scan tag
            </Link>
            <Link
              to="/stock"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 justify-center gap-2"
              )}
            >
              <HugeiconsIcon icon={BoxIcon} size={18} strokeWidth={1.6} />
              Browse stock
            </Link>
          </div>

          <Link
            to="/stock/racks"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-10 w-full justify-center gap-2 text-xs font-semibold"
            )}
          >
            <HugeiconsIcon icon={BoxIcon} size={15} strokeWidth={1.6} />
            Racks
          </Link>

          <div className="relative">
            <HugeiconsIcon
              icon={PackageIcon}
              size={14}
              strokeWidth={1.8}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search inventory..."
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Inventory
              </p>
              <p className="mt-0.5 text-xl font-semibold">
                {totalItems} items
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Today
              </p>
              <p className="mt-0.5 text-xl font-semibold">
                {stats.movesToday} updates
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Recent activity
              </h2>
              <Link
                to="/activity"
                className="inline-flex h-8 items-center px-2 text-xs font-medium text-muted-foreground hover:text-primary"
              >
                View all →
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card px-2">
              <HomeActivity
                onItemClick={handleActivityItemClick}
                logs={recent}
              />
            </div>
          </section>
        </div>
      </section>
      <BottomNav />
    </main>
  )
}