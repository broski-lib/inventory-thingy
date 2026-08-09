import {
  createFileRoute,
  useNavigate,
  useRouter,
  Link,
} from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  FilterIcon,
  Location01Icon,
  PrinterIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import {
  getItemsPage,
  getLocations,
} from "@/lib/inventory"
import type { StockSort, StockStatusFilter } from "@/lib/constants"
import {
  STOCK_SORTS,
  STOCK_STATUS_FILTERS,
  DEFAULT_STOCK_SORT,
} from "@/lib/constants"
import { ITEM_CONDITIONS, ITEM_KINDS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemKind, ItemStatus } from "@/lib/item-status"
import { listTags } from "@/lib/tags"
import type { Tag } from "@/lib/tags"
import {
  useBulkDeleteItems,
  useBulkUpdateStatus,
  useBulkUpdateLocation,
  useUpdateTag,
  useDeleteTag,
} from "@/lib/queries"
import { ColorPicker } from "@/components/ColorPicker"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { SelectionAwareCard } from "@/components/SelectionAwareCard"
import { TagPicker } from "@/components/TagPicker"
import { useCompactCards } from "@/components/ItemCard"
import { PlusIcon, TrashIcon } from "@/components/icons"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SearchInput } from "@/components/SearchInput"
import { Pagination } from "@/components/Pagination"
import { usePageSize } from "@/hooks/use-page-size"
import { cn } from "@/lib/utils"
import { parsePage } from "@/lib/pagination"
import { pluralize } from "@/lib/format"

const PAGE_SIZE_STORAGE_KEY = "stock:pageSize"
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

type StockSearch = {
  q?: string
  page?: number
  ps?: number
  sf?: StockStatusFilter
  st?: ItemStatus[]
  cond?: ItemCondition[]
  loc?: string[]
  tags?: string[]
  sort?: StockSort
  kinds?: ItemKind[]
}

function parsePageSize(value: unknown): number | undefined {
  const n = Number.parseInt(String(value ?? ""), 10)
  if (Number.isNaN(n)) return undefined
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : undefined
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

/** Shape the filter/sort search params, dropping empty values. */
function filterSearch(search: {
  sf?: StockStatusFilter
  st?: ItemStatus[]
  cond?: ItemCondition[]
  loc?: string[]
  tags?: string[]
  sort?: StockSort
  kinds?: ItemKind[]
}) {
  return {
    sf: search.sf && search.sf !== "All" ? search.sf : undefined,
    st: search.st && search.st.length > 0 ? search.st : undefined,
    cond: search.cond && search.cond.length > 0 ? search.cond : undefined,
    loc: search.loc && search.loc.length > 0 ? search.loc : undefined,
    tags: search.tags && search.tags.length > 0 ? search.tags : undefined,
    sort:
      search.sort && search.sort !== DEFAULT_STOCK_SORT
        ? search.sort
        : undefined,
    kinds: search.kinds && search.kinds.length > 0 ? search.kinds : undefined,
  }
}

export const Route = createFileRoute("/stock/")({
  staleTime: 0,
  validateSearch: (search: Record<string, unknown>): StockSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    page: parsePage(search.page),
    ps: parsePageSize(search.ps),
    sf: parseStatusFilter(search.sf),
    st: parseEnumCsv(search.st, ITEM_STATUSES),
    cond: parseEnumCsv(search.cond, ITEM_CONDITIONS),
    loc: parseCsv(search.loc),
    tags: parseCsv(search.tags),
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
    sort: search.sort,
    kinds: search.kinds,
  }),
  loader: async ({ deps }) => {
    const [page, allTags, locations] = await Promise.all([
      getItemsPage({
        data: {
          page: deps.page ?? 1,
          pageSize: deps.ps ?? DEFAULT_PAGE_SIZE,
          search: deps.q,
          statusFilter: deps.sf,
          statuses: deps.st,
          conditions: deps.cond,
          locations: deps.loc,
          tagIds: deps.tags,
          sort: deps.sort,
          kinds: deps.kinds,
        },
      }),
      listTags(),
      getLocations(),
    ])
    return { page, allTags, locations }
  },
  component: StockRoute,
})

type BulkPanel = "status" | "location" | "print" | "delete" | null

type DraftFilters = {
  st: ItemStatus[]
  cond: ItemCondition[]
  loc: string[]
  tags: string[]
  sort: StockSort
  kinds: ItemKind[]
}

function StockRoute() {
  const navigate = useNavigate()
  const router = useRouter()
  const { page: data, allTags, locations } = Route.useLoaderData()
  const search = Route.useSearch()
  const page = search.page ?? 1
  const q = search.q ?? ""
  const statusFilter: StockStatusFilter = search.sf ?? "All"
  const sort: StockSort = search.sort ?? DEFAULT_STOCK_SORT

  const bulkDeleteMutation = useBulkDeleteItems()
  const bulkUpdateStatusMutation = useBulkUpdateStatus()
  const bulkUpdateLocationMutation = useBulkUpdateLocation()

  const [pageSize, setPageSize] = usePageSize(
    PAGE_SIZE_STORAGE_KEY,
    DEFAULT_PAGE_SIZE,
    search.ps
  )

  // Keep URL and localStorage in sync. When they disagree, the URL wins
  // (explicit param) — but when the URL has no param, push the stored
  // value. Cross-tab storage events also trigger re-sync.
  useEffect(() => {
    const fromUrl = search.ps
    if (fromUrl !== undefined && fromUrl === pageSize) return
    if (fromUrl !== undefined) {
      // URL has a value that differs from localStorage — adopt URL value.
      setPageSize(fromUrl)
      return
    }
    // No ps param. Push the localStorage value to the URL.
    if (pageSize === DEFAULT_PAGE_SIZE) return
    navigate({
      to: "/stock",
      search: (prev) => ({ ...prev, ps: pageSize }),
      replace: true,
    })
  }, [search.ps, pageSize, DEFAULT_PAGE_SIZE, setPageSize, navigate])

  const [compactCards, setCompactCards] = useCompactCards()
  const [searchInput, setSearchInput] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter sheet state — drafts are applied on "Apply".
  const [filterOpen, setFilterOpen] = useState(false)
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [draft, setDraft] = useState<DraftFilters>({
    st: [],
    cond: [],
    loc: [],
    tags: [],
    sort: DEFAULT_STOCK_SORT,
    kinds: [],
  })

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPanel, setBulkPanel] = useState<BulkPanel>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>("Available")
  const [bulkLocation, setBulkLocation] = useState("")
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    if (searchInput === q) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        to: "/stock",
        search: (prev) => ({ ...prev, q: searchInput || undefined, page: 1 }),
        replace: true,
      })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput, q, navigate])

  const handleStatusFilterChange = (filter: StockStatusFilter) => {
    if (filter === statusFilter) return
    navigate({
      to: "/stock",
      search: (prev) => ({
        ...prev,
        sf: filter === "All" ? undefined : filter,
        page: 1,
      }),
      replace: true,
    })
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    navigate({
      to: "/stock",
      search: (prev) => ({ ...prev, page: 1, ps: newSize }),
      replace: true,
    })
  }

  const handleClearFilters = () => {
    setSearchInput("")
    navigate({
      to: "/stock",
      search: { ps: search.ps },
      replace: true,
    })
  }

  const setPage = (newPage: number) => {
    navigate({
      to: "/stock",
      search: (prev) => ({ ...prev, page: newPage }),
      replace: true,
    })
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const openFilterSheet = () => {
    setDraft({
      st: search.st ?? [],
      cond: search.cond ?? [],
      loc: search.loc ?? [],
      tags: search.tags ?? [],
      sort,
      kinds: search.kinds ?? [],
    })
    setFilterOpen(true)
  }

  const applyDraft = () => {
    navigate({
      to: "/stock",
      search: (prev) => ({ ...prev, ...filterSearch(draft), page: 1 }),
      replace: true,
    })
    setFilterOpen(false)
  }

  const toggleDraftValue = (
    key: "st" | "cond" | "loc" | "tags" | "kinds",
    value: string
  ) => {
    setDraft((prev) => {
      const list: string[] = prev[key]
      return {
        ...prev,
        [key]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      }
    })
  }

  const activeFilterCount =
    (search.st?.length ?? 0) +
    (search.cond?.length ?? 0) +
    (search.loc?.length ?? 0) +
    (search.tags?.length ?? 0) +
    (search.kinds?.length ?? 0) +
    (sort !== DEFAULT_STOCK_SORT ? 1 : 0)

  // ---- Selection logic ----

  const enterSelectionMode = (initialIds: string[] = []) => {
    setSelectionMode(true)
    setSelectedIds(new Set(initialIds))
    setBulkPanel(null)
    setBulkMessage(null)
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setBulkPanel(null)
    setBulkMessage(null)
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  const allOnPageSelected =
    data.items.length > 0 && data.items.every((it) => selectedIds.has(it.id))

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        for (const it of data.items) next.delete(it.id)
      } else {
        for (const it of data.items) next.add(it.id)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setBulkPanel(null)
  }

  const refreshData = () => router.invalidate()

  /**
   * Close the active panel and show a transient confirmation.
   * Selection mode stays on; the user can chain another action.
   */
  const finishAction = (text: string) => {
    setBulkPanel(null)
    setBulkMessage(text)
    refreshData()
  }

  /** Append a skip note when RBAC blocked part of a bulk action. */
  const skipNote = (skipped: number) =>
    skipped > 0 ? ` (${skipped} skipped — admin only)` : ""

  const handleBulkDelete = async () => {
    if (selectedArray.length === 0) return
    setBulkBusy(true)
    try {
      const result = await bulkDeleteMutation.mutateAsync(selectedArray)
      setSelectedIds(new Set())
      setBulkPanel(null)
      finishAction(
        `Deleted ${result.deleted} ${pluralize(result.deleted, "item")}${skipNote(result.skipped)}`
      )
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Bulk delete failed")
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkStatusApply = async () => {
    if (selectedArray.length === 0) return
    setBulkBusy(true)
    try {
      const result = await bulkUpdateStatusMutation.mutateAsync({
        ids: selectedArray,
        status: bulkStatus,
      })
      finishAction(
        `Updated ${result.updated} ${pluralize(result.updated, "item")} to ${bulkStatus}${skipNote(result.skipped)}`
      )
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Bulk update failed")
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkLocationApply = async () => {
    const location = bulkLocation.trim()
    if (selectedArray.length === 0 || !location) return
    setBulkBusy(true)
    try {
      const result = await bulkUpdateLocationMutation.mutateAsync({
        ids: selectedArray,
        location,
      })
      setBulkLocation("")
      finishAction(
        `Moved ${result.updated} ${pluralize(result.updated, "item")} to ${location}${skipNote(result.skipped)}`
      )
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Bulk update failed")
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkPrint = () => {
    if (selectedArray.length === 0) return
    const ids = selectedArray.join(",")
    navigate({ to: "/stock/print-bulk", search: { ids } })
    finishAction(
      `Print sheet opened for ${selectedArray.length} ${pluralize(selectedArray.length, "item")}`
    )
  }

  const selectedCount = selectedIds.size
  const pageSizeForPagination = search.ps ?? DEFAULT_PAGE_SIZE

  return (
    <main className="min-h-svh bg-secondary pb-56 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AppHeader />

        <div className="mt-2 space-y-3">
          {selectionMode && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Select items</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllOnPage}
                  disabled={data.items.length === 0}
                  className="h-9 text-xs"
                >
                  {allOnPageSelected ? "Clear All" : "Select All"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectionMode}
                  className="h-9"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          <div className={selectionMode ? "pointer-events-none opacity-40" : ""}>
            <div className="flex items-center gap-2">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search name, code, location..."
              />
              <Link
                to="/stock/new"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "h-9 shrink-0"
                )}
              >
                <PlusIcon />
                Add
              </Link>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  handleStatusFilterChange(v as StockStatusFilter)
                }
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_STATUS_FILTERS.map((filter) => (
                    <SelectItem key={filter} value={filter}>
                      {filter === "All" ? "All statuses" : filter}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={openFilterSheet}
                className="h-9 shrink-0"
              >
                <HugeiconsIcon icon={FilterIcon} size={14} strokeWidth={2} />
                {activeFilterCount > 0 ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-background text-[9px] font-bold text-foreground">
                    {activeFilterCount}
                  </span>
                ) : (
                  "Filters"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => enterSelectionMode()}
                disabled={data.items.length === 0}
                className="h-9 shrink-0 text-xs"
              >
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={14}
                  strokeWidth={1.8}
                />
                Select
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCompactCards((v) => !v)}
                className="h-9 w-[72px] shrink-0 text-xs text-muted-foreground"
              >
                {compactCards ? "Full" : "Compact"}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                {data.total === 0
                  ? "Showing 0 items"
                  : `Showing ${data.total} ${pluralize(data.total, "item")}`}
              </p>
              <div className="flex items-center gap-3">
                <Link
                  to="/stock/racks"
                  className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase hover:text-primary"
                >
                  Rack sheet
                </Link>
                <label className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                <span>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) =>
                    handlePageSizeChange(Number.parseInt(e.target.value, 10))
                  }
                  className="h-7 cursor-pointer rounded-md border border-border bg-card px-2 text-[11px] font-semibold tracking-wider text-foreground uppercase"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          </div>

          {selectionMode && data.items.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllOnPage}
              className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-sm border",
                  allOnPageSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background"
                )}
              >
                {allOnPageSelected && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className="size-3"
                    strokeWidth={3}
                  />
                )}
              </span>
              {allOnPageSelected ? "Deselect page" : "Select page"}
            </button>
          )}

          {bulkMessage && selectionMode && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              {bulkMessage}
            </div>
          )}

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
                {data.items.map((item, idx) => (
                  <SelectionAwareCard
                    key={item.id}
                    item={item}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(item.id)}
                    compact={compactCards}
                    priority={idx === 0}
                    onEdit={() =>
                      navigate({
                        to: "/stock/$id/edit",
                        params: { id: item.id },
                      })
                    }
                    onToggle={() => toggleSelected(item.id)}
                    onLongPress={(id) => enterSelectionMode([id])}
                  />
                ))}
              </>
            )}
          </div>

          {!selectionMode && data.total > 0 && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={pageSizeForPagination}
              onPageChange={setPage}
            />
          )}
        </div>
      </section>
      <BottomNav />

      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent onClose={() => setFilterOpen(false)}>
          <DrawerHeader>
            <DrawerTitle>Filters & Sort</DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="space-y-5 px-4">
            <FilterSection label="Sort by">
              <Select
                value={draft.sort}
                onValueChange={(v) =>
                  setDraft((prev) => ({ ...prev, sort: v as StockSort }))
                }
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue>
                    {(value: StockSort) =>
                      STOCK_SORTS.find((s) => s.id === value)?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STOCK_SORTS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection label="Status">
              <div className="flex flex-wrap gap-1.5">
                {ITEM_STATUSES.map((s) => (
                  <FilterPill
                    key={s}
                    label={s}
                    selected={draft.st.includes(s)}
                    onClick={() => toggleDraftValue("st", s)}
                  />
                ))}
              </div>
            </FilterSection>

            <FilterSection label="Condition">
              <div className="flex flex-wrap gap-1.5">
                {ITEM_CONDITIONS.map((c) => (
                  <FilterPill
                    key={c}
                    label={c}
                    selected={draft.cond.includes(c)}
                    onClick={() => toggleDraftValue("cond", c)}
                  />
                ))}
              </div>
            </FilterSection>

            <FilterSection label="Location">
              {locations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No locations yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {locations.map((loc) => (
                    <FilterPill
                      key={loc}
                      label={loc}
                      selected={draft.loc.includes(loc)}
                      onClick={() => toggleDraftValue("loc", loc)}
                    />
                  ))}
                </div>
              )}
            </FilterSection>

            <FilterSection label="Item kind">
              <div className="flex flex-wrap gap-1.5">
                {ITEM_KINDS.map((k) => (
                  <FilterPill
                    key={k}
                    label={k === "unit" ? "Single item" : "Bulk stock"}
                    selected={draft.kinds.includes(k)}
                    onClick={() => toggleDraftValue("kinds", k)}
                  />
                ))}
              </div>
            </FilterSection>

            <FilterSection
              label="Tags"
              action={
                <button
                  type="button"
                  onClick={() => setManageTagsOpen(true)}
                  className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
                >
                  Manage tags
                </button>
              }
            >
              <TagPicker
                tags={allTags}
                selectedIds={draft.tags}
                onToggle={(id) => toggleDraftValue("tags", id)}
              />
            </FilterSection>
          </DrawerBody>
          <DrawerFooter className="flex-row gap-2 p-4 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))]">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                  setDraft({
                    st: [],
                    cond: [],
                    loc: [],
                    tags: [],
                    sort: DEFAULT_STOCK_SORT,
                    kinds: [],
                  })
              }}
            >
              Clear
            </Button>
            <Button type="button" className="flex-1" onClick={applyDraft}>
              Apply filters
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ManageTagsDialog
        tags={allTags}
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        onChanged={() => router.invalidate()}
      />

      {selectionMode && (
        <BulkActionBar
          selectedCount={selectedCount}
          onClear={clearSelection}
          onDone={exitSelectionMode}
          panel={bulkPanel}
          setPanel={setBulkPanel}
          busy={bulkBusy}
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          bulkLocation={bulkLocation}
          setBulkLocation={setBulkLocation}
          onApplyStatus={handleBulkStatusApply}
          onApplyLocation={handleBulkLocationApply}
          onDelete={handleBulkDelete}
          onPrint={handleBulkPrint}
        />
      )}
    </main>
  )
}

function FilterSection({
  label,
  action,
  children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          {label}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function FilterPill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-xs"
          : "border-border bg-card text-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  )
}

function ManageTagsDialog({
  tags,
  open,
  onOpenChange,
  onChanged,
}: {
  tags: Tag[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {tags.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No tags yet. Create them from the item form or the tag picker.
            </p>
          )}
          {tags.map((tag) => (
            <ManageTagRow key={tag.id} tag={tag} onChanged={onChanged} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ManageTagRow({
  tag,
  onChanged,
}: {
  tag: Tag
  onChanged: () => void
}) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const updateTagMutation = useUpdateTag()
  const deleteTagMutation = useDeleteTag()

  const dirty = name.trim() !== tag.name || color !== tag.color

  const handleSave = async () => {
    if (!dirty || busy) return
    setBusy(true)
    setError(null)
    try {
      await updateTagMutation.mutateAsync({
        id: tag.id,
        name: name.trim() !== tag.name ? name.trim() : undefined,
        color: color !== tag.color ? color : undefined,
      })
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (busy) return
    if (!confirm(`Delete tag "${tag.name}"? Items keep no other change.`))
      return
    setBusy(true)
    setError(null)
    try {
      await deleteTagMutation.mutateAsync(tag.id)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-2">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="h-9 flex-1 text-base sm:text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleSave()}
          disabled={!dirty || busy || !name.trim()}
          className="h-9"
        >
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => void handleDelete()}
          disabled={busy}
          aria-label={`Delete tag ${tag.name}`}
          className="h-9"
        >
          <TrashIcon className="size-3.5" />
          Delete
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        <ColorPicker value={color} onChange={setColor} size="sm" />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

function BulkActionBar({
  selectedCount,
  onClear,
  onDone,
  panel,
  setPanel,
  busy,
  bulkStatus,
  setBulkStatus,
  bulkLocation,
  setBulkLocation,
  onApplyStatus,
  onApplyLocation,
  onDelete,
  onPrint,
}: {
  selectedCount: number
  onClear: () => void
  onDone: () => void
  panel: BulkPanel
  setPanel: (p: BulkPanel) => void
  busy: boolean
  bulkStatus: ItemStatus
  setBulkStatus: (s: ItemStatus) => void
  bulkLocation: string
  setBulkLocation: (s: string) => void
  onApplyStatus: () => void
  onApplyLocation: () => void
  onDelete: () => void
  onPrint: () => void
}) {
  const togglePanel = (next: Exclude<BulkPanel, null>) => {
    setPanel(panel === next ? null : next)
  }

  return (
    <div className="fixed inset-x-0 bottom-18 z-30 border-t border-border bg-background/95 backdrop-blur">
      {panel === "status" && (
        <div className="mx-auto flex max-w-md items-center gap-2 border-b border-border px-4 py-2">
          <Select
            value={bulkStatus}
            onValueChange={(v) => setBulkStatus(v as ItemStatus)}
          >
            <SelectTrigger size="sm" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={onApplyStatus}
            disabled={busy || selectedCount === 0}
          >
            Apply
          </Button>
        </div>
      )}
      {panel === "location" && (
        <div className="mx-auto flex max-w-md items-center gap-2 border-b border-border px-4 py-2">
          <Input
            value={bulkLocation}
            onChange={(e) => setBulkLocation(e.target.value)}
            placeholder="New location"
            className="h-9 flex-1"
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            onClick={onApplyLocation}
            disabled={busy || !bulkLocation.trim() || selectedCount === 0}
          >
            Apply
          </Button>
        </div>
      )}
      {panel === "delete" && (
        <div className="mx-auto flex max-w-md items-center gap-2 border-b border-destructive/30 bg-destructive/5 px-4 py-2">
          <span className="flex-1 text-xs font-semibold text-destructive">
            Delete {selectedCount} item{selectedCount === 1 ? "" : "s"}? This
            can&apos;t be undone.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPanel(null)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={busy}
          >
            Delete
          </Button>
        </div>
      )}

      <div className="mx-auto flex max-w-md items-center px-4 pt-2 pb-4">
        <span className="inline-flex shrink-0 items-center gap-1 px-1 text-xs font-semibold text-foreground">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={14}
            strokeWidth={1.8}
            className="text-primary"
          />
          {selectedCount}
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={selectedCount === 0}
          className="shrink-0 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDone}
          className="shrink-0 px-2 text-[11px] font-semibold tracking-wider text-primary uppercase hover:text-primary/80"
        >
          Done
        </button>
        <div className="ml-auto flex flex-1 items-center justify-end gap-1">
          <ActionIcon
            label="Location"
            icon={Location01Icon}
            active={panel === "location"}
            disabled={selectedCount === 0 || busy}
            onClick={() => togglePanel("location")}
          />
          <ActionIcon
            label="Status"
            icon={Tick02Icon}
            active={panel === "status"}
            disabled={selectedCount === 0 || busy}
            onClick={() => togglePanel("status")}
          />
          <ActionIcon
            label="Print QR"
            icon={PrinterIcon}
            active={panel === "print"}
            disabled={selectedCount === 0 || busy}
            onClick={onPrint}
          />
          <ActionIcon
            label="Delete"
            iconSvg={<TrashIcon className="size-4" />}
            active={panel === "delete"}
            tone="destructive"
            disabled={selectedCount === 0 || busy}
            onClick={() => togglePanel("delete")}
          />
        </div>
      </div>
    </div>
  )
}

function ActionIcon({
  label,
  icon,
  iconSvg,
  active,
  tone,
  disabled,
  onClick,
}: {
  label: string
  icon?: IconSvgElement
  iconSvg?: React.ReactNode
  active?: boolean
  tone?: "destructive"
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-lg border transition-colors",
        tone === "destructive"
          ? active
            ? "text-destructive-foreground border-destructive bg-destructive"
            : "border-border text-destructive hover:bg-destructive/10"
          : active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      {icon ? (
        <HugeiconsIcon icon={icon} size={16} strokeWidth={1.7} />
      ) : (
        iconSvg
      )}
    </button>
  )
}
