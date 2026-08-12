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
import { useEffect, useState } from "react"
import { useLongPress } from "@/hooks/use-long-press"

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

const COMPACT_KEY = "stock:compact-cards"

function useCompactCards() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(COMPACT_KEY) === "1"
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COMPACT_KEY, compact ? "1" : "0")
    }
  }, [compact])

  return [compact, setCompact] as const
}

export { useCompactCards }

type ItemCardProps = {
  item: InventoryItemWithTags
  tags?: Tag[]
  batches?: ItemBatch[]
  onEdit: () => void
  onLongPress?: () => void
  size?: "sm" | "md"
  disabled?: boolean
  compact?: boolean
  priority?: boolean
}

export function ItemCard({
  item,
  tags,
  batches,
  onEdit,
  onLongPress,
  size = "md",
  disabled = false,
  compact = false,
  priority = false,
}: ItemCardProps) {
  const longPress = useLongPress({
    onLongPress: onLongPress ?? (() => {}),
  })
  const lpHandlers = onLongPress ? longPress.handlers : {}
  if (compact) {
    const dim = size === "sm" ? "size-12" : "size-14"
    return (
      <article
        onClick={
          disabled
            ? undefined
            : () => {
                if (longPress.wasLongPress()) return
                onEdit()
              }
        }
        className={
          disabled
            ? "relative flex gap-3"
            : "relative flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-all hover:border-primary"
        }
        {...lpHandlers}
      >
        <div
          className={`${dim} flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-accent`}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              decoding="async"
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
              {item.kind === "bulk" && (
                <Badge variant={item.tagged ? "available" : "neutral"}>
                  {item.tagged ? "Tagged" : "Untagged"}
                </Badge>
              )}
              {item.requiredRole && (
                <Badge variant="warning" className="gap-1 px-1.5 py-0.5 text-[9px]">
                  <HugeiconsIcon icon={LockIcon} size={9} strokeWidth={2.5} />
                  Admin only
                </Badge>
              )}
              {item.category ? (
                <Badge variant="outline" className="max-w-[80px] truncate px-1.5 py-0.5 text-[9px] font-semibold">
                  {item.category}
                </Badge>
              ) : null}
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

  // Large card: image on top at natural aspect ratio
  return (
    <article
      onClick={
        disabled
          ? undefined
          : () => {
              if (longPress.wasLongPress()) return
              onEdit()
            }
      }
      className={
        disabled
          ? "flex flex-col"
          : "flex cursor-pointer flex-col rounded-xl border border-border bg-card shadow-xs transition-all hover:border-primary active:scale-[0.99]"
      }
      {...lpHandlers}
    >
      <div className="flex w-full shrink-0 items-center justify-center overflow-hidden rounded-t-xl border-b border-border bg-accent">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center">
            <HugeiconsIcon
              icon={BoxIcon}
              size={40}
              strokeWidth={1.5}
              className="text-primary"
            />
          </div>
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
