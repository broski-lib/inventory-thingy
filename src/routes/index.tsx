import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { auth } from "@clerk/tanstack-react-start/server"
import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon, DeliveryTruck01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { SignInButton, SignUpButton } from "@clerk/tanstack-react-start"
import { desc, sql } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { items } from "@/lib/schema"
import { requireUser } from "@/lib/inventory"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ItemCard } from "@/components/ItemCard"
import { ScannerModal } from "@/components/ScannerModal"
import { Button } from "@/components/ui/button"
import type { InventoryItem } from "@/components/ItemEditModal"
import type { ItemStatus } from "@/lib/item-status"

const loadHome = createServerFn({ method: "GET" }).handler(async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return {
      signedIn: false as const,
      recentItems: [],
      stats: { statusCounts: [] as { status: string; count: number }[], movesToday: 0 },
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

  const total = await db.select({ count: sql<number>`count(*)::int` }).from(items)
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
    <main className="min-h-svh bg-[#f7f8f4] text-[#20231f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#dfe3dc] rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-[0.2em] text-[#6d7569] uppercase">inventory-thingy</p>
          <h2 className="text-3xl font-semibold mt-2 tracking-tight">Welcome back</h2>
          <p className="text-sm text-[#6d7569] mt-2">Sign in to access your dashboard</p>
        </div>
        <div className="flex flex-col gap-3">
          <SignInButton mode="modal">
            <Button className="w-full h-11 rounded-lg bg-[#23312b] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#1a2520] transition-colors cursor-pointer">
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button
              variant="outline"
              className="w-full h-11 rounded-lg border-[#dfe3dc] text-[#23312b] font-semibold uppercase tracking-wider text-xs hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Create Account
            </Button>
          </SignUpButton>
        </div>
      </div>
    </main>
  )
}

type SignedInData = Extract<ReturnType<typeof Route.useLoaderData>, { signedIn: true }>

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
        (statuses as readonly string[]).includes(sc.status),
      )
      .reduce((sum: number, sc: { status: string; count: number }) => sum + sc.count, 0)
  const availableCount = getCount(["Available", "In Storage"])
  const stagedCount = getCount(["Staged", "Reserved"])
  const repairCount = getCount(["Repair"])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    navigate({ to: "/stock", search: { q: e.target.value } })
  }

  return (
    <main className="min-h-svh bg-[#f7f8f4] text-[#20231f] pb-24">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader onScanClick={openScanner} />

        <div className="space-y-5 mt-5">
          <div className="rounded-lg bg-[#23312b] p-4 text-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/70">Today</p>
                <p className="mt-1 text-3xl font-semibold">{stats.movesToday} updates</p>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <HugeiconsIcon icon={DeliveryTruck01Icon} size={28} strokeWidth={1.6} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-md bg-white/10 p-2 text-center">
                <p className="text-lg font-semibold">{availableCount}</p>
                <p className="truncate text-[10px] text-white/70">Available</p>
              </div>
              <div className="rounded-md bg-white/10 p-2 text-center">
                <p className="text-lg font-semibold">{stagedCount}</p>
                <p className="truncate text-[10px] text-white/70">Staged/Res</p>
              </div>
              <div className="rounded-md bg-white/10 p-2 text-center">
                <p className="text-lg font-semibold">{repairCount}</p>
                <p className="truncate text-[10px] text-white/70">Repair</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dfe3dc] bg-white px-3 text-sm shadow-sm focus-within:border-[#23312b] transition-all">
              <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} className="text-[#687064]" />
              <input
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8a9285]"
                placeholder="Search live inventory..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </label>
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-lg bg-white border-[#dfe3dc] hover:bg-neutral-50 cursor-pointer"
              onClick={openScanner}
              aria-label="Open scanner"
            >
              <HugeiconsIcon icon={Camera01Icon} size={20} strokeWidth={1.8} />
            </Button>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#20231f]">Recent Activity</h2>
              <Link
                to="/stock"
                className="h-8 px-2 text-xs font-medium text-[#6d7569] hover:text-[#23312b] inline-flex items-center"
              >
                View all ({totalCount}) →
              </Link>
            </div>
            <div className="space-y-3">
              {recentItems.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-[#dfe3dc] rounded-xl bg-white">
                  <p className="text-xs text-[#6d7569]">No inventory items found. Add some in the Stock tab!</p>
                </div>
              ) : (
                recentItems.map((item: InventoryItem) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => navigate({ to: "/stock", search: { q: item.qrCode } })}
                    size="sm"
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </section>
      <BottomNav active="home" />
      <ScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleScanned} />
    </main>
  )
}
