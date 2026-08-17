import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { useStore } from "@tanstack/react-store"
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
import {
  CategoryPicker,
  resolveCategoryPath,
} from "@/components/CategoryPicker"
import type { CategoryTreeNode } from "@/lib/categories"
import { Checkbox } from "@/components/ui/checkbox"
import { useItemPhoto } from "@/hooks/use-item-photo"
import { createCategory } from "@/lib/categories"
import { useRouter } from "@tanstack/react-router"
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemKind, ItemStatus } from "@/lib/item-status"
import { useUploadItemImage, useCreateTag } from "@/lib/queries"
import type { Tag } from "@/lib/tags"
import { generateQrCode } from "@/lib/ids"
import type { PrintSize } from "@/lib/constants"
import { PRINT_SIZES } from "@/lib/constants"

export type ItemFormValues = {
  qrCode: string
  name: string
  description: string
  condition: ItemCondition
  location: string
  categoryId: string | null
  status: ItemStatus
  kind: ItemKind
  quantity: number
  requiredRole: string | null
  printSize: PrintSize
  tagged: boolean
}

type ItemFormProps = {
  initial: ItemFormValues
  initialImageKey?: string | null
  availableTags?: Tag[]
  initialTagIds?: string[]
  locationSuggestions?: string[]
  categoryTree?: CategoryTreeNode[]
  canSetRequiredRole?: boolean
  onSubmit: (
    data: ItemFormValues & { imageKey: string | null; tagIds: string[] }
  ) => Promise<void>
  busy?: boolean
  submitLabel: string
  hideQrCode?: boolean
}

const EMPTY: ItemFormValues = {
  qrCode: "",
  name: "",
  description: "",
  condition: "Good",
  location: "",
  categoryId: null,
  status: "In Storage",
  kind: "unit",
  quantity: 1,
  requiredRole: null,
  printSize: "medium",
  tagged: true,
}

export const EMPTY_ITEM_FORM: ItemFormValues = EMPTY

export function ItemForm({
  initial,
  initialImageKey = null,
  availableTags = [],
  initialTagIds = [],
  locationSuggestions = [],
  categoryTree,
  canSetRequiredRole = false,
  onSubmit,
  busy = false,
  submitLabel,
  hideQrCode = false,
}: ItemFormProps) {
  const [tags, setTags] = useState<Tag[]>(availableTags)
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds)
  const [imageKeyRemoved, setImageKeyRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const photo = useItemPhoto({ onError: setError })
  const router = useRouter()

  const onCreateCategory = async (name: string, parentId: string | null) => {
    await createCategory({ data: { name, parentId } })
    router.invalidate()
  }
  const uploadImageMutation = useUploadItemImage()
  const createTagMutation = useCreateTag()

  const form = useForm({
    defaultValues: initial,
    onSubmit: async ({ value }) => {
      if (
        !value.name.trim() ||
        (locationFieldVisible(value) && !value.location.trim()) ||
        (categoryTree && !value.categoryId)
      ) {
        setShowErrors(true)
        setError("Fill in the required fields highlighted below.")
        return
      }
      setError(null)

      let imageKey: string | null = initialImageKey
      if (photo.pendingImage) {
        const fd = new FormData()
        fd.append("file", photo.pendingImage.file, photo.pendingImage.file.name)
        imageKey = (await uploadImageMutation.mutateAsync(fd)).imageKey
      } else if (imageKeyRemoved) {
        imageKey = null
      }

      await onSubmit({ ...value, imageKey, tagIds })
    },
  })

  function locationFieldVisible(v: ItemFormValues) {
    return !(v.kind === "bulk" && hideQrCode)
  }

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting)

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const handleCreateTag = async (input: { name: string; color: string }) => {
    const created = await createTagMutation.mutateAsync(input)
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

  const formBusy = isSubmitting || busy

  const kind = useStore(form.store, (s) => s.values.kind)
  const tagged = useStore(form.store, (s) => s.values.tagged)
  const name = useStore(form.store, (s) => s.values.name)
  const location = useStore(form.store, (s) => s.values.location)
  const locFieldVisible = locationFieldVisible(form.state.values)
  const nameError = showErrors && !name.trim()
  const locationError = showErrors && locFieldVisible && !location.trim()
  const categoryError =
    showErrors && !!categoryTree && !form.state.values.categoryId

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-4 p-4"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Photo</Label>
        <PhotoUpload
          state={photo}
          alt={name || "Item photo"}
          remoteUrl={remoteUrl}
          onRemove={handlePhotoRemove}
        />
      </div>

      <form.Field
        name="name"
        validators={{
          onSubmit: ({ value }) =>
            !value.trim() ? "Name is required" : undefined,
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item-name"
              required
              value={field.state.value}
              aria-invalid={nameError || undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {nameError && (
              <p className="text-[11px] font-medium text-destructive">
                Name is required.
              </p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-description">Description</Label>
            <Textarea
              id="item-description"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </form.Field>

      {kind === "bulk" && hideQrCode ? (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-[11px] text-muted-foreground">
          Location, status and condition are tracked per batch — manage them in
          the batches section below.
        </p>
      ) : (
        <>
          {kind === "bulk" && (
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Initial batch
            </p>
          )}

          <form.Field
            name="location"
            validators={{
              onSubmit: ({ value }) =>
                locFieldVisible && !value.trim()
                  ? "Location is required"
                  : undefined,
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-location">
                  Location <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-location"
                  required
                  value={field.state.value}
                  aria-invalid={locationError || undefined}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {locationError ? (
                  <p className="text-[11px] font-medium text-destructive">
                    Location is required.
                  </p>
                ) : (
                  <LocationChips
                    locations={locationSuggestions}
                    value={field.state.value}
                    onSelect={(loc) => field.handleChange(loc)}
                  />
                )}
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="status">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-status">Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as ItemStatus)}
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
              )}
            </form.Field>
            <form.Field name="condition">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="item-condition">Condition</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(v as ItemCondition)
                    }
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
              )}
            </form.Field>
          </div>
        </>
      )}

      {categoryTree && (
        <form.Field name="categoryId">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              {initial.categoryId &&
              field.state.value !== initial.categoryId ? (
                <p className="-mt-1 text-[11px] text-muted-foreground">
                  Currently:{" "}
                  <span className="font-medium">
                    {resolveCategoryPath(categoryTree, initial.categoryId) ||
                      "None"}
                  </span>
                </p>
              ) : null}
              <CategoryPicker
                tree={categoryTree}
                value={field.state.value}
                initialValue={initial.categoryId}
                onChange={(id) => field.handleChange(id)}
                onCreate={onCreateCategory}
              />
              {categoryError && (
                <p className="text-[11px] font-medium text-destructive">
                  Category is required.
                </p>
              )}
            </div>
          )}
        </form.Field>
      )}

      {!hideQrCode && (
        <form.Field name="kind">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label>Item type</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
                {(
                  [
                    {
                      id: "unit",
                      label: "Single item",
                      hint: "One QR per item",
                    },
                    {
                      id: "bulk",
                      label: "Bulk stock",
                      hint: "Qty per batch",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      field.handleChange(opt.id)
                      field.form.setFieldValue("tagged", opt.id !== "bulk")
                    }}
                    aria-pressed={field.state.value === opt.id}
                    className={
                      field.state.value === opt.id
                        ? "cursor-pointer rounded-md bg-card px-2 py-1.5 text-xs font-semibold text-foreground shadow-xs"
                        : "cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {field.state.value === "bulk"
                  ? "Fungible stock (e.g. pillows). One QR on the rack; quantities tracked per batch."
                  : "A single physical item with its own QR code."}
              </p>
            </div>
          )}
        </form.Field>
      )}

      {kind === "bulk" && !hideQrCode && (
        <form.Field name="quantity">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-quantity">Starting quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={String(field.state.value)}
                onChange={(e) => {
                  const n = Math.floor(Number(e.target.value))
                  if (e.target.value === "" || Number.isFinite(n)) {
                    field.handleChange(Math.max(0, n))
                  }
                }}
              />
            </div>
          )}
        </form.Field>
      )}

      {kind === "bulk" && (
        <form.Field name="tagged">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label>Unit tags</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
                <button
                  type="button"
                  onClick={() => field.handleChange(true)}
                  aria-pressed={field.state.value === true}
                  className={
                    field.state.value === true
                      ? "cursor-pointer rounded-md bg-card px-2 py-1.5 text-xs font-semibold text-foreground shadow-xs"
                      : "cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  Tagged
                </button>
                <button
                  type="button"
                  onClick={() => field.handleChange(false)}
                  aria-pressed={field.state.value === false}
                  className={
                    field.state.value === false
                      ? "cursor-pointer rounded-md bg-card px-2 py-1.5 text-xs font-semibold text-foreground shadow-xs"
                      : "cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  }
                >
                  Untagged
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {field.state.value
                  ? "Every unit has a physical QR tag. Use single or bulk scan."
                  : "Units can't wear tags (e.g. pillows, glassware). Manage via rack sheet."}
              </p>
            </div>
          )}
        </form.Field>
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

      {!hideQrCode && (kind !== "bulk" || tagged) && (
        <form.Field name="qrCode">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="item-qr">QR Code</Label>
                <button
                  type="button"
                  onClick={() => field.handleChange(generateQrCode())}
                  className="text-[10px] font-bold tracking-wider text-primary uppercase hover:underline"
                >
                  Re-roll
                </button>
              </div>
              <Input
                id="item-qr"
                value={field.state.value}
                readOnly
                onChange={() => {}}
                className="font-mono read-only:bg-muted read-only:text-muted-foreground"
              />
            </div>
          )}
        </form.Field>
      )}

      {(kind !== "bulk" || tagged) && (
        <form.Field name="printSize">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-print-size">QR print size</Label>
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as PrintSize)}
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
                Small for tiny items (plants, jewelry), large for oversized
                items (paintings, rugs).
              </p>
            </div>
          )}
        </form.Field>
      )}

      {canSetRequiredRole && (
        <form.Field name="requiredRole">
          {(field) => (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card p-3">
              <Checkbox
                checked={field.state.value === "org:admin"}
                onCheckedChange={(checked) =>
                  field.handleChange(checked ? "org:admin" : null)
                }
                className="mt-0.5 size-4 rounded"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold">Admin only</span>
                <span className="text-[11px] text-muted-foreground">
                  Only org admins can update or delete this item.
                </span>
              </span>
            </label>
          )}
        </form.Field>
      )}

      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-secondary px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" disabled={formBusy} className="h-12 w-full">
          {formBusy ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
