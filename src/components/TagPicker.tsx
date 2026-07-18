import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import type { Tag } from "@/lib/tags"
import { TAG_COLORS } from "@/lib/schema"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { PlusIcon } from "@/components/icons"

export function TagChip({
  tag,
  selected,
  onClick,
}: {
  tag: Tag
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
        selected
          ? "border-transparent text-white shadow-xs"
          : "border-border bg-card text-foreground hover:bg-accent"
      )}
      style={selected ? { backgroundColor: tag.color } : undefined}
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: selected ? "#ffffff" : tag.color }}
      />
      {tag.name}
    </button>
  )
}

/**
 * Multi-select tag chips with optional inline creation (name + preset
 * palette color). Used by the item form and the stock filter sheet.
 */
export function TagPicker({
  tags,
  selectedIds,
  onToggle,
  onCreate,
}: {
  tags: Tag[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onCreate?: (input: { name: string; color: string }) => Promise<Tag>
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState<string>(TAG_COLORS[5].value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!onCreate || !name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await onCreate({ name: name.trim(), color })
      setName("")
      setCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create tag")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            tag={tag}
            selected={selectedIds.includes(tag.id)}
            onClick={() => onToggle(tag.id)}
          />
        ))}
        {onCreate && !creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <PlusIcon className="size-3" />
            New tag
          </button>
        )}
        {tags.length === 0 && !creating && !onCreate && (
          <p className="text-xs text-muted-foreground">No tags yet.</p>
        )}
      </div>

      {creating && onCreate && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
            className="h-9 text-base sm:text-sm"
            maxLength={50}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleCreate()
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                onClick={() => setColor(c.value)}
                className={cn(
                  "flex size-6 cursor-pointer items-center justify-center rounded-full transition-transform",
                  color === c.value && "ring-2 ring-foreground ring-offset-2"
                )}
                style={{ backgroundColor: c.value }}
              >
                {color === c.value && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className="size-3 text-white"
                    strokeWidth={3}
                  />
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={busy || !name.trim()}
              className="ml-auto cursor-pointer rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false)
                setError(null)
              }}
              className="cursor-pointer px-1 text-[11px] font-semibold text-muted-foreground"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}
