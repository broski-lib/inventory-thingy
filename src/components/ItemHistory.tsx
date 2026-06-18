import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon } from "@hugeicons/core-free-icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ItemCardSkeleton"
import { getItemActivity } from "@/lib/activity"
import type { ActivityLog } from "@/lib/activity"

type ItemHistoryProps = {
  itemId: string
  initialLogs?: ActivityLog[]
}

export function ItemHistory({ itemId, initialLogs }: ItemHistoryProps) {
  const [logs, setLogs] = useState<ActivityLog[] | null>(initialLogs ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialLogs) return
    let cancelled = false
    setError(null)
    getItemActivity({ data: itemId })
      .then((rows) => {
        if (cancelled) return
        setLogs(rows)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load history")
        setLogs([])
      })
    return () => {
      cancelled = true
    }
  }, [itemId, initialLogs])

  if (logs === null) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        No history for this item yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {logs.map((log) => (
        <ActivityEntry key={log.id} log={log} />
      ))}
    </div>
  )
}

const ACTION_META: Record<string, { label: string; tone: string }> = {
  created: { label: "Registered", tone: "bg-primary/10 text-primary" },
  updated: { label: "Updated details", tone: "bg-muted text-muted-foreground" },
  deleted: { label: "Removed", tone: "bg-destructive/10 text-destructive" },
  checked_out: { label: "Checked out", tone: "bg-primary/10 text-primary" },
  checked_in: { label: "Checked in", tone: "bg-success/10 text-success" },
  reported_damaged: {
    label: "Reported damaged",
    tone: "bg-destructive/10 text-destructive",
  },
  moved: { label: "Relocated", tone: "bg-primary/10 text-primary" },
  condition_changed: {
    label: "Condition updated",
    tone: "bg-warning/10 text-warning-foreground",
  },
}

function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return "just now"
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function ActivityEntry({ log }: { log: ActivityLog }) {
  const meta = ACTION_META[log.action] ?? {
    label: log.action,
    tone: "bg-muted text-muted-foreground",
  }
  const hasLocationChange =
    log.fromLocation !== null &&
    log.toLocation !== null &&
    log.fromLocation !== log.toLocation
  const hasConditionChange =
    log.fromCondition !== null &&
    log.toCondition !== null &&
    log.fromCondition !== log.toCondition

  return (
    <div className="flex items-start gap-3 p-4">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
      >
        <HugeiconsIcon icon={BoxIcon} size={16} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {meta.label}
          </p>
          <span className="shrink-0 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {relativeTime(log.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {log.userName || "Unknown user"}
          {log.itemQrCode ? (
            <span className="font-mono"> · {log.itemQrCode}</span>
          ) : null}
        </p>
        {hasLocationChange && (
          <p className="mt-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {log.fromLocation} → {log.toLocation}
          </p>
        )}
        {hasConditionChange && (
          <p className="mt-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {log.fromCondition} → {log.toCondition}
          </p>
        )}
      </div>
    </div>
  )
}
