import { createFileRoute } from "@tanstack/react-router"
import type { StockSort, StockStatusFilter } from "@/lib/constants"
import { STOCK_SORTS, STOCK_STATUS_FILTERS } from "@/lib/constants"
import { ITEM_CONDITIONS, ITEM_KINDS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemKind, ItemStatus } from "@/lib/item-status"
import { getStockPageData } from "@/lib/stock-page"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/AppHeader"
import { useCompactCards } from "@/hooks/use-compact-cards"
import { parsePage, parsePageSize } from "@/lib/pagination"

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

// Preload fetches the page shell only — the loader returns an empty but
// type-correct shape so the expensive stock query never runs in the
// background. Navigation discards it (preloadStaleTime 0) and loads real
// data.
const EMPTY_STOCK_DATA: Awaited<ReturnType<typeof getStockPageData>> = {
  page: {
    items: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 1,
  },
  allTags: [],
  locations: [],
  categoryTree: [],
  racks: [],
}

export type StockSearch = {
  q?: string
  page?: number
  ps?: number
  sf?: StockStatusFilter
  st?: ItemStatus[]
  cond?: ItemCondition[]
  loc?: string[]
  tags?: string[]
  cat?: string[]
  rack?: string[]
  sort?: StockSort
  kinds?: ItemKind[]
  /** CSV of selected item ids (bulk selection), persisted across nav. */
  sel?: string
}

function parseCsv(value: unknown): string[] | undefined {
  // Router may hand us a real array (typed navigate), a JSON array
  // string (serialized URL state), or a plain csv string.
  if (Array.isArray(value)) {
    const list = value.filter((v): v is string => typeof v === "string")
    return list.length > 0 ? list : undefined
  }
  if (typeof value !== "string" || value.trim() === "") return undefined
  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) {
        const list = parsed.filter((v): v is string => typeof v === "string")
        return list.length > 0 ? list : undefined
      }
    } catch {
      // fall through to csv parsing
    }
  }
  const list = value.split(",").filter(Boolean)
  return list.length > 0 ? list : undefined
}

function parseEnumCsv<T extends string>(
  value: unknown,
  allowed: readonly T[]
): T[] | undefined {
  const list = parseCsv(value)
  if (!list) return undefined
  const valid = list.filter((v): v is T => allowed.includes(v as T))
  return valid.length > 0 ? valid : undefined
}

function parseSort(value: unknown): StockSort | undefined {
  if (typeof value !== "string") return undefined
  return STOCK_SORTS.some((s) => s.id === value)
    ? (value as StockSort)
    : undefined
}

function parseStatusFilter(value: unknown): StockStatusFilter | undefined {
  if (typeof value !== "string") return undefined
  return (STOCK_STATUS_FILTERS as readonly string[]).includes(value)
    ? (value as StockStatusFilter)
    : undefined
}

export const Route = createFileRoute("/stock/")({
  staleTime: 0,
  preloadStaleTime: 0,
  // Avoid flashing the skeleton on fast filter/search responses.
  pendingMs: 120,
  pendingMinMs: 180,
  validateSearch: (search: Record<string, unknown>): StockSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    page: parsePage(search.page),
    ps: parsePageSize(search.ps, PAGE_SIZE_OPTIONS),
    sf: parseStatusFilter(search.sf),
    st: parseEnumCsv(search.st, ITEM_STATUSES),
    cond: parseEnumCsv(search.cond, ITEM_CONDITIONS),
    loc: parseCsv(search.loc),
    tags: parseCsv(search.tags),
    cat: parseCsv(search.cat),
    rack: parseCsv(search.rack),
    sort: parseSort(search.sort),
    kinds: parseEnumCsv(search.kinds, ITEM_KINDS),
    sel: typeof search.sel === "string" ? search.sel : undefined,
  }),
  loaderDeps: ({ search }) => ({
    q: search.q,
    page: search.page,
    ps: search.ps,
    sf: search.sf,
    st: search.st,
    cond: search.cond,
    loc: search.loc,
    tags: search.tags,
    cat: search.cat,
    rack: search.rack,
    sort: search.sort,
    kinds: search.kinds,
  }),
  loader: async (ctx) => {
    if (ctx.preload) return EMPTY_STOCK_DATA
    const { deps } = ctx
    return getStockPageData({
      data: {
        page: deps.page ?? 1,
        pageSize: deps.ps ?? DEFAULT_PAGE_SIZE,
        search: deps.q,
        statusFilter: deps.sf,
        statuses: deps.st,
        conditions: deps.cond,
        locations: deps.loc,
        tagIds: deps.tags,
        categoryIds: deps.cat,
        rackIds: deps.rack,
        sort: deps.sort,
        kinds: deps.kinds,
      },
    })
  },
  pendingComponent: StockPending,
})

function StockPending() {
  const [compactCards] = useCompactCards()
  return (
    <main className="min-h-svh bg-secondary pb-56 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AppHeader />
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-[72px]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-28" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <div className="space-y-3 pt-1">
            {Array.from({ length: compactCards ? 6 : 3 }).map((_, i) =>
              compactCards ? (
                <div
                  key={i}
                  className="flex h-20 items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <Skeleton className="size-14 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
