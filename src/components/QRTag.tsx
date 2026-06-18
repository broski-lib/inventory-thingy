import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { QrCodeIcon } from "@hugeicons/core-free-icons"
import { Alert, AlertDescription } from "@/components/ui/alert"

type QRTagProps = {
  qrCode: string
  itemName: string
  itemId: string
}

export function QRTag({ qrCode, itemName, itemId }: QRTagProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(qrCode, { width: 384, margin: 2 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch((err) => {
        console.error("QR generation failed:", err)
        if (!cancelled) setError("Failed to generate QR code")
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
    const w = window.open("", "_blank", "width=420,height=520")
    if (!w) return
    w.document.write(PRINT_HTML(qrCode, dataUrl, itemName, itemId))
    w.document.close()
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-center">
        <p className="truncate text-base font-semibold text-foreground">
          {itemName}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{qrCode}</p>
      </div>

      <div className="mx-auto rounded-xl border border-border bg-card p-4 shadow-inner">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code for ${itemName}`}
            className="size-56"
          />
        ) : (
          <div className="flex size-56 items-center justify-center text-muted-foreground">
            <HugeiconsIcon
              icon={QrCodeIcon}
              size={64}
              strokeWidth={1.2}
              className="animate-pulse"
            />
          </div>
        )}
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

function PRINT_HTML(
  qrCode: string,
  dataUrl: string,
  itemName: string,
  _itemId: string
) {
  return `<!doctype html>
<html>
<head>
  <title>QR Tag - ${escapeHtml(qrCode)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; flex-direction: column; align-items: center; padding: 16px; font-family: ui-monospace, monospace; font-size: 13px; color: oklch(0.185 0.005 150); }
    img { width: 220px; height: 220px; display: block; }
    .name { margin-top: 12px; font-weight: 600; max-width: 240px; text-align: center; }
    .code { margin-top: 4px; font-size: 12px; color: oklch(0.503 0.014 130); }
    @page { margin: 0; size: auto; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="QR for ${escapeHtml(qrCode)}" />
  <p class="name">${escapeHtml(itemName)}</p>
  <p class="code">${escapeHtml(qrCode)}</p>
  <script>
    window.onload = function () {
      window.print()
      window.onafterprint = function () { window.close() }
    }
  </script>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
