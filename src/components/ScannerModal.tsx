import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { CameraIcon, CloseIcon } from "@/components/icons"
import { LiveScanner } from "@/components/LiveScanner"
import type { LiveScannerStatus } from "@/components/LiveScanner"

type ScanMode = "live" | "file"

type ScannerModalProps = {
  open: boolean
  onClose: () => void
  onDetected: (decodedText: string) => void
}

export function ScannerModal({ open, onClose, onDetected }: ScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ScanMode>("live")
  const [status, setStatus] = useState<{ kind: "error" | "info"; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [liveStatus, setLiveStatus] = useState<LiveScannerStatus>("idle")

  useEffect(() => {
    if (!open) {
      setStatus(null)
      setBusy(false)
      setManualCode("")
      setMode("live")
    }
  }, [open])

  if (!open) return null

  const handleFile = async (file: File) => {
    setBusy(true)
    setStatus(null)
    try {
      const scanner = new Html5Qrcode("scanner-file-region")
      const decoded = await scanner.scanFile(file, true)
      onDetected(decoded)
    } catch (err) {
      console.error("QR decode error:", err)
      setStatus({ kind: "error", message: "Could not read QR code from image. Try again or enter manually." })
    } finally {
      setBusy(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = manualCode.trim()
    if (!value) return
    onDetected(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-[#dfe3dc] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[#dfe3dc] flex items-center justify-between">
          <h3 className="font-semibold text-base text-[#20231f]">Scan Asset Tag</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
            aria-label="Close scanner"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 pt-3">
          <div className="inline-flex rounded-lg border border-[#dfe3dc] bg-[#f7f8f4] p-0.5 text-[11px] font-semibold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setMode("live")}
              className={
                mode === "live"
                  ? "px-3 h-7 rounded-md bg-white text-[#23312b] shadow-xs"
                  : "px-3 h-7 rounded-md text-[#6d7569] cursor-pointer"
              }
            >
              Live
            </button>
            <button
              type="button"
              onClick={() => setMode("file")}
              className={
                mode === "file"
                  ? "px-3 h-7 rounded-md bg-white text-[#23312b] shadow-xs"
                  : "px-3 h-7 rounded-md text-[#6d7569] cursor-pointer"
              }
            >
              File
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {status && (
            <div
              className={
                status.kind === "error"
                  ? "p-3 bg-rose-50 text-rose-800 text-xs border border-rose-100 rounded-xl"
                  : "p-3 bg-emerald-50 text-emerald-800 text-xs border border-emerald-100 rounded-xl"
              }
            >
              {status.message}
            </div>
          )}

          {mode === "live" ? (
            <>
              <LiveScanner active={open} paused={false} onDetected={onDetected} onStatusChange={setLiveStatus} />
              {liveStatus === "denied" && (
                <p className="text-[11px] text-rose-700 text-center">
                  Camera access was blocked. Switch to the File tab or update browser permissions.
                </p>
              )}
              {liveStatus === "starting" && (
                <p className="text-[11px] text-[#6d7569] text-center">Starting camera…</p>
              )}
            </>
          ) : (
            <>
              <div id="scanner-file-region" className="hidden" />

              <label
                htmlFor="qr-capture-input"
                className="flex flex-col items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed border-[#dfe3dc] bg-[#f7f8f4] py-10 cursor-pointer active:bg-[#eef2ea] transition-colors"
              >
                <CameraIcon />
                <span className="text-sm font-semibold text-[#20231f]/60">Tap to capture or pick image</span>
                <span className="text-xs text-[#20231f]/40">QR codes inside the image will be decoded</span>
              </label>
              <input
                ref={fileInputRef}
                id="qr-capture-input"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                  e.target.value = ""
                }}
              />
            </>
          )}

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider font-bold text-[#6d7569]">
            <span className="flex-1 h-px bg-[#dfe3dc]" />
            or enter manually
            <span className="flex-1 h-px bg-[#dfe3dc]" />
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="STG-SOF-2606-0042"
              autoComplete="off"
              inputMode="text"
              className="flex-1 h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm font-mono"
            />
            <Button
              type="submit"
              disabled={!manualCode.trim()}
              className="h-11 rounded-lg bg-[#23312b] text-white px-4 font-semibold text-xs tracking-wider uppercase hover:bg-[#1a2520] transition-colors cursor-pointer"
            >
              Look up
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
