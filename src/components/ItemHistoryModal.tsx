import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ResponsiveOverlay } from "@/components/ResponsiveOverlay"
import { ActivityList } from "@/components/ActivityLog"
import { Skeleton } from "@/components/ItemCardSkeleton"
import { getItemActivity } from "@/lib/activity"
import type { ActivityLog } from "@/lib/activity"

type HistoryTarget = {
  id: string
  name: string
  qrCode: string
}

type ItemHistoryModalProps = {
  open: boolean
  onClose: () => void
  target: HistoryTarget | null
}

export function ItemHistoryModal({
  open,
  onClose,
  target,
}: ItemHistoryModalProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !target) {
      setLogs([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getItemActivity({ data: target.id })
      .then((rows) => {
        if (cancelled) return
        setLogs(rows)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load history")
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, target?.id])

  const body = (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <ActivityList
          logs={logs}
          showItem={false}
          emptyMessage="No history for this item yet."
        />
      )}
    </div>
  )

  return (
    <ResponsiveOverlay
      open={open && target !== null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title={target?.name ?? ""}
      description={target?.qrCode}
    >
      {body}
    </ResponsiveOverlay>
  )
}
