import { createFileRoute, notFound } from "@tanstack/react-router"
import { getItemById, getItemsByIds } from "@/lib/inventory"
import { getRack } from "@/lib/racks"

export type PrintKind = "tags" | "single" | "rack"

type PrintSearch = {
  kind?: PrintKind
  ids?: string
  id?: string
  rackId?: string
}

function parseCsvIds(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined
  const list = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return list.length > 0 ? list : undefined
}

export const Route = createFileRoute("/print")({
  validateSearch: (search: Record<string, unknown>): PrintSearch => ({
    kind:
      search.kind === "tags" ||
      search.kind === "single" ||
      search.kind === "rack"
        ? search.kind
        : undefined,
    ids: typeof search.ids === "string" ? search.ids : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
    rackId: typeof search.rackId === "string" ? search.rackId : undefined,
  }),
  loaderDeps: ({ search }) => ({
    kind: search.kind,
    ids: search.ids,
    id: search.id,
    rackId: search.rackId,
  }),
  loader: async ({ deps }) => {
    const { kind, ids, id, rackId } = deps
    if (kind === "tags" && ids) {
      const idList = parseCsvIds(ids) ?? []
      const items = await getItemsByIds({ data: idList })
      return { kind: "tags" as const, items }
    }
    if (kind === "single" && id) {
      const item = await getItemById({ data: id })
      if (!item) throw notFound()
      return { kind: "single" as const, item }
    }
    if (kind === "rack" && rackId) {
      const rack = await getRack({ data: rackId })
      if (!rack) throw notFound()
      return { kind: "rack" as const, rack }
    }
    throw notFound()
  },
  pendingComponent: PrintPending,
})

function PrintPending() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-white">
      <p className="text-sm text-muted-foreground">Preparing print…</p>
    </div>
  )
}
