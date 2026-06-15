import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import {
  createItem,
  deleteItem,
  getItems,
  requireUser,
  updateItem,
} from "@/lib/inventory"
import { requireAuth } from "@/lib/auth-guard"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ItemCard } from "@/components/ItemCard"
import { ItemEditModal } from "@/components/ItemEditModal"
import { ItemCreateModal } from "@/components/ItemCreateModal"
import { QRTagModal } from "@/components/QRTagModal"
import { PlusIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/SearchInput"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import type { InventoryItem } from "@/components/ItemEditModal"

const loadStock = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser()
  const items = await getItems()
  return { items }
})

type StockSearch = {
  q?: string
}

export const Route = createFileRoute("/stock")({
  validateSearch: (search: Record<string, unknown>): StockSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  beforeLoad: async () => {
    await requireAuth()
  },
  loader: async () => loadStock(),
  component: StockRoute,
})

const STATUS_FILTERS = ["All", "Available", "Staged", "Repair"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

function matchesStatusFilter(
  item: InventoryItem,
  filter: StatusFilter
): boolean {
  if (filter === "All") return true
  if (filter === "Available")
    return item.status === "Available" || item.status === "In Storage"
  if (filter === "Staged")
    return item.status === "Staged" || item.status === "Reserved"
  return item.status === filter
}

function StockRoute() {
  const { items: initialItems } = Route.useLoaderData()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [items, setItems] = useState<InventoryItem[]>(
    initialItems as InventoryItem[]
  )
  const [searchInput, setSearchInput] = useState(search.q ?? "")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null)

  useEffect(() => {
    setSearchInput(search.q ?? "")
  }, [search.q])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    navigate({ to: "/stock", search: { q: value || undefined }, replace: true })
  }

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    return items.filter((item) => {
      if (!matchesStatusFilter(item, statusFilter)) return false
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        item.qrCode.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    })
  }, [items, statusFilter, searchInput])

  const refresh = async () => {
    const next = await getItems()
    setItems(next)
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
        <AppHeader onScanClick={() => navigate({ to: "/scan" })} />

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Inventory Manager</h2>
            <Button onClick={() => setCreateOpen(true)} className="h-9">
              <PlusIcon />
              Add Item
            </Button>
          </div>

          <div className="-mx-4 flex scrollbar-none gap-1.5 overflow-x-auto px-4 pb-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
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
            Showing {filtered.length} of {items.length} items
          </p>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-xs text-muted-foreground">
                  No items match your filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("")
                    setStatusFilter("All")
                    navigate({
                      to: "/stock",
                      search: { q: undefined },
                      replace: true,
                    })
                  }}
                  className="mt-2 cursor-pointer text-xs font-semibold text-primary hover:underline"
                >
                  Reset Search & Filters
                </button>
              </div>
            ) : (
              filtered.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  size="md"
                  onClick={(it) => setEditItem(it)}
                  onLongPress={(it) => setQrItem(it)}
                />
              ))
            )}
          </div>
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
