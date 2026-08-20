import { createLazyFileRoute, useRouter } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getQrImage } from "@/lib/qr"
import {
  PRINT_SIZE_PX,
  PRINT_SIZE_ORDER,
  RACK_ROWS_PER_PAGE,
  chunkByPage,
  chunkTagsByPage,
} from "@/lib/print-sheet"
import type { InventoryItem, InventoryItemWithTags } from "@/lib/inventory"
import type { RackWithItems } from "@/lib/racks"

export const Route = createLazyFileRoute("/print")({
  component: PrintView,
})

/**
 * Resolve QR blob URLs for a set of codes at one size. `ready` flips when
 * every code has resolved (or failed) so the caller only auto-prints once
 * the sheet is fully rendered.
 */
function useQrImages(codes: string[], width: number, margin: number) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const key = codes.join("|")

  useEffect(() => {
    let cancelled = false
    const unique = [...new Set(codes)]
    const next: Record<string, string> = {}
    let remaining = unique.length
    if (remaining === 0) {
      setReady(true)
      return
    }
    for (const code of unique) {
      getQrImage(code, { width, margin })
        .then((url) => {
          if (cancelled) return
          next[code] = url
          if (--remaining === 0) {
            setUrls(next)
            setReady(true)
          }
        })
        .catch(() => {
          if (cancelled) return
          if (--remaining === 0) {
            setUrls(next)
            setReady(true)
          }
        })
    }
    return () => {
      cancelled = true
    }
  }, [key, width, margin])

  return { urls, ready }
}

/**
 * Auto-open the print dialog once the content is ready. Returns to the
 * opener on `afterprint` (fires when the dialog closes, print or cancel)
 * so the print view never lingers in history. A fallback "Done" button
 * covers browsers that don't fire `afterprint` (e.g. iOS Safari).
 */
function useAutoPrint(ready: boolean, goBack: () => void) {
  useEffect(() => {
    if (!ready) return
    let disposed = false
    let printed = false
    const onAfterPrint = () => {
      if (printed) return
      printed = true
      window.removeEventListener("afterprint", onAfterPrint)
      goBack()
    }
    const t = window.setTimeout(async () => {
      // Wait for every QR <img> to decode so the sheet prints complete.
      const imgs = Array.from(document.images)
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener("load", () => resolve(), { once: true })
                  img.addEventListener("error", () => resolve(), { once: true })
                })
        )
      )
      if (disposed) return
      window.addEventListener("afterprint", onAfterPrint)
      window.print()
    }, 100)
    return () => {
      disposed = true
      window.clearTimeout(t)
      window.removeEventListener("afterprint", onAfterPrint)
    }
  }, [ready, goBack])
}

function PrintView() {
  const data = Route.useLoaderData()
  const router = useRouter()

  const goBack = useCallback(() => {
    if (window.history.length > 1) router.history.back()
    else void router.navigate({ to: "/home" })
  }, [router])

  return (
    <div className="min-h-svh bg-muted">
      <div className="print-toolbar mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Printing… close the dialog when done.
        </p>
        <button
          type="button"
          onClick={goBack}
          className="print:hidden inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent"
        >
          Done
        </button>
      </div>

      <div className="print-preview mx-auto max-w-3xl px-4 pb-10">
        {data.kind === "tags" && <TagSheetPrint items={data.items} goBack={goBack} />}
        {data.kind === "single" && (
          <SingleTagPrint item={data.item} goBack={goBack} />
        )}
        {data.kind === "rack" && <RackSheetPrint rack={data.rack} goBack={goBack} />}
      </div>

      <style>{PRINT_CSS}</style>
    </div>
  )
}

function TagSheetPrint({
  items,
  goBack,
}: {
  items: InventoryItem[]
  goBack: () => void
}) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          PRINT_SIZE_ORDER[a.printSize] - PRINT_SIZE_ORDER[b.printSize] ||
          a.qrCode.localeCompare(b.qrCode)
      ),
    [items]
  )
  const pages = useMemo(() => chunkTagsByPage(sorted), [sorted])
  const codes = useMemo(() => sorted.map((it) => it.qrCode), [sorted])
  const { urls, ready } = useQrImages(codes, 256, 1)
  useAutoPrint(ready, goBack)

  return (
    <div className="print-sheet">
      {pages.map((page, i) => (
        <div key={i} className="print-page">
          <div className="print-grid">
            {page.map((it) => {
              const px = PRINT_SIZE_PX[it.printSize]
              return (
                <div key={it.id} className="print-cell">
                  {urls[it.qrCode] ? (
                    <img
                      src={urls[it.qrCode]}
                      width={px}
                      height={px}
                      alt=""
                      decoding="async"
                    />
                  ) : (
                    <div style={{ width: px, height: px }} />
                  )}
                  <div className="print-code">{it.qrCode}</div>
                  <div className="print-name">{it.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function SingleTagPrint({
  item,
  goBack,
}: {
  item: InventoryItemWithTags
  goBack: () => void
}) {
  const { urls, ready } = useQrImages([item.qrCode], 256, 2)
  useAutoPrint(ready, goBack)
  const px = PRINT_SIZE_PX[item.printSize]

  return (
    <div className="print-single">
      {urls[item.qrCode] ? (
        <img
          src={urls[item.qrCode]}
          width={px}
          height={px}
          alt=""
          decoding="async"
        />
      ) : (
        <div style={{ width: px, height: px }} />
      )}
      <div className="print-single-name">{item.name}</div>
      <div className="print-single-code">{item.qrCode}</div>
    </div>
  )
}

function RackSheetPrint({
  rack,
  goBack,
}: {
  rack: RackWithItems
  goBack: () => void
}) {
  const rowCodes = useMemo(() => rack.items.map((it) => it.qrCode), [rack])
  const headerQr = useQrImages([rack.qrCode], 256, 1)
  const rowQr = useQrImages(rowCodes, 128, 0)
  useAutoPrint(headerQr.ready && rowQr.ready, goBack)

  const pages = useMemo(
    () =>
      rack.items.length === 0 ? [[]] : chunkByPage(rack.items, RACK_ROWS_PER_PAGE),
    [rack]
  )

  return (
    <div className="rack-sheet">
      {pages.map((page, i) => (
        <div key={i} className="print-page">
          <div className="rack-header">
            <div>
              <div className="rack-title">{rack.name}</div>
              <div className="rack-sub">{rack.qrCode}</div>
              {rack.location ? (
                <div className="rack-sub">{rack.location}</div>
              ) : null}
            </div>
            {headerQr.urls[rack.qrCode] ? (
              <img
                src={headerQr.urls[rack.qrCode]}
                width={96}
                height={96}
                alt=""
                decoding="async"
              />
            ) : (
              <div className="size-24" />
            )}
          </div>
          <div className="rack-rows">
            {page.map((it) => (
              <div key={it.id} className="rack-row">
                <div>
                  <div className="rack-row-name">{it.name}</div>
                  <div className="rack-row-code">{it.qrCode}</div>
                </div>
                {rowQr.urls[it.qrCode] ? (
                  <img
                    src={rowQr.urls[it.qrCode]}
                    width={48}
                    height={48}
                    alt=""
                    decoding="async"
                  />
                ) : (
                  <div className="size-12" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const PRINT_CSS = `
.print-page {
  background: #fff;
  margin: 0 0 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,.15);
  break-after: page;
  page-break-after: always;
}
.print-page:last-child {
  break-after: auto;
  page-break-after: auto;
}
.print-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.print-cell {
  border: 0.5px solid #000;
  padding: 4px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow: hidden;
  break-inside: avoid;
  page-break-inside: avoid;
}
.print-cell img { display: block; }
.print-code {
  font-family: monospace;
  font-size: 7px;
  font-weight: 700;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.print-name {
  font-size: 6px;
  color: #444;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.print-single {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px;
  background: #fff;
}
.print-single img { display: block; margin: 0 auto; }
.print-single-name { margin-top: 10px; font-size: 14px; font-weight: 600; }
.print-single-code { margin-top: 4px; font-family: monospace; font-size: 11px; }
.rack-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 1px solid #000;
  padding-bottom: 8px;
  margin-bottom: 4px;
}
.rack-header img { width: 96px; height: 96px; }
.rack-title { font-size: 16px; font-weight: 700; text-transform: uppercase; }
.rack-sub { font-family: monospace; font-size: 9px; color: #333; }
.rack-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #000;
  break-inside: avoid;
  page-break-inside: avoid;
}
.rack-row img { width: 48px; height: 48px; }
.rack-row-name { font-size: 12px; font-weight: 600; }
.rack-row-code { font-family: monospace; font-size: 9px; color: #333; }

@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  .print-toolbar { display: none !important; }
  .print-preview { max-width: none !important; padding: 0 !important; }
  .print-page {
    margin: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
}
`