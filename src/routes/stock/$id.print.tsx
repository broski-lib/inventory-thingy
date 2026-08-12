import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, PrinterIcon } from "@hugeicons/core-free-icons"
import { getItemById } from "@/lib/inventory"
import { PRINT_SIZE_PX } from "@/lib/print-sheet"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/stock/$id/print")({
  loader: async ({ params }) => {
    const item = await getItemById({ data: params.id })
    if (!item) throw notFound()
    return { item }
  },
  component: ItemPrintPage,
})

function ItemPrintPage() {
  const { item } = Route.useLoaderData()
  const navigate = useNavigate()
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const printPx = PRINT_SIZE_PX[item.printSize]

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(item.qrCode, { width: 384, margin: 2 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [item.qrCode])

  return (
    <div className="min-h-svh bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/stock", replace: true })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Button>
        <Button
          size="sm"
          onClick={() => window.print()}
          disabled={!dataUrl}
        >
          <HugeiconsIcon icon={PrinterIcon} size={16} />
          Print
        </Button>
      </div>

      <div className="flex flex-col items-center px-4 py-8 print:p-0">
        {dataUrl ? (
          <div className="flex flex-col items-center">
            <img
              src={dataUrl}
              alt={`QR code for ${item.name}`}
              loading="lazy"
              decoding="async"
              className="size-48 print:hidden"
            />
            <img
              src={dataUrl}
              alt={`QR code for ${item.name}`}
              style={{ width: printPx, height: printPx }}
              loading="lazy"
              decoding="async"
              className="hidden print:block"
            />
            <p className="mt-3 max-w-[200px] text-center text-sm font-semibold text-foreground">
              {item.name}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {item.qrCode}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">Generating QR code...</p>
        )}
      </div>
    </div>
  )
}
