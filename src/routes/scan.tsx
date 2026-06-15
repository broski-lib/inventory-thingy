import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { desc } from "drizzle-orm"
import { useEffect, useRef, useState } from "react"
import { getDb } from "@/lib/db"
import { items } from "@/lib/schema"
import { requireUser, getItemByQrCode, updateItem } from "@/lib/inventory"
import { requireAuth } from "@/lib/auth-guard"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"
import { ScannerModal } from "@/components/ScannerModal"
import { ItemEditModal } from "@/components/ItemEditModal"
import { ItemCreateModal } from "@/components/ItemCreateModal"
import { QRTagModal } from "@/components/QRTagModal"
import { BoltIcon, WrenchIcon, PlusIcon, EditIcon } from "@/components/icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import type { InventoryItem } from "@/components/ItemEditModal"

const loadScan = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser()
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
    await requireAuth()
  },
  loader: async () => loadScan(),
  component: ScanRoute,
})

function ScanRoute() {
  const { recent } = Route.useLoaderData()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [scannerOpen, setScannerOpen] = useState(!search.code)
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null)
  const [scanError, setScanError] = useState("")
  const [scanMessage, setScanMessage] = useState("")
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [createPrefillQr, setCreatePrefillQr] = useState<string | undefined>()
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

  const handleQuickStatus = async (item: InventoryItem, newStatus: string, newLocation?: string) => {
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

  return (
    <main className="min-h-svh bg-[#f7f8f4] text-[#20231f] pb-24">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">
        <AppHeader onScanClick={() => setScannerOpen(true)} />

        <div className="space-y-4 mt-5">
          <h2 className="text-base font-semibold">Scan Asset Tag</h2>

          {recent.length > 0 && (
            <div className="bg-white border border-[#dfe3dc] rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-[#6d7569] uppercase tracking-wider mb-2">Recent tags</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDetected(item.qrCode)}
                    className="text-xs bg-[#f7f8f4] border border-[#dfe3dc] rounded-full px-3 py-1.5 hover:bg-[#eef2ea] hover:border-[#23312b] transition-all cursor-pointer font-medium text-[#20231f]"
                  >
                    🏷️ {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!scannerOpen && !scannedItem && (
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#dfe3dc] bg-white py-3 cursor-pointer hover:bg-[#f7f8f4] text-xs font-semibold uppercase tracking-wider text-[#20231f]"
            >
              <HugeiconsIcon icon={BoxIcon} size={18} strokeWidth={1.5} />
              Open scanner
            </button>
          )}

          {scanError && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-100 rounded-xl">
              {scanError}
            </div>
          )}
          {scanMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs border border-emerald-100 rounded-xl flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              {scanMessage}
            </div>
          )}

          {scannedItem ? (
            <div className="bg-white border border-[#dfe3dc] rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex gap-3">
                <div className="size-16 shrink-0 rounded-lg bg-[#eef2ea] border border-[#dfe3dc] overflow-hidden">
                  {scannedItem.imageUrl ? (
                    <img src={scannedItem.imageUrl} alt={scannedItem.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[#23312b]">
                      <HugeiconsIcon icon={BoxIcon} size={28} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-sm truncate text-[#20231f]">{scannedItem.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-[#dfe3dc] bg-slate-50 text-slate-700">
                      {scannedItem.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#6d7569] font-mono">{scannedItem.qrCode}</p>
                  <p className="text-xs text-[#6d7569] line-clamp-2">{scannedItem.description || "No description provided."}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-dashed border-[#dfe3dc]">
                <div>
                  <span className="text-[#6d7569] block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-medium">{scannedItem.location}</span>
                </div>
                <div>
                  <span className="text-[#6d7569] block text-[10px] uppercase font-bold">Condition</span>
                  <span className="font-medium">{scannedItem.condition}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6d7569]">Quick Ops Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {scannedItem.status !== "Reserved" && scannedItem.status !== "Staged" ? (
                    <Button
                      className="h-10 bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center"
                      onClick={() => handleQuickStatus(scannedItem, "Reserved", "Staging Staged")}
                    >
                      <BoltIcon />
                      Check Out
                    </Button>
                  ) : (
                    <Button
                      className="h-10 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center"
                      onClick={() => handleQuickStatus(scannedItem, "In Storage", "Warehouse A, Bay 1")}
                    >
                      <BoltIcon />
                      Check In
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="h-10 border-[#dfe3dc] text-xs font-semibold rounded-lg hover:bg-neutral-50 cursor-pointer flex items-center justify-center text-[#20231f]"
                    onClick={() => handleQuickStatus(scannedItem, "Repair", "Intake bench")}
                  >
                    <WrenchIcon />
                    Report Damaged
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-10 border-[#dfe3dc] text-[#20231f] hover:bg-neutral-50 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center"
                    onClick={() => setQrOpen(true)}
                  >
                    Show QR
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 border-[#dfe3dc] text-[#20231f] hover:bg-neutral-50 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center"
                    onClick={() => setEditOpen(true)}
                  >
                    <EditIcon />
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ) : scanError ? (
            <div className="text-center p-6 border border-dashed border-[#dfe3dc] bg-white rounded-xl">
              <p className="text-xs text-[#6d7569] mb-4">{scanError}</p>
              <Button
                className="bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold px-4 h-10 rounded-lg cursor-pointer inline-flex items-center gap-1 justify-center w-full"
                onClick={() => openRegister(createPrefillQr)}
              >
                <PlusIcon />
                Register Item to tag
              </Button>
            </div>
          ) : null}

          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full h-11 border-[#dfe3dc] text-[#20231f] hover:bg-neutral-50 text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center justify-center"
              onClick={() => navigate({ to: "/stock" })}
            >
              Browse full inventory
            </Button>
          </div>
        </div>
      </section>

      <BottomNav active="scan" />

      <ScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleDetected} />
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
