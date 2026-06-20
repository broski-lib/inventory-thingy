import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { QrCodeIcon } from "@hugeicons/core-free-icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { openPrintWindow, singleTagSheet } from "@/lib/print-sheet"

type QRTagProps = {
  qrCode: string
  itemName: string
}

export function QRTag({ qrCode, itemName }: QRTagProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(qrCode, { width: 384, margin: 2 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : "Failed to generate QR code"
        )
      })
    return () => {
      cancelled = true
    }
  }, [qrCode])

  const handleDownload = () => {
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `${qrCode}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handlePrint = () => {
    if (!dataUrl) return
    openPrintWindow(
      singleTagSheet({ qrCode, dataUrl, itemName }),
      "width=240,height=320"
    )
  }

  const loading = !dataUrl && !error

  return (
    <div className="flex flex-col gap-4 p-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <div className="rounded-xl border border-border bg-card p-4 shadow-inner">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR code for ${itemName}`}
              className="size-56"
            />
          ) : (
            <div
              className="flex size-56 items-center justify-center text-muted-foreground"
              aria-live="polite"
              aria-busy={loading}
              aria-label="Generating QR code"
            >
              <HugeiconsIcon
                icon={QrCodeIcon}
                size={64}
                strokeWidth={1.2}
                className={loading ? "animate-pulse" : ""}
              />
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Print and attach to the item for quick scan lookup.
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          disabled={!dataUrl}
          className="flex-1"
        >
          Download
        </Button>
        <Button
          type="button"
          onClick={handlePrint}
          disabled={!dataUrl}
          className="flex-1"
        >
          Print
        </Button>
      </div>
    </div>
  )
}
