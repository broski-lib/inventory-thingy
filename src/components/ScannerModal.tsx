import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CameraIcon } from "@/components/icons"
import { LiveScanner } from "@/components/LiveScanner"
import type { LiveScannerStatus } from "@/components/LiveScanner"
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/modal"

type ScanMode = "live" | "file"

type ScannerModalProps = {
  open: boolean
  onClose: () => void
  onDetected: (decodedText: string) => void
}

export function ScannerModal({ open, onClose, onDetected }: ScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ScanMode>("live")
  const [status, setStatus] = useState<{
    kind: "error" | "info"
    message: string
  } | null>(null)
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

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  const handleFile = async (file: File) => {
    setBusy(true)
    setStatus(null)
    try {
      const scanner = new Html5Qrcode("scanner-file-region")
      const decoded = await scanner.scanFile(file, true)
      onDetected(decoded)
    } catch (err) {
      console.error("QR decode error:", err)
      setStatus({
        kind: "error",
        message:
          "Could not read QR code from image. Try again or enter manually.",
      })
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
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalHeader onClose={onClose}>
        <ModalTitle>Scan Asset Tag</ModalTitle>
      </ModalHeader>

      <ModalBody>
        <Tabs value={mode} onValueChange={(v) => setMode(v as ScanMode)}>
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>

          {status && (
            <div
              className={
                status.kind === "error"
                  ? "mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
                  : "mt-4 rounded-xl border border-success/20 bg-success/10 p-3 text-xs text-success"
              }
            >
              {status.message}
            </div>
          )}

          <TabsContent value="live" className="mt-4 space-y-2">
            <LiveScanner
              active={open}
              paused={false}
              onDetected={onDetected}
              onStatusChange={setLiveStatus}
            />
            {liveStatus === "denied" && (
              <p className="text-center text-[11px] text-destructive">
                Camera access was blocked. Switch to the File tab or update
                browser permissions.
              </p>
            )}
            {liveStatus === "starting" && (
              <p className="text-center text-[11px] text-muted-foreground">
                Starting camera…
              </p>
            )}
          </TabsContent>

          <TabsContent value="file" className="mt-4 space-y-2">
            <div id="scanner-file-region" className="hidden" />
            <label
              htmlFor="qr-capture-input"
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary py-10 transition-colors hover:bg-accent"
            >
              <CameraIcon />
              <span className="text-sm font-semibold text-foreground/60">
                Tap to capture or pick image
              </span>
              <span className="text-xs text-foreground/40">
                QR codes inside the image will be decoded
              </span>
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
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 pt-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          or enter manually
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="STG-SOF-2606-0042"
            autoComplete="off"
            inputMode="text"
            className="flex-1 font-mono"
          />
          <Button type="submit" disabled={!manualCode.trim()} className="px-4">
            Look up
          </Button>
        </form>
      </ModalBody>
    </Modal>
  )
}
