import { ActivityList } from "@/components/ActivityLog"
import { Skeleton } from "@/components/ui/skeleton"
import type { ActivityLog } from "@/lib/activity"

const HOME_ACTIVITY_LIMIT = 3

type HomeActivityProps = {
  onItemClick: (log: ActivityLog) => void
  logs: ActivityLog[] | null
}

export function HomeActivity({ onItemClick, logs }: HomeActivityProps) {
  if (logs === null) {
    return <HomeActivitySkeleton />
  }

  return (
    <ActivityList
      logs={logs}
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
