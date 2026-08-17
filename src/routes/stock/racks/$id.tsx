import {
  createFileRoute,
  useNavigate,
  useRouter,
  useMatch,
  Outlet,
  notFound,
} from "@tanstack/react-router"
import { useState, useEffect, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  BoxIcon,
  PrinterIcon,
} from "@hugeicons/core-free-icons"
import { getRack } from "@/lib/racks"
import { getLocations } from "@/lib/inventory"
import { RACK_ROWS_PER_PAGE, chunkByPage } from "@/lib/print-sheet"
import { useUpdateRack, useDeleteRack } from "@/lib/queries"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getStatusBadgeVariant } from "@/components/ItemCard"
import { PageChrome } from "@/components/PageChrome"
import { LocationChips } from "@/components/LocationChips"
import { TrashIcon } from "@/components/icons"
import { cn } from "@/lib/utils"
import QRCode from "qrcode"

type RackSearch = { view?: string }

export const Route = createFileRoute("/stock/racks/$id")({
  validateSearch: (s: Record<string, unknown>): RackSearch => ({
    view: typeof s.view === "string" ? s.view : undefined,
  }),
  loader: async ({ params }) => {
    const [rack, locations] = await Promise.all([
      getRack({ data: params.id }),
      getLocations(),
    ])
    if (!rack) throw notFound()
    return { rack, locations }
  },
  component: RackViewPage,
})

function RackViewPage() {
  const { rack, locations } = Route.useLoaderData()
  const { view } = Route.useSearch()
  const navigate = useNavigate()
  // `/stock/racks/$id/items` is a child route — render it in place of the
  // detail view when it matches (this layout has no outlet of its own).
  const onItemsRoute = useMatch({
    from: "/stock/racks/$id/items",
    shouldThrow: false,
  })

  if (view === "print") {
    return <RackPrintView rack={rack} />
  }

  if (onItemsRoute) {
    return <Outlet />
  }

  return (
    <RackDetailView rack={rack} locations={locations} navigate={navigate} />
  )
}

function RackDetailView({
  rack,
  locations,
  navigate,
}: {
  rack: NonNullable<Awaited<ReturnType<typeof getRack>>>
  locations: string[]
  navigate: ReturnType<typeof useNavigate>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(rack.name)
  const [location, setLocation] = useState(rack.location)
  const [busy, setBusy] = useState(false)
  const updateMutation = useUpdateRack()
  const deleteMutation = useDeleteRack()

  const totalQty = rack.items.reduce((s, i) => s + i.rackQty, 0)

  const handleSave = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await updateMutation.mutateAsync({
        id: rack.id,
        name: name.trim(),
        location: location.trim(),
      })
      setEditing(false)
      router.invalidate()
    } catch {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete rack "${rack.name}"? Items are not affected.`)) return
    setBusy(true)
    try {
      await deleteMutation.mutateAsync(rack.id)
      navigate({ to: "/stock/racks" })
    } catch {
      setBusy(false)
    }
  }

  return (
    <PageChrome
      title={editing ? "Edit Rack" : rack.name}
      backTo="/stock/racks"
      aside={
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={busy || !name.trim()}
                className="h-8"
              >
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setName(rack.name)
                  setLocation(rack.location)
                  setEditing(false)
                }}
                disabled={busy}
                className="h-8 text-muted-foreground"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/stock/racks/$id",
                    params: { id: rack.id },
                    search: { view: "print" },
                  })
                }
                className="h-8"
              >
                <HugeiconsIcon icon={PrinterIcon} size={14} strokeWidth={1.8} />
                Print
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
                className="h-8"
              >
                Edit
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                aria-label="Delete rack"
                className="inline-flex size-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="rounded-xl border-2 border-border bg-card">
          <div className="border-b-2 border-border bg-muted/50 px-4 py-3">
            {editing ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rack-name">Name</Label>
                  <Input
                    id="rack-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-base sm:text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rack-location">Location</Label>
                  <Input
                    id="rack-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="text-base sm:text-sm"
                  />
                  <LocationChips
                    locations={locations}
                    value={location}
                    onSelect={setLocation}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-base font-bold">{rack.name}</h2>
                {rack.location && (
                  <p className="mt-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    {rack.location}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <span className="font-mono text-xs text-muted-foreground">
                {rack.qrCode}
              </span>
            </div>
            <RackQr code={rack.qrCode} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            {rack.items.length} {rack.items.length === 1 ? "item" : "items"}{" "}
            &middot; {totalQty} total units
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigate({
                to: "/stock/racks/$id/items",
                params: { id: rack.id },
              })
            }
            className="h-8 shrink-0"
          >
            Edit items
          </Button>
        </div>

        {rack.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-xs text-muted-foreground">
              No items on this rack yet. Use "Edit items" to add some.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rack.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  navigate({ to: "/stock/$id/edit", params: { id: item.id } })
                }
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-accent">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="size-full rounded-lg object-cover"
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={BoxIcon}
                      size={22}
                      strokeWidth={1.5}
                      className="text-primary"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold">
                      {item.name}
                    </h3>
                    {item.kind === "bulk" && (
                      <span className="shrink-0 text-sm font-bold">
                        &times;{item.rackQty}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {item.qrCode}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge
                      variant={item.tagged ? "available" : "neutral"}
                      className="text-[9px]"
                    >
                      {item.tagged ? "Tagged" : "Untagged"}
                    </Badge>
                    <Badge
                      variant={getStatusBadgeVariant(item.status)}
                      className="text-[9px]"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageChrome>
  )
}

function RackPrintView({
  rack,
}: {
  rack: NonNullable<Awaited<ReturnType<typeof getRack>>>
}) {
  const router = useRouter()
  const [rackQr, setRackQr] = useState<string | null>(null)
  const [itemQrs, setItemQrs] = useState<Map<string, string>>(new Map())
  const pages = useMemo(
    () =>
      rack.items.length === 0
        ? [[]]
        : chunkByPage(rack.items, RACK_ROWS_PER_PAGE),
    [rack.items]
  )

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(rack.qrCode, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setRackQr(url)
      })
      .catch(() => {
        if (!cancelled) setRackQr(null)
      })
    Promise.all(
      rack.items.map(async (item) => {
        const url = await QRCode.toDataURL(item.qrCode, {
          width: 120,
          margin: 0,
        }).catch(() => null)
        return { id: item.id, url }
      })
    ).then((results) => {
      if (!cancelled) {
        setItemQrs(
          new Map(
            results
              .filter((r): r is { id: string; url: string } => r.url !== null)
              .map((r) => [r.id, r.url])
          )
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [rack])

  return (
    <div className="min-h-svh bg-white">
      <style>{`
        @media print {
          .print-sheet { border: 1px solid #000 !important; border-radius: 0 !important; }
          .print-row { border-bottom: 1px solid #000 !important; break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => router.history.back()}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Button>
        <h1 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Print Rack Sheet{pages.length > 1 ? ` — ${pages.length} pages` : ""}
        </h1>
        <Button size="sm" onClick={() => window.print()} disabled={!rackQr}>
          <HugeiconsIcon icon={PrinterIcon} size={16} />
          {pages.length > 1 ? `Print (${pages.length} pages)` : "Print"}
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 px-4 py-8 print:gap-0 print:p-0">
        {pages.map((pageItems, pi) => (
          <div key={pi} className="flex w-full flex-col items-center gap-3">
            <div
              className={cn(
                "print-sheet w-full max-w-md rounded-xl border-2 border-border bg-white p-5 print:max-w-full print:rounded-none print:border print:border-black print:p-4",
                pi < pages.length - 1 && "print:break-after-page"
              )}
            >
              {pages.length > 1 && (
                <p className="mb-3 text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase print:hidden">
                  Page {pi + 1} of {pages.length}
                </p>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold tracking-wider uppercase">
                    {rack.name}
                  </h2>
                  <p className="mt-1 font-mono text-[10px] font-bold tracking-wider text-muted-foreground">
                    {rack.qrCode}
                  </p>
                  {rack.location && (
                    <p className="mt-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                      {rack.location}
                    </p>
                  )}
                </div>
                {rackQr ? (
                  <img
                    src={rackQr}
                    alt={`QR: ${rack.qrCode}`}
                    className="size-28 shrink-0 print:size-28"
                  />
                ) : (
                  <div className="size-28 shrink-0 rounded border border-border bg-muted" />
                )}
              </div>

              <hr className="my-4 border-border print:border-black" />

              {pageItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No items
                </div>
              ) : (
                <div className="flex flex-col">
                  {pageItems.map((item) => (
                    <div
                      key={item.id}
                      className="print-row flex items-start justify-between gap-4 border-b border-dashed border-border py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="font-mono text-[10px] tracking-wider text-muted-foreground">
                          {item.qrCode}
                        </p>
                      </div>
                      {itemQrs.get(item.id) ? (
                        <img
                          src={itemQrs.get(item.id)}
                          alt={`QR: ${item.qrCode}`}
                          className="size-16 shrink-0 print:size-16"
                        />
                      ) : (
                        <div className="size-16 shrink-0 rounded border border-border bg-muted" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {pages.length > 1 && pi < pages.length - 1 && (
              <div className="flex w-full max-w-md items-center gap-2 print:hidden">
                <span className="h-px flex-1 border-t border-dashed border-border" />
                <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                  Page break
                </span>
                <span className="h-px flex-1 border-t border-dashed border-border" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RackQr({ code }: { code: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    QRCode.toDataURL(code, {
      width: 160,
      margin: 1,
      color: { dark: "#000", light: "#fff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
  }, [code])
  if (!dataUrl) return null
  return (
    <img
      src={dataUrl}
      alt={`QR: ${code}`}
      className="size-20 shrink-0 rounded-lg"
    />
  )
}
