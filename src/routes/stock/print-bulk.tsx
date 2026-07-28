import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, PrinterIcon } from "@hugeicons/core-free-icons"
import { getItemsByIds } from "@/lib/inventory"
import { PRINT_SIZE_PX } from "@/lib/print-sheet"
import type { PrintSize } from "@/lib/schema"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/stock/print-bulk")({
  validateSearch: (search) => ({
    ids: (search.ids as string) || "",
  }),
  loaderDeps: ({ search }) => ({ ids: search.ids }),
  loader: async ({ deps }) => {
    const idArray = deps.ids.split(",").filter(Boolean)
    if (idArray.length === 0) return { items: [] }
    const items = await getItemsByIds({ data: idArray })
    return { items }
  },
  component: BulkPrintPage,
})

type PrintItem = {
  name: string
  qrCode: string
  dataUrl: string
  printSize: PrintSize
}

function BulkPrintPage() {
  const { items } = Route.useLoaderData()
  const router = useRouter()
  const [printItems, setPrintItems] = useState<PrintItem[]>([])

  useEffect(() => {
    if (items.length === 0) {
      router.history.back()
      return
    }

    let cancelled = false
    Promise.all(
      items.map(async (item) => ({
        name: item.name,
        qrCode: item.qrCode,
        dataUrl: await QRCode.toDataURL(item.qrCode, {
          width: 200,
          margin: 1,
        }),
        printSize: item.printSize,
      }))
    )
      .then((encoded) => {
        if (!cancelled) setPrintItems(encoded)
      })
      .catch(() => {
        if (!cancelled) setPrintItems([])
      })

    return () => {
      cancelled = true
    }
  }, [items, router])

  return (
    <div className="min-h-svh bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.history.back()}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Button>
        <Button
          size="sm"
          onClick={() => window.print()}
          disabled={printItems.length === 0}
        >
          <HugeiconsIcon icon={PrinterIcon} size={16} />
          Print ({printItems.length})
        </Button>
      </div>

      <div className="px-4 py-6 print:p-0">
        <h1 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-foreground print:hidden">
          QR Tag Sheet — {printItems.length} item{printItems.length === 1 ? "" : "s"}
        </h1>

        {printItems.length === 0 ? (
          <p className="text-center text-muted-foreground">Generating QR codes...</p>
        ) : (
          <div className="grid grid-cols-3 gap-0">
            {printItems.map((item) => {
              const printPx = PRINT_SIZE_PX[item.printSize]
              return (
                <div
                  key={item.qrCode}
                  className="flex flex-col items-center border border-dashed border-border p-2 print:border-black"
                  style={{ breakInside: "avoid" }}
                >
                  <img
                    src={item.dataUrl}
                    alt={`QR for ${item.qrCode}`}
                    className="aspect-square w-full print:hidden"
                  />
                  <img
                    src={item.dataUrl}
                    alt={`QR for ${item.qrCode}`}
                    style={{ width: printPx, height: printPx }}
                    className="hidden print:block"
                  />
                  <p className="mt-1 max-w-full truncate text-center font-mono text-[8px] font-bold tracking-wide">
                    {item.qrCode}
                  </p>
                  <p className="mt-0.5 max-w-full truncate text-center text-[7px] text-muted-foreground">
                    {item.name}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
