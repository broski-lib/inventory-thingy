import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Delete01Icon,
  Folder01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import type { CategoryTreeNode } from "@/lib/categories"
import { deleteCategory } from "@/lib/categories"
import { useRouter } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type CategoryPickerProps = {
  tree: CategoryTreeNode[]
  value: string | null
  initialValue?: string | null
  onChange: (value: string | null) => void
  onCreate?: (name: string, parentId: string | null) => Promise<void>
  mode?: "select" | "filter"
}

export function CategoryPicker({
  tree,
  value,
  initialValue,
  onChange,
  onCreate,
  mode = "select",
}: CategoryPickerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [busy, setBusy] = useState(false)

  const isFilter = mode === "filter"
  const router = useRouter()
  const currentName = value ? findNodeName(tree, value) : null

  const onDelete = async (id: string) => {
    try {
      await deleteCategory({ data: id })
      router.invalidate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete category")
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async (parentId: string | null) => {
    if (!newName.trim() || busy || !onCreate) return
    setBusy(true)
    try {
      await onCreate(newName.trim(), parentId)
      setNewName("")
      setCreating(null)
      if (parentId) setExpanded((prev) => new Set([...prev, parentId]))
    } catch {
    } finally {
      setBusy(false)
    }
  }

  if (tree.length === 0 && !(isFilter || onCreate)) return null

  const showBody = isFilter ? !collapsed : !collapsed

  return (
    <div
      className={cn("flex flex-col rounded-lg border border-border bg-card")}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/50",
          showBody && "border-b border-border"
        )}
      >
        <HugeiconsIcon
          icon={collapsed ? ArrowRight01Icon : ArrowDown01Icon}
          size={12}
          strokeWidth={2.5}
          className="shrink-0 text-muted-foreground"
        />
        <HugeiconsIcon
          icon={Folder01Icon}
          size={15}
          strokeWidth={1.8}
          className={currentName ? "text-amber-500" : "text-muted-foreground"}
        />
        <span
          className={cn(
            "text-sm font-medium",
            currentName ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {currentName ?? (isFilter ? "All categories" : "Select category...")}
        </span>
        {currentName && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
            }}
            className="ml-auto text-[10px] font-semibold text-muted-foreground hover:text-destructive"
          >
            Clear
          </span>
        )}
      </button>

      {showBody && (
        <>
          <div
            className="overflow-y-auto overscroll-contain pr-1"
            style={{ maxHeight: "min(50vh, 24rem)" }}
          >
            {isFilter && tree.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No categories yet
              </p>
            ) : (
              renderNodes({
                nodes: tree,
                depth: 0,
                expanded,
                toggleExpand,
                value,
                initialValue: isFilter ? null : initialValue,
                isFilter,
                creating,
                setCreating,
                newName,
                setNewName,
                busy,
                handleCreate,
                onCreate: isFilter ? undefined : onCreate,
                onChange,
                onDelete,
              })
            )}
          </div>

          {!isFilter &&
            (creating === "__root__" ? (
              <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleCreate(null)
                    }
                    if (e.key === "Escape") {
                      setCreating(null)
                      setNewName("")
                    }
                  }}
                  placeholder="Category name"
                  className="h-9 flex-1 px-2"
                />
                <button
                  type="button"
                  onClick={() => handleCreate(null)}
                  disabled={busy || !newName.trim()}
                  className="shrink-0 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            ) : onCreate ? (
              <button
                type="button"
                onClick={() => {
                  setCreating("__root__")
                  setNewName("")
                }}
                className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground hover:text-primary"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={12} strokeWidth={2} />{" "}
                Add category
              </button>
            ) : null)}
        </>
      )}
    </div>
  )
}

type RenderParams = {
  nodes: CategoryTreeNode[]
  depth: number
  expanded: Set<string>
  toggleExpand: (id: string) => void
  value: string | null
  initialValue: string | null | undefined
  isFilter: boolean
  creating: string | null
  setCreating: (id: string | null) => void
  newName: string
  setNewName: (s: string) => void
  busy: boolean
  handleCreate: (parentId: string | null) => Promise<void>
  onCreate:
    ((name: string, parentId: string | null) => Promise<void>) | undefined
  onChange: (v: string | null) => void
  onDelete: (id: string) => void
}

function renderNodes(p: RenderParams) {
  const {
    nodes,
    depth,
    expanded,
    toggleExpand,
    value,
    initialValue,
    isFilter,
    creating,
    setCreating,
    newName,
    setNewName,
    busy,
    handleCreate,
    onCreate,
    onChange,
    onDelete,
  } = p

  return nodes.map((node) => {
    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const isSelected = value === node.id
    const isInitial =
      !isFilter && initialValue != null && initialValue === node.id
    const isInitialUnchanged = isInitial && value === initialValue

    const rowStyle = cn(
      "mx-2 flex w-[calc(100%-16px)] items-center gap-1.5 rounded-md text-left text-sm transition-colors hover:bg-accent",
      "px-2 py-1.5",
      isSelected &&
        !isInitialUnchanged &&
        "bg-primary/10 font-semibold text-primary",
      isInitialUnchanged && "bg-amber-50 font-medium text-amber-800",
      isSelected &&
        initialValue == null &&
        "bg-primary/10 font-semibold text-primary"
    )

    const handleClick = () => {
      toggleExpand(node.id)
      onChange(value === node.id ? null : node.id)
    }

    return (
      <div key={node.id}>
        <button type="button" onClick={handleClick} className={rowStyle}>
          <span style={{ width: depth * 14 }} className="shrink-0" />
          {hasChildren ? (
            <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
              <HugeiconsIcon
                icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                size={10}
                strokeWidth={2.5}
              />
            </span>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
          {hasChildren && (
            <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
              ({countLeaves(node)})
            </span>
          )}
          {!isFilter && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete "${node.name}"?`)) {
                  onDelete(node.id)
                }
              }}
              className="ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:text-destructive"
            >
              <HugeiconsIcon icon={Delete01Icon} size={10} strokeWidth={2} />
            </span>
          )}
        </button>

        {isExpanded &&
          hasChildren &&
          renderNodes({ ...p, nodes: node.children, depth: depth + 1 })}

        {isExpanded && !isFilter && onCreate && creating === node.id ? (
          <div
            className="flex items-center gap-2 py-1"
            style={{ paddingLeft: (depth + 1) * 14 + 28 }}
          >
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleCreate(node.id)
                }
                if (e.key === "Escape") {
                  setCreating(null)
                  setNewName("")
                }
              }}
              placeholder="Subcategory name"
              className="h-9 flex-1 px-2"
            />
            <button
              type="button"
              onClick={() => handleCreate(node.id)}
              disabled={busy || !newName.trim()}
              className="shrink-0 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ) : isExpanded && !isFilter && onCreate ? (
          <button
            type="button"
            onClick={() => {
              setCreating(node.id)
              setNewName("")
            }}
            className="flex w-full items-center gap-2 py-1.5 pr-3 text-[11px] text-muted-foreground hover:text-primary"
            style={{ paddingLeft: (depth + 1) * 14 + 28 }}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={10} strokeWidth={2} /> Add
            subcategory
          </button>
        ) : null}
      </div>
    )
  })
}

function countLeaves(node: CategoryTreeNode): number {
  if (node.children.length === 0) return 1
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0)
}

function findNodeName(nodes: CategoryTreeNode[], id: string): string | null {
  for (const node of nodes) {
    if (node.id === id) return node.name
    const found = findNodeName(node.children, id)
    if (found) return `${node.name} / ${found}`
  }
  return null
}

export function resolveCategoryPath(
  tree: CategoryTreeNode[],
  categoryId: string | null
): string {
  if (!categoryId) return ""
  return findNodeName(tree, categoryId) ?? ""
}
