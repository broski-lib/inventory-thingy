import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { getItemActivity } from "@/lib/activity"
import type { ActivityLog } from "@/lib/activity"
import { ActivityEntry } from "@/components/ActivityLog"

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
        <ActivityEntry key={log.id} log={log} showItem={false} />
      ))}
    </div>
  )
}
