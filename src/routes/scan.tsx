import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"
import { useCallback, useEffect, useRef, useState } from "react"
import { getDb } from "@/lib/db"
import { items } from "@/lib/schema"
import {
  requireOrg as requireOrgData,
  getItemByQrCode,
  updateItem,
} from "@/lib/inventory"
import type { ItemStatus } from "@/lib/item-status"
import { requireOrg } from "@/lib/auth-guard"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ScannerModal } from "@/components/ScannerModal"
import { BulkScannerModal } from "@/components/BulkScannerModal"
import type { BulkResult } from "@/components/BulkScannerModal"
import { ItemEditModal } from "@/components/ItemEditModal"
import { ItemCreateModal } from "@/components/ItemCreateModal"
import { QRTagModal } from "@/components/QRTagModal"
import { BoltIcon, WrenchIcon, PlusIcon, EditIcon } from "@/components/icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon } from "@hugeicons/core-free-icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { InventoryItem } from "@/components/ItemEditModal"
import { getStatusBadgeVariant } from "@/components/ItemCard"

const loadScan = createServerFn({ method: "GET" }).handler(async () => {
  const { orgId } = await requireOrgData()
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

export const Route = createFileRoute("/scan")({
  validateSearch: (search: Record<string, unknown>): ScanSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  beforeLoad: async () => {
    await requireOrg()
  },
  loader: async () => loadScan(),
  component: ScanRoute,
})

function ScanRoute() {
  const { recent } = Route.useLoaderData()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null)
  const [scanError, setScanError] = useState("")
  const [scanMessage, setScanMessage] = useState("")
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [createPrefillQr, setCreatePrefillQr] = useState<string | undefined>()
  const [bulkOpen, setBulkOpen] = useState(false)
  const initialCodeRef = useRef<string | undefined>(search.code)

  const handleDetected = async (code: string) => {
    setScannerOpen(false)
    setScanError("")
    setScanMessage("")
    try {
      const found = await getItemByQrCode({ data: code })
      if (found) {
        setScannedItem(found)
        setScanMessage("Tag scanned successfully!")
      } else {
        setScannedItem(null)
        setScanError(`Tag "${code}" not found. You can register it below.`)
        setCreatePrefillQr(code)
      }
    } catch {
      setScanError("Error looking up item code.")
    }
  }

  useEffect(() => {
    if (initialCodeRef.current) {
      const code = initialCodeRef.current
      initialCodeRef.current = undefined
      void handleDetected(code)
    }
  }, [])

  const handleQuickStatus = async (
    item: InventoryItem,
    newStatus: ItemStatus,
    newLocation?: string
  ) => {
    const updates: Partial<InventoryItem> = { status: newStatus }
    if (newLocation) updates.location = newLocation
    if (newStatus === "Repair") updates.condition = "Repair"
    try {
      const updated = await updateItem({ data: { id: item.id, item: updates } })
      setScannedItem(updated)
      setScanMessage(`Status set to ${newStatus}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status")
    }
  }

  const openRegister = (code?: string) => {
    setCreatePrefillQr(code)
    setCreateOpen(true)
  }

  const bulkLookupAndUpdate = useCallback(
    async (
      qrCode: string,
      status: ItemStatus,
      location: string
    ): Promise<BulkResult> => {
      if (!location.trim()) {
        return {
          qrCode,
          ok: false,
          message: "Location is required for bulk updates",
        }
      }
      try {
        const found = await getItemByQrCode({ data: qrCode })
        if (!found) {
          return { qrCode, ok: false, message: "Tag not found in inventory" }
        }
        const updated = await updateItem({
          data: { id: found.id, item: { status, location: location.trim() } },
        })
        return {
          qrCode,
          ok: true,
          message: `${status} · ${location.trim()}`,
          itemName: updated.name,
        }
      } catch (err) {
        return {
          qrCode,
          ok: false,
          message: err instanceof Error ? err.message : "Update failed",
        }
      }
    },
    []
  )

  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader onScanClick={() => setScannerOpen(true)} />

        <div className="mt-5 space-y-4">
          <h2 className="text-base font-semibold">Scan Asset Tag</h2>

          {recent.length > 0 && (
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
                      className="cursor-pointer rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-accent"
                    >
                      🏷️ {item.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!scannerOpen && !scannedItem && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setScannerOpen(true)}
                className="flex h-auto items-center justify-center py-3"
              >
                <HugeiconsIcon icon={BoxIcon} size={18} strokeWidth={1.5} />
                Scan one
              </Button>
              <Button onClick={() => setBulkOpen(true)} className="h-auto py-3">
                <BoltIcon />
                Bulk scan
              </Button>
            </div>
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
                    Quick Ops Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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
                        className="h-10"
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
                        className="h-10 bg-success hover:bg-success/90"
                      >
                        <BoltIcon />
                        Check In
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() =>
                        handleQuickStatus(scannedItem, "Repair", "Intake bench")
                      }
                    >
                      <WrenchIcon />
                      Report Damaged
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() => setQrOpen(true)}
                    >
                      Show QR
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() => setEditOpen(true)}
                    >
                      <EditIcon />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : scanError ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="mb-4 text-xs text-muted-foreground">{scanError}</p>
              <Button
                onClick={() => openRegister(createPrefillQr)}
                className="w-full"
              >
                <PlusIcon />
                Register Item to tag
              </Button>
            </div>
          ) : null}

          <div className="pt-2">
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => navigate({ to: "/stock" })}
            >
              Browse full inventory
            </Button>
          </div>
        </div>
      </section>

      <BottomNav active="scan" />

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleDetected}
      />
      <BulkScannerModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        lookupAndUpdate={bulkLookupAndUpdate}
      />
      <ItemEditModal
        open={editOpen}
        item={scannedItem}
        onClose={() => setEditOpen(false)}
        onSubmit={async () => setEditOpen(false)}
        onDelete={async () => {
          setEditOpen(false)
          setScannedItem(null)
        }}
      />
      <ItemCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialQrCode={createPrefillQr}
        onSubmit={async (item) => {
          setCreateOpen(false)
          setScanError("")
          setScanMessage(`Registered: ${item.name}`)
        }}
      />
      {scannedItem && (
        <QRTagModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          qrCode={scannedItem.qrCode}
          itemName={scannedItem.name}
          itemId={scannedItem.id}
        />
      )}
    </main>
  )
}
