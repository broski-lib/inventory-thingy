import { createFileRoute } from "@tanstack/react-router"
import type { StockSort, StockStatusFilter } from "@/lib/constants"
import {
  STOCK_SORTS,
  STOCK_STATUS_FILTERS,
} from "@/lib/constants"
import { ITEM_CONDITIONS, ITEM_KINDS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemKind, ItemStatus } from "@/lib/item-status"
import { getStockPageData } from "@/lib/stock-page"
import { Skeleton } from "@/components/ui/skeleton"
import { parsePage, parsePageSize } from "@/lib/pagination"

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

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
  loader: async ({ deps }) => {
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
  return (
    <main className="min-h-svh bg-secondary pb-56 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
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
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}