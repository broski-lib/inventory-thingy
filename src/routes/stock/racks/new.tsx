import { createFileRoute } from "@tanstack/react-router"
import { getLocations } from "@/lib/inventory"
import { getCategoryTree } from "@/lib/categories"
import { listTags } from "@/lib/tags"

export const Route = createFileRoute("/stock/racks/new")({
  preload: false,
  loader: async () => {
    const [locations, categoryTree, allTags] = await Promise.all([
      getLocations(),
      getCategoryTree(),
      listTags(),
    ])
    return { locations, categoryTree, allTags }
  },
})
