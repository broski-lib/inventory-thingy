import {
  createLazyFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { useState } from "react"
import { useUpdateRack } from "@/lib/queries"
import { Button } from "@/components/ui/button"
import { RackItemPicker } from "@/components/RackItemPicker"
import { PageChrome } from "@/components/PageChrome"

export const Route = createLazyFileRoute("/stock/racks/$id/items")({
  component: RackItemsPage,
})

function RackItemsPage() {
  const { rack, locations, categoryTree, allTags } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const updateRackMutation = useUpdateRack()
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rack.items.map((it) => it.id))
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rackQty = new Map(rack.items.map((it) => [it.id, it.rackQty]))

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    try {
      await updateRackMutation.mutateAsync({
        id: rack.id,
        items: [...selected].map((itemId) => ({
          itemId,
          qty: rackQty.get(itemId) ?? 1,
        })),
      })
      router.invalidate()
      navigate({
        to: "/stock/racks/$id",
        params: { id: rack.id },
        replace: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save items")
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageChrome title="Edit Items" backTo="/stock/racks">
      <div className="flex flex-col gap-4 p-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Checked items stay on the rack, unchecked items are removed, and new
          picks are added.
        </p>

        <RackItemPicker
          selectedIds={selected}
          onToggle={toggleItem}
          pinnedItems={rack.items.map((it) => ({
            id: it.id,
            name: it.name,
            qrCode: it.qrCode,
            imageUrl: it.imageUrl,
            kind: it.kind,
          }))}
          locations={locations}
          categoryTree={categoryTree}
          allTags={allTags}
        />

        <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-secondary px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="h-12 w-full"
          >
            {busy
              ? "Saving..."
              : `Save (${selected.size} ${selected.size === 1 ? "item" : "items"})`}
          </Button>
        </div>
      </div>
    </PageChrome>
  )
}