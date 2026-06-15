import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
}: SearchInputProps) {
  return (
    <label
      className={cn(
        "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm shadow-sm transition-all focus-within:border-ring",
        className
      )}
    >
      <HugeiconsIcon
        icon={Search01Icon}
        size={18}
        strokeWidth={1.8}
        className="text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-auto min-h-0 flex-1 border-0 bg-transparent px-0 py-0 focus-visible:border-0",
          inputClassName
        )}
      />
    </label>
  )
}
