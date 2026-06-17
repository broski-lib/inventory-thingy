import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  createItem,
  deleteItem,
  getItemsPage,
  STOCK_STATUS_FILTERS,
  updateItem,
} from "@/lib/inventory"
import type { StockStatusFilter } from "@/lib/inventory"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ItemCard } from "@/components/ItemCard"
import { ItemEditModal } from "@/components/ItemEditModal"
import { ItemCreateModal } from "@/components/ItemCreateModal"
import { QRTagModal } from "@/components/QRTagModal"
import { PlusIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/SearchInput"
import { Pagination } from "@/components/Pagination"
import { ItemCardSkeleton } from "@/components/ItemCardSkeleton"
import { cn } from "@/lib/utils"
import { parsePage } from "@/lib/pagination"
import { useEffect, useRef, useState } from "react"
import type { InventoryItem } from "@/components/ItemEditModal"

const PAGE_SIZE = 20

type StockSearch = {
  q?: string
  page?: number
}

export const Route = createFileRoute("/stock")({
  validateSearch: (search: Record<string, unknown>): StockSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    page: parsePage(search.page),
  }),
  component: StockRoute,
})

function StockRoute() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const page = search.page ?? 1
  const q = search.q ?? ""

  const [searchInput, setSearchInput] = useState(q)
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("All")
  const [items, setItems] = useState<InventoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null)
  const reqIdRef = useRef(0)

  // Sync search input from URL on external nav
  useEffect(() => {
    setSearchInput(q)
  }, [q])

  // Debounce search input → URL (resets to page 1)
  useEffect(() => {
    if (searchInput === q) return
    const handle = setTimeout(() => {
      navigate({
        to: "/stock",
        search: { q: searchInput || undefined, page: 1 },
        replace: true,
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput, q, navigate])

  // Fetch page on URL/state changes
  useEffect(() => {
    const reqId = ++reqIdRef.current
    setLoading(true)
    void fetchPage(reqId)
  }, [page, q, statusFilter])

  const setPage = (newPage: number) => {
    navigate({
      to: "/stock",
      search: { q: q || undefined, page: newPage },
      replace: true,
    })
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleStatusFilterChange = (filter: StockStatusFilter) => {
    if (filter === statusFilter) return
    setStatusFilter(filter)
    if (page !== 1) {
      navigate({
        to: "/stock",
        search: { q: q || undefined, page: 1 },
        replace: true,
      })
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  const handleClearFilters = () => {
    setSearchInput("")
    setStatusFilter("All")
    navigate({ to: "/stock", search: { q: undefined, page: 1 }, replace: true })
  }

  const fetchPage = async (reqId: number) => {
    setError(null)
    try {
      const result = await getItemsPage({
        data: { page, pageSize: PAGE_SIZE, search: q, statusFilter },
      })
      if (reqId !== reqIdRef.current) return
      setItems(result.items)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      if (reqId !== reqIdRef.current) return
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to load items")
      setItems([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      if (reqId === reqIdRef.current) setLoading(false)
    }
  }

  const refresh = () => {
    const reqId = ++reqIdRef.current
    setLoading(true)
    return fetchPage(reqId)
  }

  const retry = () => {
    setError(null)
    return refresh()
  }

  const handleEdit = async (item: Partial<InventoryItem>) => {
    if (!editItem) return
    await updateItem({ data: { id: editItem.id, item } })
    setEditItem(null)
    await refresh()
  }

  const handleDelete = async (id: string) => {
    await deleteItem({ data: id })
    setEditItem(null)
    await refresh()
  }

  const handleCreate = async (
    item: Parameters<typeof createItem>[0]["data"]
  ) => {
    await createItem({ data: item })
    setCreateOpen(false)
    await refresh()
  }

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader />

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Inventory Manager</h2>
            <Button onClick={() => setCreateOpen(true)} className="h-9">
              <PlusIcon />
              Add Item
            </Button>
          </div>

          <div className="-mx-4 flex scrollbar-none gap-1.5 overflow-x-auto px-4 pb-1">
            {STOCK_STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleStatusFilterChange(filter)}
                className={cn(
                  "cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-bold tracking-wider whitespace-nowrap uppercase transition-all",
                  statusFilter === filter
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          <SearchInput
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search tag, piece name, project..."
          />

          <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            {loading && total === 0
              ? "Loading…"
              : `Showing ${total} ${total === 1 ? "item" : "items"}`}
          </p>

          <div className="space-y-3">
            {loading && items.length === 0 ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <ItemCardSkeleton key={i} />
                ))}
              </>
            ) : error ? (
              <div className="rounded-xl border border-dashed border-destructive/30 bg-card p-8 text-center">
                <p className="mb-2 text-xs text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={retry}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-xs text-muted-foreground">
                  No items match your filters.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-2 cursor-pointer text-xs font-semibold text-primary hover:underline"
                >
                  Reset Search & Filters
                </button>
              </div>
            ) : (
              <>
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    size="md"
                    onClick={(it) => setEditItem(it)}
                    onLongPress={(it) => setQrItem(it)}
                  />
                ))}
                {loading && (
                  <div className="flex justify-center py-2">
                    <span className="animate-pulse text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                      Loading…
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

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

      <BottomNav active="stock" />

      <ItemEditModal
        open={editItem !== null}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSubmit={handleEdit}
        onDelete={handleDelete}
      />
      <ItemCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      {qrItem && (
        <QRTagModal
          open
          onClose={() => setQrItem(null)}
          qrCode={qrItem.qrCode}
          itemName={qrItem.name}
          itemId={qrItem.id}
        />
      )}
    </main>
  )
}
