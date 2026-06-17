import { useEffect, useState } from "react"
import { ActivityList } from "@/components/ActivityLog"
import { Skeleton } from "@/components/ItemCardSkeleton"
import { getRecentActivity } from "@/lib/activity"
import type { ActivityLog } from "@/lib/activity"

const HOME_ACTIVITY_LIMIT = 3

type HomeActivityProps = {
  onItemClick: (log: ActivityLog) => void
}

export function HomeActivity({ onItemClick }: HomeActivityProps) {
  const [state, setState] = useState<{
    logs: ActivityLog[]
    error: string | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    getRecentActivity({ data: HOME_ACTIVITY_LIMIT })
      .then((logs) => {
        if (cancelled) return
        setState({ logs, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          logs: [],
          error: err instanceof Error ? err.message : "Failed to load activity",
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!state) {
    return <HomeActivitySkeleton />
  }

  if (state.error) {
    return (
      <p className="py-2 text-center text-xs text-destructive">{state.error}</p>
    )
  }

  return (
    <ActivityList
      logs={state.logs}
      onItemClick={onItemClick}
      emptyMessage="No activity yet. Add or update an item to see it here."
    />
  )
}

function HomeActivitySkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: HOME_ACTIVITY_LIMIT }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
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
