import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrashIcon } from "@/components/icons"
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal"
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

export function ItemEditModal({
  open,
  item,
  onClose,
  onSubmit,
  onDelete,
}: ItemEditModalProps) {
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

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

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
    if (!item) return
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
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalHeader onClose={onClose}>
        <ModalTitle>Edit Item</ModalTitle>
        <ModalDescription>{item?.qrCode}</ModalDescription>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="contents">
        <ModalBody>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Item Name</Label>
            <Input
              id="edit-name"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Elegant cream-colored fabric sofa..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as ItemStatus)}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-condition">Condition</Label>
              <Select
                value={formCondition}
                onValueChange={(v) => setFormCondition(v as ItemCondition)}
              >
                <SelectTrigger id="edit-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CONDITIONS.map((cond) => (
                    <SelectItem key={cond} value={cond}>
                      {cond}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              required
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="Warehouse B, Aisle 3"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-image">Image URL</Label>
            <Input
              id="edit-image"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={busy}
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <TrashIcon />
              Delete
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  )
}
