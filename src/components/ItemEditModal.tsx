import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { CloseIcon, TrashIcon } from "@/components/icons"
import type { items } from "@/lib/schema"
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemStatus } from "@/lib/item-status"

export type InventoryItem = typeof items.$inferSelect

type ItemEditModalProps = {
  open: boolean
  item: InventoryItem | null
  onClose: () => void
  onSubmit: (item: Partial<InventoryItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ItemEditModal({ open, item, onClose, onSubmit, onDelete }: ItemEditModalProps) {
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCondition, setFormCondition] = useState<ItemCondition>("Good")
  const [formLocation, setFormLocation] = useState("")
  const [formStatus, setFormStatus] = useState<ItemStatus>("In Storage")
  const [formImageUrl, setFormImageUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !item) return
    setFormName(item.name)
    setFormDescription(item.description)
    setFormCondition(item.condition)
    setFormLocation(item.location)
    setFormStatus(item.status)
    setFormImageUrl(item.imageUrl)
    setError(null)
    setBusy(false)
  }, [open, item])

  if (!open || !item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        name: formName.trim(),
        description: formDescription.trim(),
        condition: formCondition,
        location: formLocation.trim(),
        status: formStatus,
        imageUrl: formImageUrl.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item.")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return
    setBusy(true)
    try {
      await onDelete(item.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.")
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-[#dfe3dc] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[#dfe3dc] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#20231f]">Edit Item</h3>
            <p className="text-[10px] text-[#6d7569] font-mono mt-0.5">{item.qrCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
            aria-label="Close edit modal"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-100 rounded-xl">
              {error}
            </div>
          )}

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
                onChange={(e) => setFormStatus(e.target.value as ItemStatus)}
                className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
              >
                {ITEM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Condition</label>
              <select
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value as ItemCondition)}
                className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
              >
                {ITEM_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
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
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 h-11 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <TrashIcon />
              Delete
            </button>
            <Button
              type="submit"
              disabled={busy}
              className="flex-1 h-11 bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold rounded-lg cursor-pointer"
            >
              {busy ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
