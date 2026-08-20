import {
  createFileRoute,
  useNavigate,
  useRouter,
  useMatch,
  Outlet,
  notFound,
} from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon, PrinterIcon } from "@hugeicons/core-free-icons"
import { getRack } from "@/lib/racks"
import { getLocations } from "@/lib/inventory"
import { getQrImage } from "@/lib/qr"
import { printRackSheet } from "@/lib/print"
import { useUpdateRack, useDeleteRack } from "@/lib/queries"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getStatusBadgeVariant, useCompactCards } from "@/components/ItemCard"
import { PageChrome } from "@/components/PageChrome"
import { LocationChips } from "@/components/LocationChips"
import { TrashIcon } from "@/components/icons"

export const Route = createFileRoute("/stock/racks/$id")({
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
  const navigate = useNavigate()
  // `/stock/racks/$id/items` is a child route — render it in place of the
  // detail view when it matches (this layout has no outlet of its own).
  const onItemsRoute = useMatch({
    from: "/stock/racks/$id/items",
    shouldThrow: false,
  })

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
  const [compactItems, setCompactItems] = useCompactCards()

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

  const handlePrint = async () => {
    try {
      await printRackSheet(
        { name: rack.name, qrCode: rack.qrCode, location: rack.location },
        rack.items.map((it) => ({ name: it.name, qrCode: it.qrCode }))
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : "Print failed")
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
                onClick={handlePrint}
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
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCompactItems((v) => !v)}
              className="h-8 text-[10px] text-muted-foreground"
            >
              {compactItems ? "Full" : "Compact"}
            </Button>
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
                className={
                  compactItems
                    ? "flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-card p-2.5 text-left transition-all hover:border-primary"
                    : "flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary"
                }
              >
                {compactItems ? (
                  <>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-accent">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="size-full rounded-lg object-cover"
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={BoxIcon}
                          size={18}
                          strokeWidth={1.5}
                          className="text-primary"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-xs font-semibold">
                          {item.name}
                        </h3>
                        {item.kind === "bulk" && (
                          <span className="shrink-0 text-xs font-bold">
                            &times;{item.rackQty}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
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
                  </>
                ) : (
                  <>
                    <div className="flex w-full shrink-0 items-center justify-center overflow-hidden border-b border-border bg-accent">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center">
                          <HugeiconsIcon
                            icon={BoxIcon}
                            size={36}
                            strokeWidth={1.5}
                            className="text-primary"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 p-3">
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
                      <div className="flex flex-wrap items-center gap-1">
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
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </PageChrome>
  )
}

function RackQr({ code }: { code: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    getQrImage(code, { width: 160, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
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
