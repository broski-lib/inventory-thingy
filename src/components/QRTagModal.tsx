import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { CloseIcon, QrIcon } from "@/components/icons"

type QRTagModalProps = {
  open: boolean
  onClose: () => void
  qrCode: string
  itemName: string
  itemId: string
}

export function QRTagModal({ open, onClose, qrCode, itemName, itemId }: QRTagModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setDataUrl(null)
      setError(null)
      return
    }
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
  }, [open, qrCode])

  if (!open) return null

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
    w.document.write(`<!doctype html>
<html>
<head>
  <title>QR Tag - ${qrCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; flex-direction: column; align-items: center; padding: 16px; font-family: ui-monospace, monospace; font-size: 13px; color: #20231f; }
    img { width: 220px; height: 220px; display: block; }
    .name { margin-top: 12px; font-weight: 600; max-width: 240px; text-align: center; }
    .code { margin-top: 4px; font-size: 12px; color: #6d7569; }
    @page { margin: 0; size: auto; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="QR for ${qrCode}" />
  <p class="name">${escapeHtml(itemName)}</p>
  <p class="code">${escapeHtml(qrCode)}</p>
  <script>
    window.onload = function () {
      window.print()
      window.onafterprint = function () { window.close() }
    }
  </script>
</body>
</html>`)
    w.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-[#dfe3dc] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[#dfe3dc] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#20231f]">Asset QR Tag</h3>
            <p className="text-[10px] text-[#6d7569] font-mono mt-0.5">{itemId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
            aria-label="Close QR modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-center">
          <p className="text-sm font-semibold truncate text-[#20231f]">{itemName}</p>
          <p className="text-xs text-[#6d7569] font-mono">{qrCode}</p>

          <div className="bg-white p-4 rounded-xl inline-block shadow-inner border border-[#dfe3dc]">
            {error ? (
              <p className="text-xs text-rose-600 p-8">{error}</p>
            ) : dataUrl ? (
              <img src={dataUrl} alt={`QR code for ${itemName}`} className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-[#6d7569]">
                <QrIcon className="size-8 animate-pulse" />
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#6d7569]">Print and attach to furniture for quick scan lookup.</p>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={!dataUrl}
              className="flex-1 h-11 border-[#dfe3dc] text-[#20231f] text-xs font-semibold rounded-lg cursor-pointer"
            >
              Download
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={!dataUrl}
              className="flex-1 h-11 bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold rounded-lg cursor-pointer"
            >
              Print
            </Button>
          </div>
        </div>
      </div>
    </div>
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
