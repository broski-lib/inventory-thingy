import { createFileRoute, notFound } from "@tanstack/react-router"
import { getRack } from "@/lib/racks"
import { getLocations } from "@/lib/inventory"
import { getCategoryTree } from "@/lib/categories"
import { listTags } from "@/lib/tags"

export const Route = createFileRoute("/stock/racks/$id/items")({
  preload: false,
  loader: async ({ params }) => {
    const [rack, locations, categoryTree, allTags] = await Promise.all([
      getRack({ data: params.id }),
      getLocations(),
      getCategoryTree(),
      listTags(),
    ])
    if (!rack) throw notFound()
    return { rack, locations, categoryTree, allTags }
  },
})