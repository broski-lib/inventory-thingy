import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useState } from "react"
import {
  BarcodeScanIcon,
  BoxIcon,
  Camera01Icon,
  DeliveryTruck01Icon,
  Home01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/tanstack-react-start"
import { auth } from "@clerk/tanstack-react-start/server"

import { Button } from "@/components/ui/button"
import {
  getItems,
  getStats,
  getItemByQrCode,
  createItem,
  updateItem,
  deleteItem,
} from "@/lib/inventory"

const getInitialData = createServerFn({ method: "GET" }).handler(async () => {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return {
      signedIn: false as const,
      initialItems: [],
      initialStats: { statusCounts: [], movesToday: 0 },
    }
  }

  const initialItems = await getItems()
  const initialStats = await getStats()

  return {
    signedIn: true as const,
    initialItems,
    initialStats,
  }
})

export const Route = createFileRoute("/")({
  loader: async () => getInitialData(),
  component: App,
})

const EditIcon = () => (
  <svg className="size-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const LocationIcon = () => (
  <svg className="size-3.5 mr-1 inline text-[#6d7569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="size-3.5 mr-1 inline text-[#6d7569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const PlusIcon = () => (
  <svg className="size-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
)

const BoltIcon = () => (
  <svg className="size-3.5 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const WrenchIcon = () => (
  <svg className="size-3.5 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const movesWorkflow = ["Scan QR", "Confirm item", "Set room", "Add photo"]

function App() {
  return (
    <>
      <Show when="signed-out">
        <SignedOutView />
      </Show>
      <Show when="signed-in">
        <Dashboard />
      </Show>
    </>
  )
}

function SignedOutView() {
  return (
    <main className="min-h-svh bg-[#f7f8f4] text-[#20231f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#dfe3dc] rounded-2xl p-8 shadow-sm transition-all duration-300">
        <div className="text-center mb-8">
          <p className="text-xs font-bold tracking-[0.2em] text-[#6d7569] uppercase">
            inventory-thingy
          </p>
          <h2 className="text-3xl font-semibold mt-2 tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-[#6d7569] mt-2">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SignInButton mode="modal">
            <Button className="w-full h-11 rounded-lg bg-[#23312b] text-white font-semibold uppercase tracking-wider text-xs hover:bg-[#1a2520] transition-colors cursor-pointer">
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button
              variant="outline"
              className="w-full h-11 rounded-lg border-[#dfe3dc] text-[#23312b] font-semibold uppercase tracking-wider text-xs hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Create Account
            </Button>
          </SignUpButton>
        </div>
      </div>
    </main>
  )
}

function Dashboard() {
  const { initialItems, initialStats } = Route.useLoaderData()
  const { user } = useUser()

  const [items, setItems] = useState(initialItems)
  const [stats, setStats] = useState(initialStats)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"home" | "scan" | "stock">("home")
  const [statusFilter, setStatusFilter] = useState<string>("All")

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const [formQrCode, setFormQrCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCondition, setFormCondition] = useState("Good")
  const [formLocation, setFormLocation] = useState("")
  const [formStatus, setFormStatus] = useState("In Storage")
  const [formImageUrl, setFormImageUrl] = useState("")

  const [scanInputCode, setScanInputCode] = useState("")
  const [scannedItem, setScannedItem] = useState<any>(null)
  const [scanError, setScanError] = useState("")
  const [scanMessage, setScanMessage] = useState("")

  const displayName = user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "User"
  const displayEmail = user?.emailAddresses[0]?.emailAddress || ""

  const refreshData = async () => {
    try {
      const [newItems, newStats] = await Promise.all([
        getItems({ data: searchQuery }),
        getStats(),
      ])
      setItems(newItems)
      setStats(newStats)
    } catch (err) {
      console.error("Failed to refresh inventory:", err)
    }
  }

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    try {
      const results = await getItems({ data: value })
      setItems(results)
    } catch (err) {
      console.error("Search failed:", err)
    }
  }

  const openEditModal = (item: any) => {
    setSelectedItem(item)
    setFormName(item.name)
    setFormDescription(item.description)
    setFormCondition(item.condition)
    setFormLocation(item.location)
    setFormStatus(item.status)
    setFormImageUrl(item.imageUrl)
    setIsEditModalOpen(true)
  }

  const openCreateModal = () => {
    setFormQrCode(`ITG-${["SFA", "TBL", "CHR", "LGT"][Math.floor(Math.random() * 4)]}-${Math.floor(1000 + Math.random() * 9000)}`)
    setFormName("")
    setFormDescription("")
    setFormCondition("Good")
    setFormLocation("")
    setFormStatus("In Storage")
    setFormImageUrl("")
    setIsCreateModalOpen(true)
  }

  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formQrCode.trim() || !formName.trim() || !formLocation.trim()) {
      alert("QR Code, Name, and Location are required.")
      return
    }

    try {
      const created = await createItem({
        data: {
          qrCode: formQrCode.trim(),
          name: formName.trim(),
          description: formDescription.trim(),
          condition: formCondition,
          location: formLocation.trim(),
          status: formStatus,
          imageUrl: formImageUrl.trim() || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&auto=format&fit=crop&q=60",
        }
      })

      setIsCreateModalOpen(false)
      await refreshData()

      if (activeTab === "scan") {
        setScannedItem(created)
        setScanMessage(`Successfully registered & selected item: ${created.name}`)
        setScanError("")
      }
    } catch (err: any) {
      alert(err.message || "Failed to create item.")
    }
  }

  const handleUpdateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    try {
      const updated = await updateItem({
        data: {
          id: selectedItem.id,
          item: {
            name: formName.trim(),
            description: formDescription.trim(),
            condition: formCondition,
            location: formLocation.trim(),
            status: formStatus,
            imageUrl: formImageUrl.trim(),
          },
        }
      })

      setIsEditModalOpen(false)
      setSelectedItem(null)
      await refreshData()

      if (scannedItem && scannedItem.id === selectedItem.id) {
        setScannedItem(updated)
      }
    } catch (err: any) {
      alert(err.message || "Failed to update item.")
    }
  }

  const handleDeleteItemClick = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    try {
      await deleteItem({ data: id })
      setIsEditModalOpen(false)
      setSelectedItem(null)
      if (scannedItem && scannedItem.id === id) {
        setScannedItem(null)
        setScanMessage("")
      }
      await refreshData()
    } catch (err: any) {
      alert(err.message || "Failed to delete item.")
    }
  }

  const handleScanLookup = async (code: string) => {
    if (!code.trim()) return
    setScanError("")
    setScanMessage("")
    try {
      const found = await getItemByQrCode({ data: code.trim() })
      if (found) {
        setScannedItem(found)
        setScanMessage(`Tag scanned successfully!`)
      } else {
        setScannedItem(null)
        setScanError(`Tag "${code}" not found. You can register it below.`)
        setFormQrCode(code.trim())
      }
    } catch (err) {
      setScanError("Error looking up item code.")
    }
  }

  const handleQuickStatusChange = async (item: any, newStatus: string, newLocation?: string) => {
    try {
      const updates: any = { status: newStatus }
      if (newLocation) {
        updates.location = newLocation
      }
      if (newStatus === "Repair") {
        updates.condition = "Repair"
      }

      const updated = await updateItem({
        data: {
          id: item.id,
          item: updates,
        }
      })

      await refreshData()
      if (scannedItem && scannedItem.id === item.id) {
        setScannedItem(updated)
      }
    } catch (err: any) {
      alert(err.message || "Failed to update item status.")
    }
  }

  const getStatusCount = (statuses: string[]) => {
    return stats.statusCounts
      .filter((sc: any) => statuses.includes(sc.status))
      .reduce((sum: number, sc: any) => sum + sc.count, 0)
  }

  const availableCount = getStatusCount(["Available", "In Storage"])
  const stagedCount = getStatusCount(["Staged", "Reserved"])
  const repairCount = getStatusCount(["Repair"])

  const filteredItems = items.filter((item: any) => {
    if (statusFilter === "All") return true
    if (statusFilter === "Available") return item.status === "Available" || item.status === "In Storage"
    if (statusFilter === "Staged") return item.status === "Staged" || item.status === "Reserved"
    return item.status === statusFilter
  })

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Available":
      case "In Storage":
        return "bg-emerald-50 text-emerald-700 border-emerald-100"
      case "Staged":
      case "Reserved":
        return "bg-amber-50 text-amber-700 border-amber-100"
      case "Repair":
        return "bg-rose-50 text-rose-700 border-rose-100"
      default:
        return "bg-slate-50 text-slate-700 border-slate-100"
    }
  }

  return (
    <main className="min-h-svh bg-[#f7f8f4] text-[#20231f] pb-24">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-4">

        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.18em] text-[#6d7569] uppercase">
              {displayEmail}
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-normal">
              Hi, {displayName}
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            <UserButton />
            <Button
              size="icon"
              className="size-11 rounded-lg bg-[#23312b] text-white hover:bg-[#1a2520] cursor-pointer"
              aria-label="Scan QR"
              onClick={() => setActiveTab("scan")}
            >
              <HugeiconsIcon icon={BarcodeScanIcon} size={22} strokeWidth={1.8} />
            </Button>
          </div>
        </header>

        {activeTab === "home" && (
          <div className="space-y-5 mt-5">
            <div className="rounded-lg bg-[#23312b] p-4 text-white shadow-sm transition-all duration-300">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/70">Today</p>
                  <p className="mt-1 text-3xl font-semibold">{stats.movesToday} updates</p>
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  <HugeiconsIcon
                    icon={DeliveryTruck01Icon}
                    size={28}
                    strokeWidth={1.6}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-md bg-white/10 p-2 text-center">
                  <p className="text-lg font-semibold">{availableCount}</p>
                  <p className="truncate text-[10px] text-white/70">Available</p>
                </div>
                <div className="rounded-md bg-white/10 p-2 text-center">
                  <p className="text-lg font-semibold">{stagedCount}</p>
                  <p className="truncate text-[10px] text-white/70">Staged/Res</p>
                </div>
                <div className="rounded-md bg-white/10 p-2 text-center">
                  <p className="text-lg font-semibold">{repairCount}</p>
                  <p className="truncate text-[10px] text-white/70">Repair</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dfe3dc] bg-white px-3 text-sm shadow-sm focus-within:border-[#23312b] transition-all">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={18}
                  strokeWidth={1.8}
                  className="text-[#687064]"
                />
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8a9285]"
                  placeholder="Search live inventory..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setActiveTab("stock")}
                />
              </label>
              <Button
                variant="outline"
                size="icon"
                className="size-11 rounded-lg bg-white border-[#dfe3dc] hover:bg-neutral-50 cursor-pointer"
                onClick={() => setActiveTab("scan")}
              >
                <HugeiconsIcon icon={Camera01Icon} size={20} strokeWidth={1.8} />
              </Button>
            </div>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#20231f]">QR workflow guide</h2>
                <span className="text-xs font-medium text-[#6d7569]">ops cycle</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {movesWorkflow.map((move, index) => (
                  <div
                    key={move}
                    className="flex aspect-square flex-col justify-between rounded-lg border border-[#dfe3dc] bg-white p-2 shadow-xs"
                  >
                    <span className="text-xs font-semibold text-[#65705f]">
                      0{index + 1}
                    </span>
                    <span className="text-[11px] leading-tight font-medium text-[#20231f]">
                      {move}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#20231f]">Recent Activity</h2>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs font-medium text-[#6d7569] cursor-pointer"
                  onClick={() => setActiveTab("stock")}
                >
                  View all ({items.length}) →
                </Button>
              </div>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-[#dfe3dc] rounded-xl bg-white">
                    <p className="text-xs text-[#6d7569]">No inventory items found. Add some in the Stock tab!</p>
                  </div>
                ) : (
                  items.slice(0, 3).map((item: any) => (
                    <article
                      key={item.id}
                      onClick={() => openEditModal(item)}
                      className="rounded-xl border border-[#dfe3dc] bg-white p-3 shadow-xs hover:border-[#23312b] transition-all cursor-pointer flex gap-3"
                    >
                      <div className="size-14 shrink-0 items-center justify-center rounded-lg bg-[#eef2ea] overflow-hidden flex border border-[#dfe3dc]">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                        ) : (
                          <HugeiconsIcon icon={BoxIcon} size={24} strokeWidth={1.5} className="text-[#23312b]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[#20231f]">{item.name}</p>
                            <p className="text-[10px] text-[#6d7569] font-mono mt-0.5">{item.qrCode}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getStatusStyle(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-[#6d7569] mt-2 pt-1 border-t border-dashed border-[#f2f4f0]">
                          <span className="truncate">
                            <LocationIcon />
                            {item.location}
                          </span>
                          <span className="font-semibold text-[#20231f]">
                            <ShieldIcon />
                            {item.condition}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "scan" && (
          <div className="space-y-4 mt-5">
            <h2 className="text-base font-semibold">QR Code Scanning Simulator</h2>

            <div className="bg-white border border-[#dfe3dc] rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-[#6d7569] uppercase tracking-wider mb-2">Select a tag to simulate scan</p>
              <div className="flex flex-wrap gap-2">
                {items.slice(0, 4).map((item: any) => (
                  <button
                    key={item.qrCode}
                    onClick={() => {
                      setScanInputCode(item.qrCode)
                      handleScanLookup(item.qrCode)
                    }}
                    className="text-xs bg-[#f7f8f4] border border-[#dfe3dc] rounded-full px-3 py-1.5 hover:bg-[#eef2ea] hover:border-[#23312b] transition-all cursor-pointer font-medium text-[#20231f]"
                  >
                    🏷️ {item.name}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const newCode = `ITG-${["SFA", "TBL", "CHR", "LGT"][Math.floor(Math.random() * 4)]}-${Math.floor(1000 + Math.random() * 9000)}`
                    setScanInputCode(newCode)
                    handleScanLookup(newCode)
                  }}
                  className="text-xs bg-[#23312b] text-white rounded-full px-3 py-1.5 hover:bg-[#1a2520] transition-all cursor-pointer font-medium"
                >
                  ⚡ Mock New Tag
                </button>
              </div>
            </div>

            <div className="relative aspect-video rounded-xl bg-neutral-900 overflow-hidden flex items-center justify-center border border-[#dfe3dc] shadow-md">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)]"></div>

              <div className="border-2 border-emerald-400/80 size-32 rounded-xl flex items-center justify-center relative">
                <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] top-1/2 -translate-y-1/2 animate-bounce"></div>
                <div className="size-1 bg-emerald-400 rounded-full animate-ping"></div>
              </div>

              <span className="absolute bottom-3 text-[10px] text-white/60 tracking-wider bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                ALIGN QR CODE TAG INSIDE FRAME
              </span>
            </div>

            <div className="flex gap-2">
              <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dfe3dc] bg-white px-3 text-sm shadow-sm focus-within:border-[#23312b] transition-all">
                <span className="text-[11px] font-bold text-[#6d7569] font-mono">TAG:</span>
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8a9285] font-mono"
                  placeholder="ITG-SFA-0142"
                  value={scanInputCode}
                  onChange={(e) => setScanInputCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleScanLookup(scanInputCode)}
                />
              </label>
              <Button
                className="h-11 rounded-lg bg-[#23312b] text-white px-4 font-semibold text-xs tracking-wider uppercase hover:bg-[#1a2520] transition-colors cursor-pointer"
                onClick={() => handleScanLookup(scanInputCode)}
              >
                Scan Code
              </Button>
            </div>

            {scanError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-100 rounded-xl">
                {scanError}
              </div>
            )}
            {scanMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs border border-emerald-100 rounded-xl flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping"></span>
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getStatusStyle(scannedItem.status)}`}>
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
                        onClick={() => handleQuickStatusChange(scannedItem, "Reserved", "Staging Staged")}
                      >
                        <BoltIcon />
                        Check Out
                      </Button>
                    ) : (
                      <Button
                        className="h-10 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center"
                        onClick={() => handleQuickStatusChange(scannedItem, "In Storage", "Warehouse A, Bay 1")}
                      >
                        <BoltIcon />
                        Check In
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      className="h-10 border-[#dfe3dc] text-xs font-semibold rounded-lg hover:bg-neutral-50 cursor-pointer flex items-center justify-center text-[#20231f]"
                      onClick={() => handleQuickStatusChange(scannedItem, "Repair", "Intake bench")}
                    >
                      <WrenchIcon />
                      Report Damaged
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-10 border-[#dfe3dc] text-[#20231f] hover:bg-neutral-50 text-xs font-semibold rounded-lg cursor-pointer mt-1 flex items-center justify-center"
                    onClick={() => openEditModal(scannedItem)}
                  >
                    <EditIcon />
                    Edit Item Details
                  </Button>
                </div>
              </div>
            ) : scanInputCode && !scanError ? (
              <div className="text-center p-6 border border-dashed border-[#dfe3dc] bg-white rounded-xl">
                <p className="text-xs text-[#6d7569] mb-4">Tag "{scanInputCode}" is unassigned.</p>
                <Button
                  className="bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold px-4 h-10 rounded-lg cursor-pointer inline-flex items-center gap-1 justify-center w-full"
                  onClick={() => {
                    setFormQrCode(scanInputCode)
                    setFormName("")
                    setFormDescription("")
                    setFormCondition("Good")
                    setFormLocation("")
                    setFormStatus("In Storage")
                    setFormImageUrl("")
                    setIsCreateModalOpen(true)
                  }}
                >
                  <PlusIcon />
                  Register Item to tag
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "stock" && (
          <div className="space-y-4 mt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Inventory Manager</h2>
              <Button
                onClick={openCreateModal}
                className="h-9 bg-[#23312b] text-white hover:bg-[#1a2520] rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer inline-flex items-center"
              >
                <PlusIcon />
                Add Item
              </Button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {["All", "Available", "Staged", "Repair"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === filter
                      ? "bg-[#23312b] text-white border-[#23312b] shadow-xs"
                      : "bg-white text-[#6d7569] border-[#dfe3dc] hover:bg-[#f7f8f4]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dfe3dc] bg-white px-3 text-sm shadow-sm focus-within:border-[#23312b] transition-all">
              <HugeiconsIcon
                icon={Search01Icon}
                size={18}
                strokeWidth={1.8}
                className="text-[#687064]"
              />
              <input
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8a9285]"
                placeholder="Search tag, piece name, project..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </label>

            <p className="text-[10px] uppercase font-bold text-[#6d7569] tracking-wider">
              Showing {filteredItems.length} of {items.length} items
            </p>

            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="text-center p-12 border border-dashed border-[#dfe3dc] rounded-xl bg-white">
                  <p className="text-xs text-[#6d7569]">No items match your filters.</p>
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      setStatusFilter("All")
                      refreshData()
                    }}
                    className="text-xs font-semibold text-[#23312b] hover:underline mt-2 cursor-pointer"
                  >
                    Reset Search & Filters
                  </button>
                </div>
              ) : (
                filteredItems.map((item: any) => (
                  <article
                    key={item.id}
                    onClick={() => openEditModal(item)}
                    className="rounded-xl border border-[#dfe3dc] bg-white p-3 shadow-xs hover:border-[#23312b] transition-all cursor-pointer flex gap-3"
                  >
                    <div className="size-16 shrink-0 rounded-lg bg-[#eef2ea] border border-[#dfe3dc] overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                      ) : (
                        <HugeiconsIcon icon={BoxIcon} size={26} strokeWidth={1.5} className="text-[#23312b]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#20231f]">{item.name}</p>
                          <p className="text-[10px] text-[#6d7569] font-mono mt-0.5">{item.qrCode}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6d7569] line-clamp-1 mt-1 font-light italic">
                        {item.description || "No description provided."}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-[#6d7569] mt-2 pt-1 border-t border-dashed border-[#f2f4f0]">
                        <span className="truncate">
                          <LocationIcon />
                          {item.location}
                        </span>
                        <span className="font-semibold text-[#20231f]">
                          <ShieldIcon />
                          {item.condition}
                        </span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-[#dfe3dc] bg-white/95 px-4 pt-2 pb-4 backdrop-blur z-40">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="ghost"
            className={`h-12 flex-col gap-1 rounded-lg text-xs cursor-pointer ${
              activeTab === "home" ? "text-[#23312b] font-bold" : "text-[#6d7569]"
            }`}
            onClick={() => setActiveTab("home")}
          >
            <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={1.7} />
            Home
          </Button>
          <Button
            className={`h-12 rounded-lg cursor-pointer ${
              activeTab === "scan"
                ? "bg-[#23312b] text-white hover:bg-[#1a2520]"
                : "bg-transparent text-[#6d7569] border border-[#dfe3dc] hover:bg-neutral-50"
            }`}
            onClick={() => setActiveTab("scan")}
          >
            <HugeiconsIcon icon={BarcodeScanIcon} size={20} strokeWidth={1.8} />
            Scan
          </Button>
          <Button
            variant="ghost"
            className={`h-12 flex-col gap-1 rounded-lg text-xs cursor-pointer ${
              activeTab === "stock" ? "text-[#23312b] font-bold" : "text-[#6d7569]"
            }`}
            onClick={() => setActiveTab("stock")}
          >
            <HugeiconsIcon icon={BoxIcon} size={20} strokeWidth={1.7} />
            Stock
          </Button>
        </div>
      </nav>

      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-[#dfe3dc] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#dfe3dc] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#20231f]">Edit Item</h3>
                <p className="text-[10px] text-[#6d7569] font-mono mt-0.5">{selectedItem.qrCode}</p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setSelectedItem(null)
                }}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleUpdateItemSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Item Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full min-h-20 px-3 py-2 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm resize-none"
                  placeholder="Elegant cream-colored fabric sofa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
                  >
                    <option value="Available">Available</option>
                    <option value="In Storage">In Storage</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Staged">Staged</option>
                    <option value="Repair">Repair</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Condition</label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Worn">Worn</option>
                    <option value="Repair">Repair</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Location</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
                  placeholder="Warehouse B, Aisle 3"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Image URL</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm text-[#20231f]"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteItemClick(selectedItem.id)}
                  className="flex-1 h-11 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                >
                  <TrashIcon />
                  Delete
                </button>
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-[#dfe3dc] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#dfe3dc] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[#20231f]">Register New Item</h3>
                <p className="text-[10px] text-[#6d7569] font-mono mt-0.5">{formQrCode}</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreateItemSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nolan boucle sofa"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full min-h-20 px-3 py-2 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm resize-none"
                  placeholder="Elegant cream-colored fabric sofa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
                  >
                    <option value="Available">Available</option>
                    <option value="In Storage">In Storage</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Staged">Staged</option>
                    <option value="Repair">Repair</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Condition</label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Worn">Worn</option>
                    <option value="Repair">Repair</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse B, Aisle 3"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Image URL</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm text-[#20231f]"
                  placeholder="https://images.unsplash.com/... (optional)"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 h-11 border-[#dfe3dc] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Create Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
