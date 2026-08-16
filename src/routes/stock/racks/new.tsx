import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { createRack } from "@/lib/racks"
import { getLocations } from "@/lib/inventory"
import { getCategoryTree } from "@/lib/categories"
import { listTags } from "@/lib/tags"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocationChips } from "@/components/LocationChips"
import { RackItemPicker } from "@/components/RackItemPicker"
import { PageChrome } from "@/components/PageChrome"

export const Route = createFileRoute("/stock/racks/new")({
  loader: async () => {
    const [locations, categoryTree, allTags] = await Promise.all([
      getLocations(),
      getCategoryTree(),
      listTags(),
    ])
    return { locations, categoryTree, allTags }
  },
  component: NewRackPage,
})

function NewRackPage() {
  const { locations, categoryTree, allTags } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <Label>
            Items on this rack{" "}
            {selected.size > 0 && (
              <span className="font-normal text-muted-foreground">
                ({selected.size} selected)
              </span>
            )}
          </Label>
          <RackItemPicker
            selectedIds={selected}
            onToggle={toggleItem}
            locations={locations}
            categoryTree={categoryTree}
            allTags={allTags}
          />
        </div>

        <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-secondary px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !name.trim()}
            className="h-12 w-full"
          >
            {busy
              ? "Creating..."
              : `Create rack${selected.size > 0 ? ` (${selected.size} items)` : ""}`}
          </Button>
        </div>
      </div>
    </PageChrome>
  )
}
