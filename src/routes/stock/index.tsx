import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import QRCode from "qrcode"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  CheckmarkCircle02Icon,
  Location01Icon,
  PrinterIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import {
  bulkDeleteItems,
  bulkUpdateLocation,
  bulkUpdateStatus,
  getItemsPage,
  STOCK_STATUS_FILTERS,
} from "@/lib/inventory"
import type { InventoryItem, StockStatusFilter } from "@/lib/inventory"
import type { ItemStatus } from "@/lib/item-status"
import { ITEM_STATUSES } from "@/lib/item-status"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ItemCard } from "@/components/ItemCard"
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
import { SearchInput } from "@/components/SearchInput"
import { Pagination } from "@/components/Pagination"
import { usePageSize } from "@/hooks/use-page-size"
import { cn } from "@/lib/utils"
import { parsePage } from "@/lib/pagination"

const PAGE_SIZE_STORAGE_KEY = "stock:pageSize"
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

type StockSearch = {
  q?: string
  page?: number
  ps?: number
}

function parsePageSize(value: unknown): number | undefined {
  const n = Number.parseInt(String(value ?? ""), 10)
  if (Number.isNaN(n)) return undefined
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : undefined
}

export const Route = createFileRoute("/stock/")({
  validateSearch: (search: Record<string, unknown>): StockSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    page: parsePage(search.page),
    ps: parsePageSize(search.ps),
  }),
  loaderDeps: ({ search }) => ({
    q: search.q,
    page: search.page,
    ps: search.ps,
  }),
  loader: async ({ deps }) => {
    return getItemsPage({
      data: {
        page: deps.page ?? 1,
        pageSize: deps.ps ?? DEFAULT_PAGE_SIZE,
        search: deps.q,
      },
    })
  },
  component: StockRoute,
})

type BulkPanel = "status" | "location" | "print" | "delete" | null

function StockRoute() {
  const navigate = useNavigate()
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const page = search.page ?? 1
  const q = search.q ?? ""

  const [pageSize, setPageSize, syncPageSizeFromUrl] = usePageSize(
    PAGE_SIZE_STORAGE_KEY,
    DEFAULT_PAGE_SIZE
  )
  const [searchInput, setSearchInput] = useState(q)
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>("All")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPanel, setBulkPanel] = useState<BulkPanel>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>("Available")
  const [bulkLocation, setBulkLocation] = useState("")
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)

  useEffect(() => {
    syncPageSizeFromUrl(search.ps)
  }, [search.ps, syncPageSizeFromUrl])

  useEffect(() => {
    return () => {
      setSelectionMode(false)
      setSelectedIds(new Set())
      setBulkPanel(null)
    }
  }, [])

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    if (searchInput === q) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigate({
        to: "/stock",
        search: { q: searchInput || undefined, page: 1, ps: search.ps },
        replace: true,
      })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput, q, navigate, search.ps])

  const handleStatusFilterChange = (filter: StockStatusFilter) => {
    if (filter === statusFilter) return
    setStatusFilter(filter)
    navigate({
      to: "/stock",
      search: { q: q || undefined, page: 1, ps: search.ps },
      replace: true,
    })
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    navigate({
      to: "/stock",
      search: { q: q || undefined, page: 1, ps: newSize },
      replace: true,
    })
  }

  const handleClearFilters = () => {
    setSearchInput("")
    setStatusFilter("All")
    navigate({
      to: "/stock",
      search: { q: undefined, page: 1, ps: search.ps },
      replace: true,
    })
  }

  const setPage = (newPage: number) => {
    navigate({
      to: "/stock",
      search: { q: q || undefined, page: newPage, ps: search.ps },
      replace: true,
    })
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

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

  const refreshData = () => {
    navigate({
      to: "/stock",
      search: { q: q || undefined, page, ps: search.ps },
      replace: true,
    })
  }

  /**
   * Close the active panel and show a transient confirmation.
   * Selection mode stays on; the user can chain another action.
   */
  const finishAction = (text: string) => {
    setBulkPanel(null)
    setBulkMessage(text)
    refreshData()
  }

  const handleBulkDelete = async () => {
    if (selectedArray.length === 0) return
    setBulkBusy(true)
    try {
      await bulkDeleteItems({ data: selectedArray })
      // Drop the deleted ids from the selection and clear the panel.
      setSelectedIds(new Set())
      setBulkPanel(null)
      finishAction(
        `Deleted ${selectedArray.length} item${selectedArray.length === 1 ? "" : "s"}`
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
      const result = await bulkUpdateStatus({
        data: { ids: selectedArray, status: bulkStatus },
      })
      finishAction(
        `Updated ${result.updated} item${result.updated === 1 ? "" : "s"} to ${bulkStatus}`
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
      const result = await bulkUpdateLocation({
        data: { ids: selectedArray, location },
      })
      setBulkLocation("")
      finishAction(
        `Moved ${result.updated} item${result.updated === 1 ? "" : "s"} to ${location}`
      )
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Bulk update failed")
    } finally {
      setBulkBusy(false)
    }
  }

  const handleBulkPrint = async () => {
    if (selectedArray.length === 0) return
    const targets = data.items.filter((it) => selectedIds.has(it.id))
    if (targets.length === 0) return
    setBulkBusy(true)
    try {
      const encoded = await Promise.all(
        targets.map(async (item) => ({
          name: item.name,
          qrCode: item.qrCode,
          dataUrl: await QRCode.toDataURL(item.qrCode, {
            width: 200,
            margin: 1,
          }),
        }))
      )
      const w = window.open("", "_blank", "width=820,height=1000")
      if (!w) {
        setBulkMessage("Pop-up blocked. Allow pop-ups to print QR codes.")
        return
      }
      w.document.write(PRINT_HTML(encoded))
      w.document.close()
      finishAction(
        `Print sheet opened for ${targets.length} item${targets.length === 1 ? "" : "s"}`
      )
    } catch (err) {
      setBulkMessage(err instanceof Error ? err.message : "Print failed")
    } finally {
      setBulkBusy(false)
    }
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

  const selectedCount = selectedIds.size
  const pageSizeForPagination = search.ps ?? DEFAULT_PAGE_SIZE

  return (
    <main className="min-h-svh bg-secondary pb-40 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader />

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {selectionMode ? "Select items" : "Inventory Manager"}
            </h2>
            {selectionMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={exitSelectionMode}
                className="h-9"
              >
                Done
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => enterSelectionMode()}
                  disabled={data.items.length === 0}
                  className="h-9"
                >
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    size={14}
                    strokeWidth={1.8}
                  />
                  Select
                </Button>
                <Link
                  to="/stock/new"
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "h-9"
                  )}
                >
                  <PlusIcon />
                  Add Item
                </Link>
              </div>
            )}
          </div>

          {!selectionMode && (
            <>
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
                onChange={setSearchInput}
                placeholder="Search tag, piece name, project..."
              />
            </>
          )}

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

          {!selectionMode && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                {data.total === 0
                  ? "Showing 0 items"
                  : `Showing ${data.total} ${data.total === 1 ? "item" : "items"}`}
              </p>
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
                {filteredItems.map((item) => (
                  <SelectionAwareCard
                    key={item.id}
                    item={item}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(item.id)}
                    onEdit={() =>
                      navigate({
                        to: "/stock/$id/edit",
                        params: { id: item.id },
                      })
                    }
                    onToggle={() => toggleSelected(item.id)}
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
      <BottomNav active="stock" />

      {selectionMode && (
        <BulkActionBar
          selectedCount={selectedCount}
          onClear={clearSelection}
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

function SelectionAwareCard({
  item,
  selectionMode,
  selected,
  onEdit,
  onToggle,
}: {
  item: InventoryItem
  selectionMode: boolean
  selected: boolean
  onEdit: () => void
  onToggle: () => void
}) {
  if (selectionMode) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-stretch gap-3 rounded-xl border p-3 text-left shadow-xs transition-all",
          selected
            ? "border-primary bg-accent"
            : "border-border bg-card hover:border-primary"
        )}
      >
        <SelectionCheckbox selected={selected} />
        <ItemCard item={item} size="md" onEdit={onEdit} />
      </button>
    )
  }
  return <ItemCard item={item} size="md" onEdit={onEdit} />
}

function SelectionCheckbox({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card"
      )}
    >
      {selected && (
        <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} />
      )}
    </span>
  )
}

function BulkActionBar({
  selectedCount,
  onClear,
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
    <div className="fixed inset-x-0 bottom-20 z-30 border-t border-border bg-background/95 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur">
      {panel === "status" && (
        <div className="mx-auto flex max-w-md items-center gap-2 border-b border-border px-3 py-2">
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
        <div className="mx-auto flex max-w-md items-center gap-2 border-b border-border px-3 py-2">
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
        <div className="mx-auto flex max-w-md items-center gap-2 border-b border-destructive/30 bg-destructive/5 px-3 py-2">
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

      <div className="mx-auto flex max-w-md items-center px-2 py-2">
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
        "flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

type PrintableQR = { name: string; qrCode: string; dataUrl: string }

function PRINT_HTML(items: PrintableQR[]) {
  return `<!doctype html>
<html>
<head>
  <title>QR Tag Sheet (${items.length})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #000; background: #fff; padding: 12px; }
    h1 { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .cell { border: 1px dashed #000; padding: 8px; text-align: center; break-inside: avoid; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .cell img { width: 100%; max-width: 140px; height: auto; aspect-ratio: 1 / 1; }
    .name { font-size: 9px; font-weight: 700; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .code { font-size: 8px; letter-spacing: 0.04em; color: #444; font-family: ui-monospace, monospace; }
    .meta { font-size: 8px; color: #666; margin-top: 2px; }
    @page { size: letter; margin: 0.4in; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>QR Tag Sheet — ${items.length} item${items.length === 1 ? "" : "s"}</h1>
  <div class="grid">
    ${items
      .map(
        (item) => `
      <div class="cell">
        <img src="${item.dataUrl}" alt="QR for ${escapeHtml(item.qrCode)}" />
        <div class="name">${escapeHtml(item.name)}</div>
        <div class="code">${escapeHtml(item.qrCode)}</div>
      </div>
    `
      )
      .join("")}
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 200);
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`
}
