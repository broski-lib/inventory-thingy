import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { auth } from "@clerk/tanstack-react-start/server"
import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon, DeliveryTruck01Icon } from "@hugeicons/core-free-icons"
import { SignInButton, SignUpButton } from "@clerk/tanstack-react-start"
import { desc, sql } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { items } from "@/lib/schema"
import { requireUser } from "@/lib/inventory"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ItemCard } from "@/components/ItemCard"
import { ScannerModal } from "@/components/ScannerModal"
import { SearchInput } from "@/components/SearchInput"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { InventoryItem } from "@/components/ItemEditModal"
import type { ItemStatus } from "@/lib/item-status"

const loadHome = createServerFn({ method: "GET" }).handler(async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return {
      signedIn: false as const,
      recentItems: [],
      stats: {
        statusCounts: [] as { status: string; count: number }[],
        movesToday: 0,
      },
    }
  }
  await requireUser()
  const db = getDb()

  const recentItems = await db
    .select()
    .from(items)
    .orderBy(desc(items.updatedAt))
    .limit(3)

  const statusCounts = await db
    .select({ status: items.status, count: sql<number>`count(*)::int` })
    .from(items)
    .groupBy(items.status)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const movesTodayResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
    .where(sql`${items.updatedAt} >= ${today}`)

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
  const totalCount = total[0]?.count ?? 0

  return {
    signedIn: true as const,
    recentItems,
    totalCount,
    stats: { statusCounts, movesToday: movesTodayResult[0]?.count || 0 },
  }
})

export const Route = createFileRoute("/")({
  loader: async () => loadHome(),
  component: HomeRoute,
})

function HomeRoute() {
  const data = Route.useLoaderData()
  return data.signedIn ? <SignedInView data={data} /> : <SignedOutView />
}

function SignedOutView() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-secondary p-4 text-foreground">
      <Card className="w-full max-w-md gap-6 p-8 [--card-spacing:--spacing(8)]">
        <div className="space-y-2 text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
            inventory-thingy
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground">
            Sign in to access your dashboard
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <SignInButton mode="modal">
            <Button className="h-11 w-full">Sign In</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline" className="h-11 w-full">
              Create Account
            </Button>
          </SignUpButton>
        </div>
      </Card>
    </main>
  )
}

type SignedInData = Extract<
  ReturnType<typeof Route.useLoaderData>,
  { signedIn: true }
>

function SignedInView({ data }: { data: SignedInData }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)

  const openScanner = () => setScannerOpen(true)
  const handleScanned = (code: string) => {
    setScannerOpen(false)
    navigate({ to: "/scan", search: { code } })
  }

  const { recentItems, totalCount, stats } = data
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
    navigate({ to: "/stock", search: { q: value } })
  }

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader onScanClick={openScanner} />

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

          <div className="flex gap-2">
            <SearchInput
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search live inventory..."
            />
            <Button
              variant="outline"
              size="icon-lg"
              onClick={openScanner}
              aria-label="Open scanner"
            >
              <HugeiconsIcon icon={Camera01Icon} size={20} strokeWidth={1.8} />
            </Button>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Recent Activity
              </h2>
              <Link
                to="/stock"
                className="inline-flex h-8 items-center px-2 text-xs font-medium text-muted-foreground hover:text-primary"
              >
                View all ({totalCount}) →
              </Link>
            </div>
            <div className="space-y-3">
              {recentItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No inventory items found. Add some in the Stock tab!
                  </p>
                </div>
              ) : (
                recentItems.map((item: InventoryItem) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() =>
                      navigate({ to: "/stock", search: { q: item.qrCode } })
                    }
                    size="sm"
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </section>
      <BottomNav active="home" />
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScanned}
      />
    </main>
  )
}
