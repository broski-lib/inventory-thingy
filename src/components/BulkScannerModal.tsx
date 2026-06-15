import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { CloseIcon } from "@/components/icons"
import { LiveScanner } from "@/components/LiveScanner"
import type { LiveScannerStatus } from "@/components/LiveScanner"
import { ITEM_STATUSES } from "@/lib/item-status"
import type { ItemStatus } from "@/lib/item-status"

export type BulkResult = {
  qrCode: string
  ok: boolean
  message: string
  itemName?: string
}

type BulkScannerModalProps = {
  open: boolean
  onClose: () => void
  lookupAndUpdate: (qrCode: string, status: ItemStatus, location: string) => Promise<BulkResult>
}

export function BulkScannerModal({ open, onClose, lookupAndUpdate }: BulkScannerModalProps) {
  const [status, setStatus] = useState<ItemStatus>("Available")
  const [location, setLocation] = useState("Warehouse A, Bay 1")
  const [scannerStatus, setScannerStatus] = useState<LiveScannerStatus>("idle")
  const [paused, setPaused] = useState(false)
  const [results, setResults] = useState<BulkResult[]>([])
  const [lastResult, setLastResult] = useState<BulkResult | null>(null)
  const [editingSettings, setEditingSettings] = useState(false)

  const cameraReady = scannerStatus === "scanning" || scannerStatus === "paused"
  const successCount = results.filter((r) => r.ok).length
  const errorCount = results.length - successCount

  const handleDetected = useCallback(
    async (code: string) => {
      if (paused) return
      setPaused(true)
      const trimmed = code.trim()
      const result = await lookupAndUpdate(trimmed, status, location)
      setResults((prev) => [result, ...prev].slice(0, 50))
      setLastResult(result)
      // Auto-resume after a short delay so the next code can be scanned
      setTimeout(() => {
        setPaused(false)
        setLastResult(null)
      }, 1400)
    },
    [lookupAndUpdate, location, paused, status],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-[#dfe3dc] shadow-xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="p-4 border-b border-[#dfe3dc] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#20231f]">Bulk Scan</h3>
            <p className="text-[10px] text-[#6d7569] uppercase tracking-wider font-bold mt-0.5">
              {successCount} updated · {errorCount} failed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
            aria-label="Close bulk scanner"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="rounded-lg border border-[#dfe3dc] bg-[#f7f8f4] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6d7569]">Apply to each scan</p>
              <button
                type="button"
                onClick={() => setEditingSettings((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-wider text-[#23312b] hover:underline cursor-pointer"
              >
                {editingSettings ? "Done" : "Edit"}
              </button>
            </div>
            {editingSettings ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#6d7569]">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ItemStatus)}
                    className="w-full h-10 px-2 border border-[#dfe3dc] rounded-lg bg-white text-xs text-[#20231f]"
                  >
                    {ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#6d7569]">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Warehouse B, Aisle 3"
                    className="w-full h-10 px-3 border border-[#dfe3dc] rounded-lg bg-white text-sm text-[#20231f]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-white border border-[#dfe3dc] px-2.5 py-0.5 text-[11px] font-semibold text-[#20231f]">
                  {status}
                </span>
                <span className="text-[#6d7569] truncate">{location || "No location"}</span>
              </div>
            )}
          </div>

          <LiveScanner
            active={open}
            paused={paused}
            onDetected={handleDetected}
            onStatusChange={setScannerStatus}
          />

          {lastResult && (
            <div
              className={
                lastResult.ok
                  ? "p-3 bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 rounded-xl"
                  : "p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl"
              }
            >
              <p className="font-semibold">
                {lastResult.ok ? "✓ Updated" : "✗ Failed"} {lastResult.itemName ? `· ${lastResult.itemName}` : lastResult.qrCode}
              </p>
              <p className="opacity-80 mt-0.5">{lastResult.message}</p>
            </div>
          )}

          {!cameraReady && scannerStatus !== "starting" && (
            <p className="text-[11px] text-[#6d7569] text-center">
              Tap "Allow" when prompted for camera access.
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6d7569]">Recent</p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {results.slice(0, 10).map((r, i) => (
                  <li
                    key={`${r.qrCode}-${i}`}
                    className={
                      r.ok
                        ? "flex items-center gap-2 text-xs text-emerald-700"
                        : "flex items-center gap-2 text-xs text-rose-700"
                    }
                  >
                    <span>{r.ok ? "✓" : "✗"}</span>
                    <span className="font-mono truncate flex-1">{r.qrCode}</span>
                    <span className="opacity-70 truncate">{r.itemName ?? r.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[#dfe3dc] bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full h-11 border-[#dfe3dc] text-[#20231f] hover:bg-neutral-50 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Done ({successCount} updated)
          </Button>
        </div>
      </div>
    </div>
  )
}
