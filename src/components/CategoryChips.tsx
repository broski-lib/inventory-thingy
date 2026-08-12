import { cn } from "@/lib/utils"

const DEFAULT_CATEGORIES = [
  "Seating",
  "Tables",
  "Beds & Headboards",
  "Storage",
  "Rugs",
  "Lighting",
  "Decor & Art",
  "Outdoor",
  "Accessories",
  "Other",
]

type CategoryChipsProps = {
  categories: string[]
  value: string
  onSelect: (category: string) => void
}

export function CategoryChips({ categories, value, onSelect }: CategoryChipsProps) {
  const options = [
    ...new Set([...DEFAULT_CATEGORIES, ...categories]),
  ].filter(Boolean)

  if (options.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn(
          "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-all",
          !value
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:bg-accent"
        )}
      >
        None
      </button>
      {options.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat === value ? "" : cat)}
          className={cn(
            "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-all",
            cat === value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-accent"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
