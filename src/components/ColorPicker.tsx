import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { TAG_COLORS } from "@/lib/constants"
import { cn } from "@/lib/utils"

type ColorPickerProps = {
  value: string
  onChange: (color: string) => void
  size?: "sm" | "md"
}

export function ColorPicker({
  value,
  onChange,
  size = "md",
}: ColorPickerProps) {
  const buttonSize = size === "sm" ? "size-5" : "size-6"
  const iconSize = size === "sm" ? 2.5 : 3

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TAG_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          aria-label={c.name}
          onClick={() => onChange(c.value)}
          className={cn(
            "flex cursor-pointer items-center justify-center rounded-full transition-transform",
            buttonSize,
            value === c.value && "ring-2 ring-foreground ring-offset-2"
          )}
          style={{ backgroundColor: c.value }}
        >
          {value === c.value && (
            <HugeiconsIcon
              icon={Tick02Icon}
              className="size-3 text-white"
              strokeWidth={iconSize}
            />
          )}
        </button>
      ))}
    </div>
  )
}
