import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import QRCode from "qrcode"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, PrinterIcon } from "@hugeicons/core-free-icons"
import { getItemsByIds } from "@/lib/inventory"
import {
  PRINT_SIZE_PX,
  PRINT_SIZE_ORDER,
  chunkByPage,
  chunkTagsByPage,
} from "@/lib/print-sheet"
import type { PrintSize } from "@/lib/schema"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  const navigate = useNavigate()
  const [printItems, setPrintItems] = useState<PrintItem[]>([])

  useEffect(() => {
    if (items.length === 0) {
      navigate({ to: "/stock", replace: true })
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
        if (cancelled) return
        // Group same-sized tags together so every page of the sheet is
        // uniform — mixed tag sizes are what caused pages to overrun.
        const sorted = [...encoded].sort(
          (a, b) =>
            PRINT_SIZE_ORDER[a.printSize] - PRINT_SIZE_ORDER[b.printSize] ||
            a.qrCode.localeCompare(b.qrCode)
        )
        setPrintItems(sorted)
      })
      .catch(() => {
        if (!cancelled) setPrintItems([])
      })

    return () => {
      cancelled = true
    }
  }, [items, navigate])

  const pages = useMemo(() => chunkTagsByPage(printItems), [printItems])

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
          disabled={printItems.length === 0}
        >
          <HugeiconsIcon icon={PrinterIcon} size={16} />
          {pages.length > 1
            ? `Print (${printItems.length} · ${pages.length} pages)`
            : `Print (${printItems.length})`}
        </Button>
      </div>

      <div className="px-4 py-6 print:p-0">
        <style>{`@media print { .print-tag-row { break-inside: avoid; page-break-inside: avoid; } }`}</style>
        <h1 className="mb-4 text-center text-sm font-semibold tracking-wider text-foreground uppercase print:hidden">
          QR Tag Sheet — {printItems.length} item
          {printItems.length === 1 ? "" : "s"}
          {pages.length > 1 ? ` · ${pages.length} pages` : ""}
        </h1>

        {printItems.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Generating QR codes...
          </p>
        ) : (
          <div className="flex flex-col items-center gap-6 print:gap-0">
            {pages.map((page, pi) => (
              <div
                key={pi}
                className={cn(
                  "w-full max-w-2xl rounded-xl border border-border bg-white p-2 print:max-w-full print:rounded-none print:border-0 print:bg-transparent print:p-0",
                  pi < pages.length - 1 && "print:break-after-page"
                )}
              >
                {pages.length > 1 && (
                  <p className="mb-2 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase print:hidden">
                    Page {pi + 1} of {pages.length}
                  </p>
                )}
                <div className="flex flex-col gap-0">
                  {chunkByPage(page, 3).map((row, ri) => (
                    <div key={ri} className="print-tag-row grid grid-cols-3">
                      {row.map((item) => {
                        const printPx = PRINT_SIZE_PX[item.printSize]
                        return (
                          <div
                            key={item.qrCode}
                            className="flex flex-col items-center border border-dashed border-border p-2 print:border-black"
                          >
                            <img
                              src={item.dataUrl}
                              alt={`QR for ${item.qrCode}`}
                              loading="lazy"
                              decoding="async"
                              className="aspect-square w-full print:hidden"
                            />
                            <img
                              src={item.dataUrl}
                              alt={`QR for ${item.qrCode}`}
                              style={{ width: printPx, height: printPx }}
                              loading="lazy"
                              decoding="async"
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
