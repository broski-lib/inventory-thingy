import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"
import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon, Camera01Icon } from "@hugeicons/core-free-icons"
import { getDb } from "@/lib/db"
import { items } from "@/lib/schema"
import { authRequiredMiddleware } from "@/lib/auth-middleware"
import { getItemByQrCode, updateItem } from "@/lib/inventory"
import type { InventoryItem } from "@/lib/inventory"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { BoltIcon, WrenchIcon, EditIcon } from "@/components/icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getStatusBadgeVariant } from "@/components/ItemCard"
import type { ItemStatus } from "@/lib/item-status"
import { cn } from "@/lib/utils"

const loadScan = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }) => {
    const { orgId } = context
    const db = getDb()
    const recent = await db
      .select({
        id: items.id,
        qrCode: items.qrCode,
        name: items.name,
        imageUrl: items.imageUrl,
        status: items.status,
      })
      .from(items)
      .where(eq(items.orgId, orgId))
      .orderBy(desc(items.updatedAt))
      .limit(8)
    return { recent }
  })

type ScanSearch = {
  code?: string
}

export const Route = createFileRoute("/scan/")({
  validateSearch: (search: Record<string, unknown>): ScanSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  loader: async () => loadScan(),
  component: ScanRoute,
})

function ScanRoute() {
  const { recent } = Route.useLoaderData()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const initialCodeRef = useRef<string | undefined>(search.code)

  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null)
  const [scanError, setScanError] = useState("")
  const [scanMessage, setScanMessage] = useState("")

  const handleDetected = async (code: string) => {
    setScanError("")
    setScanMessage("")
    try {
      const found = await getItemByQrCode({ data: code })
      if (found) {
        setScannedItem(found)
        setScanMessage("Tag scanned successfully!")
      } else {
        setScannedItem(null)
        setScanError(
          `Tag "${code}" not found. You can register it to your inventory.`
        )
      }
    } catch {
      setScanError("Error looking up item code.")
    }
  }

  useEffect(() => {
    const initial = initialCodeRef.current
    if (!initial) return
    initialCodeRef.current = undefined
    void handleDetected(initial)
  }, [])

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
      const updated = await updateItem({ data: { id: item.id, item: updates } })
      setScannedItem(updated)
      setScanMessage(`Status set to ${newStatus}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  const showResult = scannedItem || scanError

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
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
                  Recent tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleDetected(item.qrCode)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-accent"
                    >
                      <HugeiconsIcon
                        icon={BoxIcon}
                        size={12}
                        strokeWidth={1.5}
                      />
                      {item.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {scanError && (
            <Alert variant="destructive">
              <AlertDescription>{scanError}</AlertDescription>
            </Alert>
          )}
          {scanMessage && (
            <Alert variant="success">
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
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-accent">
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
                          size={28}
                          strokeWidth={1.5}
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {scannedItem.name}
                      </h3>
                      <Badge
                        variant={getStatusBadgeVariant(scannedItem.status)}
                      >
                        {scannedItem.status}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {scannedItem.qrCode}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {scannedItem.description || "No description provided."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-y border-dashed border-border py-2 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                      Location
                    </span>
                    <span className="font-medium">{scannedItem.location}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                      Condition
                    </span>
                    <span className="font-medium">{scannedItem.condition}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Quick Ops
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-11"
                      onClick={() =>
                        handleQuickStatus(scannedItem, "Repair", "Intake bench")
                      }
                    >
                      <WrenchIcon />
                      Report Damaged
                    </Button>
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
                      onClick={() => {
                        setScannedItem(null)
                        setScanError("")
                        setScanMessage("")
                      }}
                    >
                      Scan another
                    </Button>
                  </div>
                </div>
              </CardContent>

              <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
                {scannedItem.status !== "Reserved" &&
                scannedItem.status !== "Staged" ? (
                  <Button
                    onClick={() =>
                      handleQuickStatus(
                        scannedItem,
                        "Reserved",
                        "Staging Staged"
                      )
                    }
                    className="h-12 w-full"
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
                        "Warehouse A, Bay 1"
                      )
                    }
                    className="h-12 w-full bg-success hover:bg-success/90"
                  >
                    <BoltIcon />
                    Check In
                  </Button>
                )}
              </div>
            </Card>
          ) : scanError ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="mb-4 text-xs text-muted-foreground">{scanError}</p>
              <Button
                onClick={() => {
                  const match = scanError.match(/"([^"]+)"/)
                  const qrCode = match?.[1]
                  navigate({
                    to: "/stock/new",
                    search: qrCode ? { qr: qrCode } : undefined,
                  })
                }}
                className="w-full"
              >
                <EditIcon />
                Register Item to tag
              </Button>
              <button
                type="button"
                onClick={() => {
                  setScanError("")
                  setScanMessage("")
                }}
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
      <BottomNav active="scan" />
    </main>
  )
}
