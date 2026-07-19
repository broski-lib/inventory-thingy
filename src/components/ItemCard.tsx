import type { ItemStatus } from "@/lib/item-status"
import type { InventoryItem } from "@/lib/inventory"
import type { ItemBatch } from "@/lib/batches"
import type { Tag } from "@/lib/tags"
import { LocationIcon, ShieldIcon } from "@/components/icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon, LockIcon } from "@hugeicons/core-free-icons"
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
  /** Resolved tags for the item (from getItemsPage). Omit to hide. */
  tags?: Tag[]
  /** Batches for bulk items — renders total + breakdown chips. */
  batches?: ItemBatch[]
  onEdit: () => void
  size?: "sm" | "md"
}

/**
 * Inventory card. Tap the body to edit. No menu / no long-press —
 * the QR code is surfaced from the item page header instead.
 */
export function ItemCard({
  item,
  tags,
  batches,
  onEdit,
  size = "md",
}: ItemCardProps) {
  const dim = size === "sm" ? "size-12" : "size-14"
  return (
    <article
      onClick={onEdit}
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
          <div className="flex shrink-0 flex-col items-end gap-1">
            {item.kind !== "bulk" && (
              <Badge variant={getStatusBadgeVariant(item.status)}>
                {item.status}
              </Badge>
            )}
            {item.requiredRole && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                <HugeiconsIcon icon={LockIcon} size={9} strokeWidth={2.5} />
                Admin only
              </span>
            )}
          </div>
        </div>
        {item.kind === "bulk" && batches ? (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-foreground">
              ×{batches.reduce((sum, b) => sum + b.qty, 0)} total
            </span>
            {batches.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {batches.map((b) => (
                  <Badge
                    key={b.id}
                    variant={getStatusBadgeVariant(b.status)}
                    className="max-w-full gap-1 px-1.5 py-0.5 text-[9px]"
                  >
                    ×{b.qty} {b.status}
                    <span className="truncate opacity-70">@ {b.location}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
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
        )}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-foreground"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
