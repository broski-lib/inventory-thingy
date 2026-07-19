import { cn } from "@/lib/utils"

type LocationChipsProps = {
  locations: string[]
  value: string
  onSelect: (location: string) => void
}

/**
 * One-tap location shortcuts. Locations repeat constantly ("the warehouse"),
 * so existing org locations are offered as chips under the free-text input —
 * tap to fill, or keep typing a new one.
 */
export function LocationChips({ locations, value, onSelect }: LocationChipsProps) {
  if (locations.length === 0) return null
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {locations.map((loc) => {
        const active = value.trim() === loc
        return (
          <button
            key={loc}
            type="button"
            onClick={() => onSelect(loc)}
            aria-pressed={active}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {loc}
          </button>
        )
      })}
    </div>
  )
}
