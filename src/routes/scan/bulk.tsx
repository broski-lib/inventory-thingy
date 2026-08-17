import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LiveScanner } from "@/components/LiveScanner"
import type { LiveScannerStatus } from "@/components/LiveScanner"
import { PageChrome } from "@/components/PageChrome"
import { LocationChips } from "@/components/LocationChips"
import {
  getItemById,
  getItemByQrCode,
  getMostCommonLocation,
  getLocations,
} from "@/lib/inventory"
import { loadScan } from "@/lib/scan-queries"
import { useMoveBatchQty, useUpdateItem } from "@/lib/queries"
import { ITEM_STATUSES } from "@/lib/item-status"
import type { ItemStatus } from "@/lib/item-status"

export const Route = createFileRoute("/scan/bulk")({
  loader: async () => {
    const [scan, locations] = await Promise.all([loadScan(), getLocations()])
    return { recent: scan.recent, locations }
  },
  component: BulkScanPage,
})

type BulkResult = {
  qrCode: string
  ok: boolean
  message: string
  itemName?: string
}

const BULK_LOCATION_KEY = "scan:bulk-location"

function loadPersistedLocation(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(BULK_LOCATION_KEY) || null
}

function persistLocation(value: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(BULK_LOCATION_KEY, value)
}

async function resolveDefaultLocation(): Promise<string> {
  const cached = loadPersistedLocation()
  if (cached) return cached
  try {
    const common = await getMostCommonLocation()
    if (common) {
      persistLocation(common)
      return common
    }
  } catch {
    // ignore — fall back to hardcoded default
  }
  const fallback = "Warehouse A, Bay 1"
  persistLocation(fallback)
  return fallback
}

function BulkScanPage() {
  const { recent, locations } = Route.useLoaderData()
  const navigate = useNavigate()
  const [status, setStatus] = useState<ItemStatus>("Reserved")
  const [location, setLocation] = useState("")
  const [scannerStatus, setScannerStatus] = useState<LiveScannerStatus>("idle")
  const [paused, setPaused] = useState(false)
  const [results, setResults] = useState<BulkResult[]>([])
  const [lastResult, setLastResult] = useState<BulkResult | null>(null)
  const [editingSettings, setEditingSettings] = useState(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateItemMutation = useUpdateItem()
  const moveBatchMutation = useMoveBatchQty()

  useEffect(() => {
    if (!editingSettings) persistLocation(location)
  }, [editingSettings, location])

  useEffect(() => {
    resolveDefaultLocation().then((loc) => {
      setLocation(loc)
    })
  }, [])

  const cameraReady = scannerStatus === "scanning" || scannerStatus === "paused"
  const successCount = results.filter((r) => r.ok).length
  const errorCount = results.length - successCount

  const lookupAndUpdate = async (
    qrCode: string,
    nextStatus: ItemStatus,
    nextLocation: string
  ): Promise<BulkResult> => {
    try {
      const found = await getItemByQrCode({ data: qrCode })
      if (!found) {
        return {
          qrCode,
          ok: false,
          message: "Tag not registered",
        }
      }
      if (found.kind === "bulk") {
        const fullItem = await getItemById({ data: found.id })
        if (!fullItem) {
          return {
            qrCode,
            ok: false,
            message: "Item could not be loaded",
            itemName: found.name,
          }
        }
        const source = fullItem.batches.find((batch) => batch.qty > 0)
        if (!source) {
          return {
            qrCode,
            ok: false,
            message: "Bulk item has no available stock",
            itemName: found.name,
          }
        }
        await moveBatchMutation.mutateAsync({
          itemId: found.id,
          fromBatchId: source.id,
          qty: 1,
          location: nextLocation,
          status: nextStatus,
          condition: nextStatus === "Repair" ? "Repair" : source.condition,
        })
        return {
          qrCode,
          ok: true,
          message: `1 unit · ${nextStatus} · ${nextLocation}`,
          itemName: found.name,
        }
      }
      await updateItemMutation.mutateAsync({
        id: found.id,
        item: {
          status: nextStatus,
          location: nextLocation,
          condition: nextStatus === "Repair" ? "Repair" : found.condition,
        },
      })
      return {
        qrCode,
        ok: true,
        message: `${nextStatus} · ${nextLocation}`,
        itemName: found.name,
      }
    } catch (err) {
      return {
        qrCode,
        ok: false,
        message: err instanceof Error ? err.message : "Update failed",
      }
    }
  }

  const handleDetected = async (code: string) => {
    if (paused) return
    setPaused(true)
    const trimmed = code.trim()
    const result = await lookupAndUpdate(trimmed, status, location)
    setResults((prev) => [result, ...prev].slice(0, 50))
    setLastResult(result)
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(
      () => {
        setPaused(false)
        setLastResult(null)
      },
      result.ok ? 1400 : 4000
    )
  }

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [])

  return (
    <PageChrome title="Bulk Scan" backTo="/scan">
      <div className="flex flex-col gap-4 p-4">
        <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          {successCount} updated · {errorCount} failed
        </p>

        <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Apply to each scan
            </p>
            <button
              type="button"
              onClick={() => setEditingSettings((v) => !v)}
              className="cursor-pointer text-[10px] font-bold tracking-wider text-primary uppercase hover:underline"
            >
              {editingSettings ? "Done" : "Edit"}
            </button>
          </div>
          {editingSettings ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ItemStatus)}
                >
                  <SelectTrigger id="bulk-status" size="sm">
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
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bulk-location">Location</Label>
                <Input
                  id="bulk-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Warehouse B, Aisle 3"
                />
                <LocationChips
                  locations={locations}
                  value={location}
                  onSelect={setLocation}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline">{status}</Badge>
              <span className="truncate text-muted-foreground">
                {location || "No location"}
              </span>
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Recent items
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground"
                >
                  <HugeiconsIcon
                    icon={BoxIcon}
                    size={11}
                    strokeWidth={1.5}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="max-w-[120px] truncate">{item.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <LiveScanner
          active
          paused={paused}
          onDetected={handleDetected}
          onStatusChange={setScannerStatus}
        />

        {lastResult && (
          <div
            role="alert"
            className={
              lastResult.ok
                ? "rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success"
                : "rounded-xl border-2 border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
            }
          >
            <p className="font-semibold">
              {lastResult.ok ? "✓ Updated" : "✗ Failed"}{" "}
              {lastResult.itemName
                ? `· ${lastResult.itemName}`
                : lastResult.qrCode}
            </p>
            <p className="mt-0.5 opacity-80">{lastResult.message}</p>
          </div>
        )}

        {!cameraReady && scannerStatus !== "starting" && (
          <p className="text-center text-[11px] text-muted-foreground">
            Tap "Allow" when prompted for camera access.
          </p>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Recent
            </p>
            <ul className="max-h-60 space-y-1 overflow-y-auto">
              {results.slice(0, 10).map((r, i) => (
                <li
                  key={`${r.qrCode}-${i}`}
                  className={
                    r.ok
                      ? "flex items-center gap-2 text-xs text-success"
                      : "flex items-center gap-2 text-xs text-destructive"
                  }
                >
                  <HugeiconsIcon icon={BoxIcon} size={12} strokeWidth={1.5} />
                  <span className="flex-1 truncate font-mono">{r.qrCode}</span>
                  <span className="truncate opacity-70">
                    {r.itemName ?? r.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-secondary px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/scan" })}
            disabled={successCount === 0}
            className="w-full"
          >
            Done ({successCount} updated)
          </Button>
        </div>
      </div>
    </PageChrome>
  )
}
