import type { ActivityLog } from "@/lib/activity"
import type { ActivityAction } from "@/lib/schema"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
  ArrowLeftRightIcon,
  PackageRemoveIcon,
  Settings02Icon,
  Tick02Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { formatRelative } from "@/lib/format"

type ActivityEntryProps = {
  log: ActivityLog
  className?: string
  showItem?: boolean
  onClick?: (log: ActivityLog) => void
}

const ACTION_META: Record<
  ActivityAction,
  {
    label: string
    icon: typeof Settings02Icon
    tone: "default" | "success" | "warning" | "destructive" | "muted"
  }
> = {
  created: {
    label: "Registered",
    icon: Add01Icon,
    tone: "default",
  },
  updated: {
    label: "Updated details",
    icon: Settings02Icon,
    tone: "muted",
  },
  deleted: {
    label: "Removed",
    icon: PackageRemoveIcon,
    tone: "destructive",
  },
  checked_out: {
    label: "Checked out",
    icon: ArrowUp01Icon,
    tone: "default",
  },
  checked_in: {
    label: "Checked in",
    icon: ArrowDown01Icon,
    tone: "success",
  },
  reported_damaged: {
    label: "Reported damaged",
    icon: Wrench01Icon,
    tone: "destructive",
  },
  moved: {
    label: "Relocated",
    icon: ArrowLeftRightIcon,
    tone: "default",
  },
  condition_changed: {
    label: "Condition updated",
    icon: CheckmarkCircle01Icon,
    tone: "warning",
  },
}

function toneClasses(
  tone: "default" | "success" | "warning" | "destructive" | "muted"
) {
  switch (tone) {
    case "success":
      return "bg-success/10 text-success"
    case "warning":
      return "bg-warning/10 text-warning-foreground"
    case "destructive":
      return "bg-destructive/10 text-destructive"
    case "muted":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-primary/10 text-primary"
  }
}

export function ActivityEntry({
  log,
  className,
  showItem = true,
  onClick,
}: ActivityEntryProps) {
  const meta = ACTION_META[log.action]
  const Icon = meta.icon
  const isClickable = Boolean(onClick) && Boolean(log.itemId)

  const handleClick = () => {
    if (!onClick || !log.itemId) return
    onClick(log)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isClickable) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      className={cn(
        "flex items-start gap-3 py-3",
        isClickable &&
          "-mx-2 cursor-pointer rounded-md px-2 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        className
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          toneClasses(meta.tone)
        )}
        aria-hidden
      >
        <HugeiconsIcon icon={Icon} size={16} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {meta.label}
            {showItem && log.itemName && (
              <>
                {" "}
                <span className="font-normal text-muted-foreground">
                  ·
                </span>{" "}
                <span className="text-foreground">{log.itemName}</span>
              </>
            )}
          </p>
          <span className="text-[10px] tracking-wider whitespace-nowrap text-muted-foreground uppercase">
            {formatRelative(log.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {log.userName || "Unknown user"}
          {log.itemQrCode ? (
            <span className="font-mono"> · {log.itemQrCode}</span>
          ) : null}
        </p>
        <ActivityDetails log={log} />
      </div>
    </div>
  )
}

function ActivityDetails({ log }: { log: ActivityLog }) {
  const hasLocationChange =
    log.fromLocation !== null &&
    log.toLocation !== null &&
    log.fromLocation !== log.toLocation
  const hasConditionChange =
    log.fromCondition !== null &&
    log.toCondition !== null &&
    log.fromCondition !== log.toCondition

  if (!hasLocationChange && !hasConditionChange) return null

  return (
    <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-semibold tracking-wider uppercase">
      {hasLocationChange && (
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-muted-foreground">
          <span className="text-foreground/60">From</span>
          <span className="tracking-normal text-foreground normal-case">
            {log.fromLocation}
          </span>
          <span className="text-foreground/60">→</span>
          <span className="tracking-normal text-foreground normal-case">
            {log.toLocation}
          </span>
        </span>
      )}
      {hasConditionChange && (
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-muted-foreground">
          <HugeiconsIcon icon={Tick02Icon} size={10} strokeWidth={2.5} />
          <span className="tracking-normal text-foreground normal-case">
            {log.fromCondition} → {log.toCondition}
          </span>
        </span>
      )}
    </div>
  )
}

type ActivityListProps = {
  logs: ActivityLog[]
  emptyMessage?: string
  showItem?: boolean
  onItemClick?: (log: ActivityLog) => void
  className?: string
}

export function ActivityList({
  logs,
  emptyMessage = "No activity yet.",
  showItem = true,
  onItemClick,
  className,
}: ActivityListProps) {
  if (logs.length === 0) {
    return (
      <p
        className={cn(
          "py-4 text-center text-xs text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </p>
    )
  }
  return (
    <div className={cn("divide-y divide-border", className)}>
      {logs.map((log) => (
        <ActivityEntry
          key={log.id}
          log={log}
          showItem={showItem}
          onClick={onItemClick}
        />
      ))}
    </div>
  )
}
