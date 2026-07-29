import type { ItemStatus } from "@/lib/constants"
import type { InventoryItemWithTags } from "@/lib/inventory"
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
    case "Pending Tag":
      return "pending"
    default:
      return "neutral"
  }
}

type ItemCardProps = {
  item: InventoryItemWithTags
  tags?: Tag[]
  batches?: ItemBatch[]
  onEdit: () => void
  size?: "sm" | "md"
  disabled?: boolean
}

export function ItemCard({
  item,
  tags,
  batches,
  onEdit,
  size = "md",
  disabled = false,
}: ItemCardProps) {
  const imgHeight = size === "sm" ? "h-28" : "h-36"

  return (
    <article
      onClick={disabled ? undefined : onEdit}
      className={
        disabled
          ? "flex flex-col"
          : "flex cursor-pointer flex-col rounded-xl border border-border bg-card shadow-xs transition-all hover:border-primary active:scale-[0.99]"
      }
    >
      <div
        className={`${imgHeight} flex w-full shrink-0 items-center justify-center overflow-hidden rounded-t-xl border-b border-border bg-accent`}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <HugeiconsIcon
            icon={BoxIcon}
            size={size === "sm" ? 32 : 40}
            strokeWidth={1.5}
            className="text-primary"
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
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
              <Badge variant="warning" className="gap-1 px-1.5 py-0.5 text-[9px]">
                <HugeiconsIcon icon={LockIcon} size={9} strokeWidth={2.5} />
                Admin only
              </Badge>
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
            <span className="shrink-0 font-semibold text-foreground">
              <ShieldIcon />
              {item.condition}
            </span>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="gap-1 px-1.5 py-0.5 text-[9px] font-semibold"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
