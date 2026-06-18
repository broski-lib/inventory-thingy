import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Html5Qrcode } from "html5-qrcode"
import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Image01Icon, KeyboardIcon } from "@hugeicons/core-free-icons"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LiveScanner } from "@/components/LiveScanner"
import type { LiveScannerStatus } from "@/components/LiveScanner"
import { PageChrome } from "@/components/PageChrome"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/scan/camera")({
  component: ScanCameraPage,
})

function ScanCameraPage() {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const [liveStatus, setLiveStatus] = useState<LiveScannerStatus>("idle")
  const [showManual, setShowManual] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileBusy, setFileBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastDetectedRef = useRef<{ code: string; at: number } | null>(null)

  const submitCode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    navigate({
      to: "/scan",
      search: { code: trimmed },
      replace: true,
    })
  }

  const handleDetected = (code: string) => {
    const now = Date.now()
    const last = lastDetectedRef.current
    if (last && last.code === code && now - last.at < 1500) return
    lastDetectedRef.current = { code, at: now }
    try {
      navigator.vibrate(40)
    } catch {
      /* vibrate is a no-op on unsupported browsers */
    }
    setPaused(true)
    submitCode(code)
  }

  const handleFile = async (file: File) => {
    setFileBusy(true)
    setFileError(null)
    try {
      const scanner = new Html5Qrcode("scan-camera-file-region")
      const decoded = await scanner.scanFile(file, true)
      submitCode(decoded)
    } catch {
      setFileError(
        "No QR code found in that image. Try another or enter the code manually."
      )
    } finally {
      setFileBusy(false)
    }
  }

  return (
    <PageChrome title="Scan Tag" backTo="/scan">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex justify-center">
          <LiveScanner
            active
            paused={paused}
            onDetected={handleDetected}
            onStatusChange={setLiveStatus}
          />
        </div>

        {liveStatus === "denied" && (
          <p className="text-center text-xs text-destructive">
            Camera access blocked. Use the options below to scan a code.
          </p>
        )}
        {liveStatus === "error" && (
          <p className="text-center text-xs text-destructive">
            No camera found. Use the options below.
          </p>
        )}

        {showManual ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitCode(manualCode)
            }}
            className="flex flex-col gap-2 rounded-lg border border-border bg-secondary p-3"
          >
            <Input
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              autoComplete="off"
              inputMode="text"
              className="font-mono"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowManual(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!manualCode.trim()}
                className="flex-1"
              >
                Look up
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 justify-center gap-2 bg-secondary text-foreground hover:bg-accent"
              )}
            >
              <HugeiconsIcon icon={KeyboardIcon} size={16} strokeWidth={1.6} />
              Enter code
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={fileBusy}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 justify-center gap-2 bg-secondary text-foreground hover:bg-accent"
              )}
            >
              <HugeiconsIcon icon={Image01Icon} size={16} strokeWidth={1.6} />
              {fileBusy ? "Reading…" : "From photos"}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          id="scan-camera-file-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ""
          }}
        />

        <div id="scan-camera-file-region" className="hidden" />

        {fileError && (
          <p className="text-center text-xs text-destructive">{fileError}</p>
        )}
      </div>
    </PageChrome>
  )
}
