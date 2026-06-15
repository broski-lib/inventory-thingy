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
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal"
import { generateQrCode } from "@/lib/ids"
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemStatus } from "@/lib/item-status"

type ItemCreateModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (item: {
    qrCode: string
    name: string
    description: string
    condition: ItemCondition
    location: string
    status: ItemStatus
    imageUrl: string
  }) => Promise<void>
  initialQrCode?: string
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&auto=format&fit=crop&q=60"

export function ItemCreateModal({
  open,
  onClose,
  onSubmit,
  initialQrCode,
}: ItemCreateModalProps) {
  const [qrCode, setQrCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCondition, setFormCondition] = useState<ItemCondition>("Good")
  const [formLocation, setFormLocation] = useState("")
  const [formStatus, setFormStatus] = useState<ItemStatus>("In Storage")
  const [formImageUrl, setFormImageUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQrCode(initialQrCode?.trim() || generateQrCode())
    setFormName("")
    setFormDescription("")
    setFormCondition("Good")
    setFormLocation("")
    setFormStatus("In Storage")
    setFormImageUrl("")
    setError(null)
    setBusy(false)
  }, [open, initialQrCode])

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrCode.trim() || !formName.trim() || !formLocation.trim()) {
      setError("QR Code, Name, and Location are required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        qrCode: qrCode.trim(),
        name: formName.trim(),
        description: formDescription.trim(),
        condition: formCondition,
        location: formLocation.trim(),
        status: formStatus,
        imageUrl: formImageUrl.trim() || DEFAULT_IMAGE,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item.")
      setBusy(false)
    }
  }

  const handleReroll = () => setQrCode(generateQrCode())

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalHeader onClose={onClose}>
        <ModalTitle>Register New Item</ModalTitle>
        <div className="mt-0.5 flex items-center gap-2">
          <ModalDescription>{qrCode || "—"}</ModalDescription>
          <button
            type="button"
            onClick={handleReroll}
            className="cursor-pointer text-[10px] font-semibold tracking-wider text-primary uppercase hover:underline"
          >
            Re-roll
          </button>
        </div>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="contents">
        <ModalBody>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="create-name">Item Name</Label>
            <Input
              id="create-name"
              required
              placeholder="e.g. Nolan boucle sofa"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Elegant cream-colored fabric sofa..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-status">Status</Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as ItemStatus)}
              >
                <SelectTrigger id="create-status" size="default">
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
              <Label htmlFor="create-condition">Condition</Label>
              <Select
                value={formCondition}
                onValueChange={(v) => setFormCondition(v as ItemCondition)}
              >
                <SelectTrigger id="create-condition" size="default">
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
            <Label htmlFor="create-location">Location</Label>
            <Input
              id="create-location"
              required
              placeholder="e.g. Warehouse B, Aisle 3"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-image">Image URL</Label>
            <Input
              id="create-image"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... (optional)"
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  )
}
