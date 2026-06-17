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
import { ResponsiveOverlay } from "@/components/ResponsiveOverlay"
import { PhotoUpload } from "@/components/PhotoUpload"
import { useItemPhoto } from "@/hooks/use-item-photo"
import { generateQrCode } from "@/lib/ids"
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemStatus } from "@/lib/item-status"
import { uploadItemImage } from "@/lib/inventory"

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
    imageKey: string | null
  }) => Promise<void>
  initialQrCode?: string
}

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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photo = useItemPhoto({ onError: setError })

  useEffect(() => {
    if (!open) return
    setQrCode(initialQrCode?.trim() || generateQrCode())
    setFormName("")
    setFormDescription("")
    setFormCondition("Good")
    setFormLocation("")
    setFormStatus("In Storage")
    setError(null)
    setBusy(false)
    photo.reset()
  }, [open, initialQrCode, photo])

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
      let imageKey: string | null = null
      if (photo.pendingImage) {
        const fd = new FormData()
        fd.append("file", photo.pendingImage.file, photo.pendingImage.file.name)
        const uploaded = await uploadItemImage({ data: fd })
        imageKey = uploaded.imageKey
      }
      await onSubmit({
        qrCode: qrCode.trim(),
        name: formName.trim(),
        description: formDescription.trim(),
        condition: formCondition,
        location: formLocation.trim(),
        status: formStatus,
        imageKey,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item.")
      setBusy(false)
    }
  }

  const subtitle = (
    <button
      type="button"
      onClick={() => setQrCode(generateQrCode())}
      className="cursor-pointer text-[10px] font-semibold tracking-wider text-primary uppercase hover:underline"
    >
      Re-roll
    </button>
  )

  const body = (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-name">Item Name</Label>
        <Input
          id="create-name"
          required
          placeholder="e.g. Nolan boucle sofa"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-description">Description</Label>
        <Textarea
          id="create-description"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          placeholder="Elegant cream-colored fabric sofa..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
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

        <div className="flex flex-col gap-1.5">
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="create-location">Location</Label>
        <Input
          id="create-location"
          required
          placeholder="e.g. Warehouse B, Aisle 3"
          value={formLocation}
          onChange={(e) => setFormLocation(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Photo</Label>
        <PhotoUpload state={photo} alt="Item preview" />
      </div>
    </div>
  )

  const footer = (
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
      <Button
        type="submit"
        disabled={busy}
        className="flex-1"
        onClick={handleSubmit}
      >
        {busy ? "Uploading..." : "Create Item"}
      </Button>
    </div>
  )

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={handleOpenChange}
      title="Register New Item"
      description={qrCode || "—"}
      subtitle={subtitle}
      footer={footer}
    >
      {body}
    </ResponsiveOverlay>
  )
}
