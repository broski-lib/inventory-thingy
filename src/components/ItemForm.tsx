import { useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
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
import { PhotoUpload } from "@/components/PhotoUpload"
import { TagPicker } from "@/components/TagPicker"
import { LocationChips } from "@/components/LocationChips"
import { useItemPhoto } from "@/hooks/use-item-photo"
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemKind, ItemStatus } from "@/lib/item-status"
import { uploadItemImage } from "@/lib/inventory"
import { createTag } from "@/lib/tags"
import type { Tag } from "@/lib/tags"
import { generateQrCode } from "@/lib/ids"
import type { PrintSize } from "@/lib/schema"
import { PRINT_SIZES } from "@/lib/schema"

export type ItemFormValues = {
  qrCode: string
  name: string
  description: string
  condition: ItemCondition
  location: string
  status: ItemStatus
  /** unit = one physical item; bulk = fungible stock tracked via batches. */
  kind: ItemKind
  /** Bulk only: starting quantity for the initial batch (create only). */
  quantity: number
  /** Clerk org role required to update/delete. Null = any member. */
  requiredRole: string | null
  /** QR label size for printing. Defaults to "medium". */
  printSize: PrintSize
}

type ItemFormProps = {
  initial: ItemFormValues
  initialImageKey?: string | null
  availableTags?: Tag[]
  initialTagIds?: string[]
  /** Existing org locations, shown as one-tap chips under the location input. */
  locationSuggestions?: string[]
  /** Show the "admin only" toggle. Only true for org admins. */
  canSetRequiredRole?: boolean
  onSubmit: (
    data: ItemFormValues & { imageKey: string | null; tagIds: string[] }
  ) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  busy?: boolean
  submitLabel: string
  /** Optional: when true, hides the QR code field (used on edit page). */
  hideQrCode?: boolean
}

const EMPTY: ItemFormValues = {
  qrCode: "",
  name: "",
  description: "",
  condition: "Good",
  location: "",
  status: "In Storage",
  kind: "unit",
  quantity: 1,
  requiredRole: null,
  printSize: "medium",
}

export const EMPTY_ITEM_FORM: ItemFormValues = EMPTY

export function ItemForm({
  initial,
  initialImageKey = null,
  availableTags = [],
  initialTagIds = [],
  locationSuggestions = [],
  canSetRequiredRole = false,
  onSubmit,
  onDirtyChange,
  busy = false,
  submitLabel,
  hideQrCode = false,
}: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(initial)
  const [tags, setTags] = useState<Tag[]>(availableTags)
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds)
  const [imageKeyRemoved, setImageKeyRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Raw text for the quantity field so the user can clear/retype freely.
  // Parsed into values.quantity on change when valid; resynced on blur.
  const [qtyText, setQtyText] = useState(String(initial.quantity))
  // Per-field required errors, revealed on the first submit attempt.
  const [showErrors, setShowErrors] = useState(false)
  const initialRef = useRef(initial)
  const initialTagIdsRef = useRef(initialTagIds)
  const photo = useItemPhoto({ onError: setError })

  const isDirty = useMemo(() => {
    if (imageKeyRemoved) return true
    if (photo.pendingImage) return true
    const init = initialRef.current
    if (
      values.qrCode !== init.qrCode ||
      values.name !== init.name ||
      values.description !== init.description ||
      values.condition !== init.condition ||
      values.location !== init.location ||
      values.status !== init.status ||
      values.kind !== init.kind ||
      values.quantity !== init.quantity ||
      values.requiredRole !== init.requiredRole
    ) {
      return true
    }
    const initialIds = initialTagIdsRef.current
    return (
      tagIds.length !== initialIds.length ||
      tagIds.some((id) => !initialIds.includes(id))
    )
  }, [values, tagIds, imageKeyRemoved, photo.pendingImage])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const update = <TKey extends keyof ItemFormValues>(
    key: TKey,
    value: ItemFormValues[TKey]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleCreateTag = async (input: { name: string; color: string }) => {
    const created = await createTag({ data: input })
    setTags((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    )
    setTagIds((prev) => [...prev, created.id])
    return created
  }

  const remoteUrl =
    !photo.pendingImage && !imageKeyRemoved && initialImageKey
      ? `/api/images/${initialImageKey}`
      : null

  const handlePhotoRemove = () => {
    if (photo.pendingImage) {
      photo.handleRemove()
    } else {
      setImageKeyRemoved(true)
    }
  }

  const nameError = showErrors && !values.name.trim()
  // Location is only editable (and required) when the field is rendered —
  // bulk edit moves it to the batches section.
  const locationFieldVisible = !(values.kind === "bulk" && hideQrCode)
  const locationError = showErrors && locationFieldVisible && !values.location.trim()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!values.name.trim() || (locationFieldVisible && !values.location.trim())) {
      setShowErrors(true)
      setError("Fill in the required fields highlighted below.")
      return
    }
    setError(null)

    let imageKey: string | null = initialImageKey
    try {
      if (photo.pendingImage) {
        const fd = new FormData()
        fd.append("file", photo.pendingImage.file, photo.pendingImage.file.name)
        const uploaded = await uploadItemImage({ data: fd })
        imageKey = uploaded.imageKey
      } else if (imageKeyRemoved) {
        imageKey = null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo.")
      return
    }

    try {
      await onSubmit({ ...values, imageKey, tagIds })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Photo</Label>
        <PhotoUpload
          state={photo}
          alt={values.name || "Item photo"}
          remoteUrl={remoteUrl}
          onRemove={handlePhotoRemove}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="item-name"
          required
          value={values.name}
          aria-invalid={nameError || undefined}
          onChange={(e) => update("name", e.target.value)}
        />
        {nameError && (
          <p className="text-[11px] font-medium text-destructive">
            Name is required.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-description">Description</Label>
        <Textarea
          id="item-description"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
        />
      </div>

      {values.kind === "bulk" && hideQrCode ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-[11px] text-muted-foreground">
          Location, status and condition are tracked per batch — manage them
          in the batches section below.
        </p>
      ) : (
        <>
          {values.kind === "bulk" && (
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Initial batch
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-location">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item-location"
              required
              value={values.location}
              aria-invalid={locationError || undefined}
              onChange={(e) => update("location", e.target.value)}
            />
            {locationError ? (
              <p className="text-[11px] font-medium text-destructive">
                Location is required.
              </p>
            ) : (
              <LocationChips
                locations={locationSuggestions}
                value={values.location}
                onSelect={(loc) => update("location", loc)}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-status">Status</Label>
              <Select
                value={values.status}
                onValueChange={(v) => update("status", v as ItemStatus)}
              >
                <SelectTrigger id="item-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-condition">Condition</Label>
              <Select
                value={values.condition}
                onValueChange={(v) => update("condition", v as ItemCondition)}
              >
                <SelectTrigger id="item-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {!hideQrCode && (
        <div className="flex flex-col gap-1.5">
          <Label>Item type</Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
            {(
              [
                { id: "unit", label: "Single item", hint: "One QR per item" },
                { id: "bulk", label: "Bulk stock", hint: "Qty per batch" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => update("kind", opt.id)}
                aria-pressed={values.kind === opt.id}
                className={
                  values.kind === opt.id
                    ? "cursor-pointer rounded-md bg-card px-2 py-1.5 text-xs font-semibold text-foreground shadow-xs"
                    : "cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {values.kind === "bulk"
              ? "Fungible stock (e.g. pillows). One QR on the rack; quantities tracked per batch."
              : "A single physical item with its own QR code."}
          </p>
        </div>
      )}

      {values.kind === "bulk" && !hideQrCode && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="item-quantity">Starting quantity</Label>
          <Input
            id="item-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            required
            value={qtyText}
            onChange={(e) => {
              const raw = e.target.value
              setQtyText(raw)
              const n = Math.floor(Number(raw))
              if (raw !== "" && Number.isFinite(n) && n >= 1) {
                update("quantity", n)
              }
            }}
            onBlur={() => setQtyText(String(values.quantity))}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Tags</Label>
        <TagPicker
          tags={tags}
          selectedIds={tagIds}
          onToggle={toggleTag}
          onCreate={handleCreateTag}
        />
      </div>

      {!hideQrCode && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="item-qr">QR Code</Label>
            <button
              type="button"
              onClick={() => update("qrCode", generateQrCode())}
              className="text-[10px] font-bold tracking-wider text-primary uppercase hover:underline"
            >
              Re-roll
            </button>
          </div>
          <Input
            id="item-qr"
            value={values.qrCode}
            readOnly
            onChange={() => {}}
            className="font-mono read-only:bg-muted read-only:text-muted-foreground"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="item-print-size">QR print size</Label>
        <Select
          value={values.printSize}
          onValueChange={(v) => update("printSize", v as PrintSize)}
        >
          <SelectTrigger id="item-print-size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRINT_SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Small for tiny items (plants, jewelry), large for oversized items (paintings, rugs).
        </p>
      </div>

      {canSetRequiredRole && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card p-3">
          <input
            type="checkbox"
            checked={values.requiredRole === "org:admin"}
            onChange={(e) =>
              update("requiredRole", e.target.checked ? "org:admin" : null)
            }
            className="mt-0.5 size-4 accent-primary"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold">Admin only</span>
            <span className="text-[11px] text-muted-foreground">
              Only org admins can update or delete this item.
            </span>
          </span>
        </label>
      )}

      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <Button type="submit" disabled={busy} className="h-12 w-full">
          {busy ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
