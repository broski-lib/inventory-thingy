import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useState, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon } from "@hugeicons/core-free-icons"
import { createRack } from "@/lib/racks"
import { getItemsPage, getLocations } from "@/lib/inventory"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocationChips } from "@/components/LocationChips"
import { PageChrome } from "@/components/PageChrome"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchInput } from "@/components/SearchInput"

export const Route = createFileRoute("/stock/racks/new")({
  loader: async () => {
    const [locations, itemsPage] = await Promise.all([
      getLocations(),
      getItemsPage({
        data: { page: 1, pageSize: 200, kinds: ["bulk"], sort: "updated_desc" },
      }),
    ])
    return { locations, bulkItems: itemsPage.items }
  },
  component: NewRackPage,
})

function NewRackPage() {
  const { locations, bulkItems } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return bulkItems
    return bulkItems.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.qrCode.toLowerCase().includes(q)
    )
  }, [bulkItems, search])

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Rack name is required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createRack({
        data: {
          name: name.trim(),
          location: location.trim(),
          items: [...selected].map((itemId) => ({ itemId, qty: 1 })),
        },
      })
      router.invalidate()
      navigate({ to: "/stock/racks" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rack")
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageChrome title="New Rack" backTo="/stock/racks">
      <div className="flex flex-col gap-4 p-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rack-name">
            Rack name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="rack-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pillow Rack A"
            className="text-base sm:text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rack-location">Physical location</Label>
          <Input
            id="rack-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Warehouse A, Bay 1"
            className="text-base sm:text-sm"
          />
          <LocationChips
            locations={locations}
            value={location}
            onSelect={setLocation}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Items on this rack</Label>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search bulk items..."
          />
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
              No bulk items found. Create bulk items first.
            </p>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border bg-card">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0"
                >
                  <Checkbox
                    checked={selected.has(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="size-4 shrink-0 rounded"
                  />
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-accent">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="size-full object-cover"
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
                    <p className="truncate text-xs font-semibold">
                      {item.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {item.qrCode}
                      {item.tagged ? " · Tagged" : " · Untagged"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-secondary px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !name.trim()}
            className="h-12 w-full"
          >
            {busy ? "Creating..." : `Create rack${selected.size > 0 ? ` (${selected.size} items)` : ""}`}
          </Button>
        </div>
      </div>
    </PageChrome>
  )
}
