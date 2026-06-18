import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
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
import { getItemByQrCode, updateItem } from "@/lib/inventory"
import { ITEM_STATUSES } from "@/lib/item-status"
import type { ItemStatus } from "@/lib/item-status"

export const Route = createFileRoute("/scan/bulk")({
  component: BulkScanPage,
})

type BulkResult = {
  qrCode: string
  ok: boolean
  message: string
  itemName?: string
}

const DEFAULT_LOCATION = "Warehouse A, Bay 1"

function BulkScanPage() {
  const [status, setStatus] = useState<ItemStatus>("Available")
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [scannerStatus, setScannerStatus] = useState<LiveScannerStatus>("idle")
  const [paused, setPaused] = useState(false)
  const [results, setResults] = useState<BulkResult[]>([])
  const [lastResult, setLastResult] = useState<BulkResult | null>(null)
  const [editingSettings, setEditingSettings] = useState(false)

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
      await updateItem({
        data: {
          id: found.id,
          item: {
            status: nextStatus,
            location: nextLocation,
            condition: nextStatus === "Repair" ? "Repair" : found.condition,
          },
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
    setTimeout(() => {
      setPaused(false)
      setLastResult(null)
    }, 1400)
  }

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

        <div className="flex justify-center">
          <LiveScanner
            active
            paused={paused}
            onDetected={handleDetected}
            onStatusChange={setScannerStatus}
          />
        </div>

        {lastResult && (
          <div
            className={
              lastResult.ok
                ? "rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success"
                : "rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
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

        <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Button
            type="button"
            variant="outline"
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
