import { useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { addBatch, deleteBatch, moveBatchQty, setBatchQty } from "@/lib/batches"
import type { ItemBatch } from "@/lib/batches"
import { ITEM_CONDITIONS, ITEM_STATUSES } from "@/lib/item-status"
import type { ItemCondition, ItemStatus } from "@/lib/item-status"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer"
import { PlusIcon, TrashIcon } from "@/components/icons"
import { LocationChips } from "@/components/LocationChips"
import { getStatusBadgeVariant } from "@/components/ItemCard"

type BatchState = {
  location: string
  status: ItemStatus
  condition: ItemCondition
}

const DEFAULT_STATE: BatchState = {
  location: "",
  status: "In Storage",
  condition: "Good",
}

/**
 * Batch list + adjust UI for bulk items. Lives on the edit page under the
 * item form. Every mutation refreshes the route loader.
 */
export function BatchManager({
  itemId,
  batches,
  locationSuggestions = [],
}: {
  itemId: string
  batches: ItemBatch[]
  /** Existing org locations, shown as one-tap chips in the batch form. */
  locationSuggestions?: string[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [moveTarget, setMoveTarget] = useState<ItemBatch | null>(null)

  const total = batches.reduce((sum, b) => sum + b.qty, 0)

  // Prefill the add-batch form with the most-used location so the common
  // case ("add 3 more units in storage") is quantity-only.
  const defaultLocation = (() => {
    const counts = new Map<string, number>()
    for (const b of batches) {
      counts.set(b.location, (counts.get(b.location) ?? 0) + 1)
    }
    let best = ""
    let bestCount = 0
    for (const [loc, count] of counts) {
      if (count > bestCount) {
        best = loc
        bestCount = count
      }
    }
    return best || locationSuggestions[0] || ""
  })()

  const run = async (fn: () => Promise<unknown>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await fn()
      router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch operation failed")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = (batch: ItemBatch) => {
    if (
      !confirm(
        `Delete this batch of ${batch.qty}? The units are written off.`
      )
    ) {
      return
    }
    void run(() => deleteBatch({ data: { batchId: batch.id, itemId } }))
  }

  return (
    <section className="flex flex-col gap-3 border-t border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          Batches — {total} total
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="h-8"
        >
          <PlusIcon className="size-3.5" />
          Add batch
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {batches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          No stock. Add a batch to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {batches.map((batch) => (
            <BatchRow
              key={batch.id}
              batch={batch}
              busy={busy}
              onMove={() => setMoveTarget(batch)}
              onDelete={() => handleDelete(batch)}
              onSetQty={(qty) =>
                run(() =>
                  setBatchQty({ data: { batchId: batch.id, itemId, qty } })
                )
              }
            />
          ))}
        </div>
      )}

      <BatchFormDrawer
        title="Add batch"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        busy={busy}
        submitLabel="Add stock"
        initial={{ ...DEFAULT_STATE, location: defaultLocation }}
        locationSuggestions={locationSuggestions}
        onSubmit={(qty, state) =>
          run(async () => {
            await addBatch({ data: { itemId, qty, ...state } })
            setAddOpen(false)
          })
        }
      />

      {moveTarget && (
        <BatchFormDrawer
          title={`Move from ${moveTarget.location}`}
          open
          onClose={() => setMoveTarget(null)}
          busy={busy}
          submitLabel="Move"
          maxQty={moveTarget.qty}
          initial={{
            location: moveTarget.location,
            status: moveTarget.status,
            condition: moveTarget.condition,
          }}
          locationSuggestions={locationSuggestions}
          onSubmit={(qty, state) =>
            run(async () => {
              await moveBatchQty({
                data: {
                  itemId,
                  fromBatchId: moveTarget.id,
                  qty,
                  ...state,
                },
              })
              setMoveTarget(null)
            })
          }
        />
      )}
    </section>
  )
}

function BatchRow({
  batch,
  busy,
  onMove,
  onDelete,
  onSetQty,
}: {
  batch: ItemBatch
  busy: boolean
  onMove: () => void
  onDelete: () => void
  onSetQty: (qty: number) => Promise<void>
}) {
  const [editingQty, setEditingQty] = useState(false)
  const [qtyInput, setQtyInput] = useState(String(batch.qty))

  const saveQty = () => {
    const n = Math.floor(Number(qtyInput))
    setEditingQty(false)
    if (Number.isFinite(n) && n >= 0 && n !== batch.qty) {
      void onSetQty(n)
    } else {
      setQtyInput(String(batch.qty))
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        {editingQty ? (
          <span className="flex items-center gap-1.5">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  saveQty()
                }
              }}
              className="h-8 w-20 text-base sm:text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={saveQty}
              aria-label="Save quantity"
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void onSetQty(batch.qty - 1)}
              disabled={busy || batch.qty <= 1}
              aria-label="Remove one unit"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-border text-base font-bold text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                setQtyInput(String(batch.qty))
                setEditingQty(true)
              }}
              className="min-w-8 cursor-pointer px-1 text-sm font-bold text-foreground hover:text-primary"
              title="Tap to correct quantity"
            >
              ×{batch.qty}
            </button>
            <button
              type="button"
              onClick={() => void onSetQty(batch.qty + 1)}
              disabled={busy}
              aria-label="Add one unit"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-border text-base font-bold text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              +
            </button>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMove}
            disabled={busy}
            className="h-8"
          >
            Move
          </Button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-label="Delete batch"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <TrashIcon className="size-3.5" />
          </button>
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate">{batch.location}</span>
        <Badge variant={getStatusBadgeVariant(batch.status)}>
          {batch.status}
        </Badge>
        <span>{batch.condition}</span>
      </div>
    </div>
  )
}

function BatchFormDrawer({
  title,
  open,
  onClose,
  busy,
  submitLabel,
  maxQty,
  initial,
  locationSuggestions = [],
  onSubmit,
}: {
  title: string
  open: boolean
  onClose: () => void
  busy: boolean
  submitLabel: string
  /** Cap quantity (move flow). Undefined = no cap (add flow). */
  maxQty?: number
  initial: BatchState
  locationSuggestions?: string[]
  onSubmit: (qty: number, state: BatchState) => Promise<void>
}) {
  // Raw text so the field can be cleared and retyped; parsed on submit.
  const [qtyText, setQtyText] = useState("1")
  const [state, setState] = useState<BatchState>(initial)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQtyText("1")
      setState(initial)
      onClose()
    }
  }

  const qty = Math.floor(Number(qtyText))
  const validQty =
    qtyText !== "" &&
    Number.isFinite(qty) &&
    qty >= 1 &&
    (maxQty === undefined || qty <= maxQty)
  const valid = validQty && state.location.trim() !== ""

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent onClose={() => handleOpenChange(false)}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="space-y-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="batch-qty">
              Quantity{maxQty !== undefined ? ` (max ${maxQty})` : ""}
            </Label>
            <Input
              id="batch-qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQty}
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              className="text-base sm:text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="batch-location">Location</Label>
            <Input
              id="batch-location"
              value={state.location}
              onChange={(e) =>
                setState((prev) => ({ ...prev, location: e.target.value }))
              }
              className="text-base sm:text-sm"
            />
            <LocationChips
              locations={locationSuggestions}
              value={state.location}
              onSelect={(loc) =>
                setState((prev) => ({ ...prev, location: loc }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={state.status}
                onValueChange={(v) =>
                  setState((prev) => ({ ...prev, status: v as ItemStatus }))
                }
              >
                <SelectTrigger>
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
              <Label>Condition</Label>
              <Select
                value={state.condition}
                onValueChange={(v) =>
                  setState((prev) => ({
                    ...prev,
                    condition: v as ItemCondition,
                  }))
                }
              >
                <SelectTrigger>
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
        </DrawerBody>
        <DrawerFooter className="flex-row gap-2 p-4 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))]">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={busy || !valid}
            onClick={() => void onSubmit(qty, { ...state, location: state.location.trim() })}
          >
            {busy ? "Saving..." : submitLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
