import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { ItemCard } from "@/components/ItemCard"
import type { InventoryItemWithTags } from "@/lib/inventory"
import { cn } from "@/lib/utils"

export function SelectionAwareCard({
  item,
  selectionMode,
  selected,
  onEdit,
  onToggle,
  onLongPress,
  compact,
  priority,
}: {
  item: InventoryItemWithTags
  selectionMode: boolean
  selected: boolean
  onEdit: () => void
  onToggle: () => void
  onLongPress?: (id: string) => void
  compact?: boolean
  priority?: boolean
}) {
  if (selectionMode) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-stretch gap-3 rounded-xl border p-3 text-left shadow-xs transition-all active:scale-[0.98]",
          selected
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border bg-card hover:border-primary/50"
        )}
      >
        <SelectionCheckbox selected={selected} />
        <div className="min-w-0 flex-1">
            <ItemCard
              item={item}
              tags={item.tags}
              batches={item.batches}
              size="md"
              onEdit={onEdit}
              disabled
              compact={compact}
              priority={priority}
            />
        </div>
      </button>
    )
  }
  return (
    <ItemCard
      item={item}
      tags={item.tags}
      batches={item.batches}
      size="md"
      onEdit={onEdit}
      onLongPress={onLongPress ? () => onLongPress(item.id) : undefined}
      compact={compact}
      priority={priority}
    />
  )
}

function SelectionCheckbox({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
        selected
          ? "scale-110 border-primary bg-primary text-primary-foreground"
          : "border-border bg-card"
      )}
    >
      {selected && (
        <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={3} />
      )}
    </span>
  )
}
