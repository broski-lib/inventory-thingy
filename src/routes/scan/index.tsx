import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon, Camera01Icon } from "@hugeicons/core-free-icons"
import type { InventoryItem } from "@/lib/inventory"
import { loadScan, lookupItem } from "@/lib/scan-queries"
import { getMostCommonLocation } from "@/lib/inventory"
import { useUpdateItem } from "@/lib/queries"
import { BatchManager } from "@/components/BatchManager"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { BoltIcon, EditIcon } from "@/components/icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { getStatusBadgeVariant } from "@/components/ItemCard"
import type { ItemStatus } from "@/lib/item-status"
import { ITEM_STATUSES } from "@/lib/item-status"
import { cn } from "@/lib/utils"

type ScanSearch = {
  code?: string
}

export const Route = createFileRoute("/scan/")({
  validateSearch: (search: Record<string, unknown>): ScanSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ deps }) => {
    const [{ recent }, lookup, defaultLocation] = await Promise.all([
      loadScan(),
      deps.code ? lookupItem({ data: deps.code }) : Promise.resolve(null),
      getMostCommonLocation(),
    ])
    return { recent, lookup, defaultLocation }
  },
  component: ScanRoute,
})

function ScanRoute() {
  const { recent, lookup, defaultLocation } = Route.useLoaderData()
  const navigate = useNavigate()
  const [scanMessage, setScanMessage] = useState("")
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const updateItemMutation = useUpdateItem()

  const fallbackLocation = defaultLocation ?? "Warehouse A, Bay 1"

  const scannedItem = lookup?.item ?? null
  const scannedBatches = lookup?.batches ?? []
  const isBulk = scannedItem?.kind === "bulk"
  const failedCode = lookup && !lookup.item ? lookup.code : null
  const showResult = scannedItem || failedCode

  const handleQuickStatus = async (
    item: InventoryItem,
    newStatus: ItemStatus,
    newLocation: string
  ) => {
    const updates: Partial<InventoryItem> = {
      status: newStatus,
      location: newLocation,
    }
    if (newStatus === "Repair") updates.condition = "Repair"
    try {
      const updated = await updateItemMutation.mutateAsync({
        id: item.id,
        item: updates,
      })
      setScanMessage(`Status set to ${newStatus}`)
      navigate({
        to: "/scan",
        search: { code: updated.qrCode },
        replace: true,
      })
    } catch (err) {
      setScanMessage(
        err instanceof Error ? err.message : "Failed to update status"
      )
    }
  }

  const scanAnother = () => {
    setScanMessage("")
    navigate({ to: "/scan/camera" })
  }

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AppHeader />

        <div className="mt-5 space-y-4">
          <h2 className="text-base font-semibold">Scan Asset Tag</h2>

          {!showResult && (
            <div className="flex flex-col gap-3">
              <Link
                to="/scan/camera"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "h-14 justify-center gap-2 text-base"
                )}
              >
                <HugeiconsIcon
                  icon={Camera01Icon}
                  size={20}
                  strokeWidth={1.6}
                />
                Open camera
              </Link>
              <Link
                to="/scan/bulk"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 justify-center gap-2"
                )}
              >
                <BoltIcon />
                Bulk scan
              </Link>
            </div>
          )}

          {recent.length > 0 && !showResult && (
            <Card>
              <CardContent className="gap-2">
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Recent items
                </p>
                <div className="flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <Link
                      key={item.id}
                      to="/scan"
                      search={{ code: item.qrCode }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-accent"
                    >
                      <HugeiconsIcon
                        icon={BoxIcon}
                        size={12}
                        strokeWidth={1.5}
                      />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {failedCode && (
            <Alert variant="destructive">
              <AlertDescription>
                Tag &ldquo;{failedCode}&rdquo; not found. You can register it to
                your inventory.
              </AlertDescription>
            </Alert>
          )}
          {scanMessage && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <span className="size-2 animate-ping rounded-full bg-success" />
                {scanMessage}
              </AlertDescription>
            </Alert>
          )}

          {scannedItem ? (
            <Card>
              <CardContent className="gap-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      scannedItem.imageUrl &&
                      setPreviewImage(scannedItem.imageUrl)
                    }
                    className="size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-accent"
                    aria-label="View full image"
                  >
                    {scannedItem.imageUrl ? (
                      <img
                        src={scannedItem.imageUrl}
                        alt={scannedItem.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-primary">
                        <HugeiconsIcon
                          icon={BoxIcon}
                          size={36}
                          strokeWidth={1.5}
                        />
                      </div>
                    )}
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {scannedItem.name}
                      </h3>
                      {isBulk ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge
                            variant={
                              scannedItem.tagged ? "available" : "neutral"
                            }
                          >
                            {scannedItem.tagged ? "Tagged" : "Untagged"}
                          </Badge>
                          <Badge variant="neutral">
                            ×{scannedBatches.reduce((sum, b) => sum + b.qty, 0)}
                          </Badge>
                        </div>
                      ) : (
                        <Badge
                          variant={getStatusBadgeVariant(scannedItem.status)}
                        >
                          {scannedItem.status}
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {scannedItem.qrCode}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {scannedItem.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {!isBulk && (
                  <div className="grid grid-cols-2 gap-2 border-y border-dashed border-border py-2 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                        Location
                      </span>
                      <span className="font-medium">
                        {scannedItem.location}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                        Condition
                      </span>
                      <span className="font-medium">
                        {scannedItem.condition}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Quick Ops
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {!isBulk && (
                      <Select
                        value={scannedItem.status}
                        onValueChange={(v) =>
                          handleQuickStatus(
                            scannedItem,
                            v as ItemStatus,
                            scannedItem.location
                          )
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() =>
                        navigate({
                          to: "/stock/$id/edit",
                          params: { id: scannedItem.id },
                        })
                      }
                    >
                      <EditIcon />
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() =>
                        navigate({
                          to: "/stock/$id/qr",
                          params: { id: scannedItem.id },
                        })
                      }
                    >
                      Show QR
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11 text-muted-foreground"
                      onClick={scanAnother}
                    >
                      Scan another
                    </Button>
                  </div>
                </div>
              </CardContent>

              {isBulk && (
                <BatchManager
                  itemId={scannedItem.id}
                  batches={scannedBatches}
                />
              )}

              {!isBulk && (
                <div className="sticky bottom-24 -mx-4 mt-4 border-t border-border bg-secondary px-4 pt-3 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
                  {scannedItem.status === "Pending Tag" ? (
                    <Button
                      onClick={() =>
                        handleQuickStatus(
                          scannedItem,
                          "In Storage",
                          fallbackLocation
                        )
                      }
                      className="h-12 w-full px-6"
                    >
                      <BoltIcon />
                      Mark Tag Added
                    </Button>
                  ) : scannedItem.status !== "Reserved" &&
                    scannedItem.status !== "Staged" ? (
                    <Button
                      onClick={() =>
                        handleQuickStatus(
                          scannedItem,
                          "Reserved",
                          "Staging Staged"
                        )
                      }
                      className="h-12 w-full px-6"
                    >
                      <BoltIcon />
                      Check Out
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        handleQuickStatus(
                          scannedItem,
                          "In Storage",
                          fallbackLocation
                        )
                      }
                      className="h-12 w-full bg-success px-6 hover:bg-success/90"
                    >
                      <BoltIcon />
                      Check In
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ) : failedCode ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Button
                onClick={() =>
                  navigate({
                    to: "/stock/new",
                    search: { qr: failedCode },
                  })
                }
                className="w-full"
              >
                <EditIcon />
                Register Item to tag
              </Button>
              <button
                type="button"
                onClick={scanAnother}
                className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Scan another
              </button>
            </div>
          ) : null}

          {!showResult && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => navigate({ to: "/stock" })}
              >
                Browse full inventory
              </Button>
            </div>
          )}
        </div>
      </section>
      <BottomNav />

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-background/20 text-white backdrop-blur"
            aria-label="Close preview"
          >
            ×
          </button>
          <img
            src={previewImage}
            alt="Item preview"
            className="max-h-[85vh] max-w-full rounded-xl border border-border object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  )
}
