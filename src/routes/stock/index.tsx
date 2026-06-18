import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { getItemsPage, STOCK_STATUS_FILTERS } from "@/lib/inventory"
import type { StockStatusFilter } from "@/lib/inventory"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ItemCard } from "@/components/ItemCard"
import { PlusIcon } from "@/components/icons"
import { buttonVariants } from "@/components/ui/button"
import { SearchInput } from "@/components/SearchInput"
import { Pagination } from "@/components/Pagination"
import { cn } from "@/lib/utils"
import { parsePage } from "@/lib/pagination"

const PAGE_SIZE = 20

type StockSearch = {
  q?: string
  page?: number
}

export const Route = createFileRoute("/stock/")({
  validateSearch: (search: Record<string, unknown>): StockSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    page: parsePage(search.page),
  }),
  loaderDeps: ({ search }) => ({ q: search.q, page: search.page }),
  loader: async ({ deps }) => {
    return getItemsPage({
      data: {
        page: deps.page ?? 1,
        pageSize: PAGE_SIZE,
        search: deps.q,
      },
    })
  },
  component: StockRoute,
})

function StockRoute() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const page = search.page ?? 1
  const q = search.q ?? ""

  const [searchInput, setSearchInput] = useState(q)
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("All")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    if (searchInput === q) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        to: "/stock",
        search: { q: searchInput || undefined, page: 1 },
        replace: true,
      })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput, q, navigate])

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

  const filteredItems =
    statusFilter === "All"
      ? data.items
      : data.items.filter((it) => {
          if (statusFilter === "Available")
            return it.status === "Available" || it.status === "In Storage"
          if (statusFilter === "Staged")
            return it.status === "Staged" || it.status === "Reserved"
          return it.status === statusFilter
        })

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

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader />

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Inventory Manager</h2>
            <Link
              to="/stock/new"
              className={cn(buttonVariants({ variant: "default" }), "h-9")}
            >
              <PlusIcon />
              Add Item
            </Link>
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
            {data.total === 0
              ? "Showing 0 items"
              : `Showing ${data.total} ${data.total === 1 ? "item" : "items"}`}
          </p>

          <div className="space-y-3">
            {data.items.length === 0 ? (
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
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    size="md"
                    onEdit={() =>
                      navigate({
                        to: "/stock/$id/edit",
                        params: { id: item.id },
                      })
                    }
                  />
                ))}
              </>
            )}
          </div>

          {data.total > 0 && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>
      </section>
      <BottomNav active="stock" />
    </main>
  )
}
