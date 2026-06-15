import type { ItemStatus } from "@/lib/item-status"
import type { InventoryItem } from "@/components/ItemEditModal"
import { LocationIcon, ShieldIcon, EditIcon, QrIcon } from "@/components/icons"
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
  onClick: (item: InventoryItem) => void
  onLongPress?: (item: InventoryItem) => void
  size?: "sm" | "md"
}

export function ItemCard({
  item,
  onClick,
  onLongPress,
  size = "md",
}: ItemCardProps) {
  const dim = size === "sm" ? "size-14" : "size-16"
  return (
    <article
      onClick={() => onClick(item)}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress?.(item)
      }}
      className="flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:border-primary"
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
            size={size === "sm" ? 24 : 26}
            strokeWidth={1.5}
            className="text-primary"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {item.name}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {item.qrCode}
            </p>
          </div>
          <Badge variant={getStatusBadgeVariant(item.status)}>
            {item.status}
          </Badge>
        </div>
        {size === "md" && item.description && (
          <p className="mt-1 line-clamp-1 text-[10px] font-light text-muted-foreground italic">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
          <span className="truncate">
            <LocationIcon />
            {item.location}
          </span>
          <span className="font-semibold text-foreground">
            <ShieldIcon />
            {item.condition}
          </span>
        </div>
        {onLongPress && (
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClick(item)
              }}
              className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center rounded border border-border text-[10px] font-semibold tracking-wider text-foreground uppercase hover:bg-secondary"
            >
              <EditIcon />
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onLongPress(item)
              }}
              className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center rounded border border-border text-[10px] font-semibold tracking-wider text-foreground uppercase hover:bg-secondary"
            >
              <QrIcon className="mr-1 size-3" />
              QR
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
