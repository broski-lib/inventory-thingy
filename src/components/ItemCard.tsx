import type { ItemStatus } from "@/lib/item-status"
import type { InventoryItem } from "@/lib/inventory"
import { LocationIcon, ShieldIcon } from "@/components/icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon } from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"
import type { badgeVariants } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

export function getStatusBadgeVariant(status: ItemStatus): BadgeVariant {
  switch (status) {
    case "Available":
    case "In Storage":
      return "available"
    case "Staged":
    case "Reserved":
      return "staged"
    case "Repair":
      return "repair"
    default:
      return "neutral"
  }
}

type ItemCardProps = {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  size?: "sm" | "md"
}

/**
 * Inventory card. Tap the body to edit. No menu / no long-press —
 * the QR code is surfaced from the item page header instead.
 */
export function ItemCard({ item, onEdit, size = "md" }: ItemCardProps) {
  const dim = size === "sm" ? "size-12" : "size-14"
  return (
    <article
      onClick={() => onEdit(item)}
      className="relative flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:border-primary"
    >
      <div
        className={`${dim} flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-accent`}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="size-full object-cover"
          />
        ) : (
          <HugeiconsIcon
            icon={BoxIcon}
            size={size === "sm" ? 20 : 22}
            strokeWidth={1.5}
            className="text-primary"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {item.name}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {item.qrCode}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(item.status)}>
            {item.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <LocationIcon />
            <span className="truncate">{item.location}</span>
          </span>
          <span className="font-semibold text-foreground">
            <ShieldIcon />
            {item.condition}
          </span>
        </div>
      </div>
    </article>
  )
}
