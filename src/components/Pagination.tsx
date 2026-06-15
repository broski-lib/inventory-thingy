import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PaginationProps = {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div
        className={cn(
          "flex items-center justify-center pt-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase",
          className
        )}
      >
        {total} {total === 1 ? "item" : "items"}
      </div>
    )
  }

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const canPrev = page > 1
  const canNext = page < totalPages

  const goto = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return
    onPageChange(p)
  }

  return (
    <div
      className={cn("flex items-center justify-between gap-2 pt-2", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canPrev}
        onClick={() => goto(page - 1)}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
        Prev
      </Button>
      <div className="text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
        <span className="block sm:inline">
          {first}-{last} of {total}
        </span>
        <span className="hidden sm:inline"> · </span>
        <span className="block sm:inline">
          Page {page} / {totalPages}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canNext}
        onClick={() => goto(page + 1)}
      >
        Next
        <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
      </Button>
    </div>
  )
}
