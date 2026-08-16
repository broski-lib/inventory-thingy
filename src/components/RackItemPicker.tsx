import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon, FilterIcon } from "@hugeicons/core-free-icons"
import { getItemsPage } from "@/lib/inventory"
import type { InventoryItemWithTags } from "@/lib/inventory"
import { ITEM_CONDITIONS, ITEM_KINDS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemKind, ItemStatus } from "@/lib/item-status"
import { DEFAULT_STOCK_SORT, STOCK_SORTS } from "@/lib/constants"
import type { StockSort } from "@/lib/constants"
import type { CategoryTreeNode } from "@/lib/categories"
import type { Tag } from "@/lib/tags"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { SearchInput } from "@/components/SearchInput"
import { CategoryPicker } from "@/components/CategoryPicker"
import { TagPicker } from "@/components/TagPicker"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 100

type PickerFilters = {
  statuses: ItemStatus[]
  conditions: ItemCondition[]
  locations: string[]
  categories: string[]
  kinds: ItemKind[]
  tags: string[]
  sort: StockSort
}

const DEFAULT_FILTERS: PickerFilters = {
  statuses: [],
  conditions: [],
  locations: [],
  categories: [],
  kinds: [],
  tags: [],
  sort: DEFAULT_STOCK_SORT,
}

/** Minimal item shape for the pinned (already-on-rack) section. */
export type RackPinnedItem = {
  id: string
  name: string
  qrCode: string
  imageUrl: string
  kind: ItemKind
}

export type RackItemPickerProps = {
  selectedIds: Set<string>
  onToggle: (id: string) => void
  /**
   * Items already on the rack. Pinned to the top of the list (outside the
   * search/filter results) so saved items are always visible for removal,
   * and excluded from the searchable results below.
   */
  pinnedItems?: RackPinnedItem[]
  locations: string[]
  categoryTree: CategoryTreeNode[]
  allTags: Tag[]
}

/**
 * Searchable, filterable item list for picking items onto a rack.
 * Mirrors the stock page's filters (status, condition, location, kind,
 * category, tags, sort). Supports both unit and bulk items so racks can
 * hold single items like rugs.
 */
export function RackItemPicker({
  selectedIds,
  onToggle,
  pinnedItems,
  locations,
  categoryTree,
  allTags,
}: RackItemPickerProps) {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<PickerFilters>(DEFAULT_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState<PickerFilters>(DEFAULT_FILTERS)

  const [items, setItems] = useState<InventoryItemWithTags[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestIdRef = useRef(0)

  // Debounce the search box like the stock page.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const queryKey = useMemo(
    () => JSON.stringify({ search, ...filters }),
    [search, filters]
  )

  useEffect(() => {
    let cancelled = false
    const id = ++requestIdRef.current
    setLoading(true)
    setItems([])
    setTotal(0)
    setPage(1)
    getItemsPage({
      data: {
        page: 1,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        statuses: filters.statuses,
        conditions: filters.conditions,
        locations: filters.locations,
        categoryIds: filters.categories,
        tagIds: filters.tags,
        kinds: filters.kinds,
        sort: filters.sort,
      },
    })
      .then((res) => {
        if (cancelled || id !== requestIdRef.current) return
        setItems(res.items)
        setTotal(res.total)
      })
      .finally(() => {
        if (!cancelled && id === requestIdRef.current) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [queryKey])

  const loadMore = () => {
    if (loading || loadingMore || items.length >= total) return
    const id = requestIdRef.current
    setLoadingMore(true)
    getItemsPage({
      data: {
        page: page + 1,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        statuses: filters.statuses,
        conditions: filters.conditions,
        locations: filters.locations,
        categoryIds: filters.categories,
        tagIds: filters.tags,
        kinds: filters.kinds,
        sort: filters.sort,
      },
    })
      .then((res) => {
        if (id !== requestIdRef.current) return
        setItems((prev) => {
          const seen = new Set(prev.map((it) => it.id))
          return [...prev, ...res.items.filter((it) => !seen.has(it.id))]
        })
        setPage((p) => p + 1)
      })
      .finally(() => setLoadingMore(false))
  }

  const openFilterSheet = () => {
    setDraft({ ...filters })
    setFilterOpen(true)
  }

  const applyDraft = () => {
    setFilters({ ...draft })
    setFilterOpen(false)
  }

  const toggleDraftValue = (
    key: "statuses" | "conditions" | "locations" | "kinds" | "tags",
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
    filters.statuses.length +
    filters.conditions.length +
    filters.locations.length +
    filters.categories.length +
    filters.kinds.length +
    filters.tags.length +
    (filters.sort !== DEFAULT_STOCK_SORT ? 1 : 0)

  // The quick status select only represents a single status; fall back to a
  // placeholder when the drawer has a multi-status filter applied.
  const statusFilter =
    filters.statuses.length <= 1 ? (filters.statuses[0] ?? "") : ""

  const pinnedIds = useMemo(
    () => new Set(pinnedItems?.map((p) => p.id) ?? []),
    [pinnedItems]
  )
  const hasPinned = pinnedItems != null && pinnedItems.length > 0
  // On-rack items are pinned above and must not repeat in search results.
  const visibleItems = useMemo(
    () => items.filter((it) => !pinnedIds.has(it.id)),
    [items, pinnedIds]
  )

  const renderRow = (item: RackPinnedItem) => {
    const selected = selectedIds.has(item.id)
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onToggle(item.id)}
        aria-pressed={selected}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-accent/50",
          selected && "bg-primary/[0.04]"
        )}
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-md border",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background"
          )}
        >
          {selected && (
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-accent">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="size-full object-cover"
            />
          ) : (
            <HugeiconsIcon
              icon={BoxIcon}
              size={18}
              strokeWidth={1.5}
              className="text-primary"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">
            {item.name}
          </span>
          <span className="block truncate font-mono text-[10px] text-muted-foreground">
            {item.qrCode}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <Badge
            variant={item.kind === "bulk" ? "neutral" : "outline"}
            className="text-[9px]"
          >
            {item.kind === "bulk" ? "Bulk" : "Single"}
          </Badge>
        </span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search name, code, location..."
        />
        <Button
          type="button"
          variant={activeFilterCount > 0 ? "default" : "outline"}
          size="sm"
          onClick={openFilterSheet}
          className="h-11 shrink-0"
          aria-label="Filters"
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
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              statuses: v ? [v as ItemStatus] : [],
            }))
          }
        >
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {ITEM_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="shrink-0 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          {total} {total === 1 ? "item" : "items"}
        </p>
      </div>

      {hasPinned && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <p className="border-b border-border bg-muted/50 px-3 py-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            On this rack &middot; {pinnedItems.length}{" "}
            {pinnedItems.length === 1 ? "item" : "items"}
          </p>
          {pinnedItems.map((item) => renderRow(item))}
        </div>
      )}

      {hasPinned && !loading && visibleItems.length > 0 && (
        <p className="pt-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Other items
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-xs text-muted-foreground">
            {hasPinned
              ? "No other items match your filters."
              : "No items match your filters."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchInput("")
              setSearch("")
              setFilters(DEFAULT_FILTERS)
            }}
            className="mt-2 cursor-pointer text-xs font-semibold text-primary hover:underline"
          >
            Reset search & filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          {visibleItems.map((item) => renderRow(item))}
          {items.length < total && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
              className="h-11 rounded-none text-xs"
            >
              {loadingMore
                ? "Loading..."
                : `Load more (${total - items.length} remaining)`}
            </Button>
          )}
        </div>
      )}

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
                    selected={draft.statuses.includes(s)}
                    onClick={() => toggleDraftValue("statuses", s)}
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
                    selected={draft.conditions.includes(c)}
                    onClick={() => toggleDraftValue("conditions", c)}
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
                      selected={draft.locations.includes(loc)}
                      onClick={() => toggleDraftValue("locations", loc)}
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

            <FilterSection label="Category">
              <CategoryPicker
                tree={categoryTree}
                value={draft.categories[0] ?? null}
                onChange={(id) =>
                  setDraft((prev) => ({
                    ...prev,
                    categories: id ? [id] : [],
                  }))
                }
                mode="filter"
              />
            </FilterSection>

            <FilterSection label="Tags">
              <TagPicker
                tags={allTags}
                selectedIds={draft.tags}
                onToggle={(id) => toggleDraftValue("tags", id)}
              />
            </FilterSection>
          </DrawerBody>
          <DrawerFooter className="flex-row gap-4 p-4 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))]">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDraft({ ...DEFAULT_FILTERS })}
            >
              Clear
            </Button>
            <Button type="button" className="flex-1" onClick={applyDraft}>
              Apply filters
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function FilterSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </h3>
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
