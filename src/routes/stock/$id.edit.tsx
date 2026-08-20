import { createFileRoute, notFound } from "@tanstack/react-router"
import { getItemById, getLocations } from "@/lib/inventory"
import { getCategoryTree } from "@/lib/categories"
import { listTags } from "@/lib/tags"

type EditSearch = {
  /** JSON-serialized stock list search to restore on return. */
  back?: string
}

export const Route = createFileRoute("/stock/$id/edit")({
  staleTime: 0,
  validateSearch: (search: Record<string, unknown>): EditSearch => ({
    back: typeof search.back === "string" ? search.back : undefined,
  }),
  loader: async ({ params }) => {
    const [item, allTags, locations, categoryTree] = await Promise.all([
      getItemById({ data: params.id }),
      listTags(),
      getLocations(),
      getCategoryTree(),
    ])
    if (!item) throw notFound()
    return { item, allTags, locations, categoryTree }
  },
})