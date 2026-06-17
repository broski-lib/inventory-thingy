import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrashIcon } from "@/components/icons"
import { ResponsiveOverlay } from "@/components/ResponsiveOverlay"
import { PhotoUpload } from "@/components/PhotoUpload"
import { useItemPhoto } from "@/hooks/use-item-photo"
import type { items } from "@/lib/schema"
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemStatus } from "@/lib/item-status"
import { getItemActivity } from "@/lib/activity"
import type { ActivityLog } from "@/lib/activity"
import { ActivityList } from "@/components/ActivityLog"
import { uploadItemImage } from "@/lib/inventory"

export type InventoryItem = typeof items.$inferSelect

type ItemEditModalProps = {
  open: boolean
  item: InventoryItem | null
  onClose: () => void
  onSubmit: (
    item: Partial<InventoryItem> & { imageKey?: string | null }
  ) => Promise<void>
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
  const [imageKeyRemoved, setImageKeyRemoved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [tab, setTab] = useState<"edit" | "history">("edit")
  const photo = useItemPhoto({ onError: setError })

  useEffect(() => {
    if (!open || !item) return
    setFormName(item.name)
    setFormDescription(item.description)
    setFormCondition(item.condition)
    setFormLocation(item.location)
    setFormStatus(item.status)
    setImageKeyRemoved(false)
    photo.reset()
    setError(null)
    setBusy(false)
    setTab("edit")
  }, [open, item, photo])

  useEffect(() => {
    if (!open || !item) return
    let cancelled = false
    setLogsLoading(true)
    setLogsError(null)
    getItemActivity({ data: item.id })
      .then((rows) => {
        if (cancelled) return
        setLogs(rows)
        setLogsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setLogsError(
          err instanceof Error ? err.message : "Failed to load history"
        )
        setLogs([])
        setLogsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, item])

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      let nextImageKey: string | null | undefined
      if (photo.pendingImage) {
        const fd = new FormData()
        fd.append("file", photo.pendingImage.file, photo.pendingImage.file.name)
        const uploaded = await uploadItemImage({ data: fd })
        nextImageKey = uploaded.imageKey
      } else if (imageKeyRemoved) {
        nextImageKey = null
      } else {
        nextImageKey = item?.imageKey ?? null
      }
      await onSubmit({
        name: formName.trim(),
        description: formDescription.trim(),
        condition: formCondition,
        location: formLocation.trim(),
        status: formStatus,
        imageKey: nextImageKey,
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

  const remoteUrl =
    !photo.pendingImage && !imageKeyRemoved && item?.imageKey
      ? `/api/images/${item.imageKey}`
      : null

  const handlePhotoRemove = () => {
    if (photo.pendingImage) {
      photo.handleRemove()
    } else {
      setImageKeyRemoved(true)
    }
  }

  const tabs = (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "edit" | "history")}>
      <TabsList variant="line" className="w-full">
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="history">
          History
          {!logsLoading && logs.length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[9px] font-bold text-muted-foreground">
              {logs.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {error && tab === "edit" && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <TabsContent value="edit" className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-name">Item Name</Label>
          <Input
            id="edit-name"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Elegant cream-colored fabric sofa..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
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

          <div className="flex flex-col gap-1.5">
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-location">Location</Label>
          <Input
            id="edit-location"
            required
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
            placeholder="Warehouse B, Aisle 3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Photo</Label>
          <PhotoUpload
            state={photo}
            alt={item?.name || "Item photo"}
            remoteUrl={remoteUrl}
            onRemove={handlePhotoRemove}
          />
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        {logsLoading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Loading history…
          </p>
        ) : logsError ? (
          <Alert variant="destructive">
            <AlertDescription>{logsError}</AlertDescription>
          </Alert>
        ) : (
          <ActivityList
            logs={logs}
            showItem={false}
            emptyMessage="No history for this item yet."
          />
        )}
      </TabsContent>
    </Tabs>
  )

  const footer = (
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
      <Button
        type={tab === "edit" ? "submit" : "button"}
        disabled={busy}
        className="flex-1"
        onClick={tab === "history" ? () => setTab("edit") : handleSubmit}
      >
        {busy
          ? "Saving..."
          : tab === "history"
            ? "Back to Edit"
            : "Save Changes"}
      </Button>
    </div>
  )

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit Item"
      description={item?.qrCode}
      footer={footer}
    >
      {tabs}
    </ResponsiveOverlay>
  )
}
