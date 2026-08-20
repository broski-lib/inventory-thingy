import { createFileRoute } from "@tanstack/react-router"
import { getLocations } from "@/lib/inventory"
import { getCategoryTree } from "@/lib/categories"
import { listTags } from "@/lib/tags"

type NewItemSearch = {
  qr?: string
}

export const Route = createFileRoute("/stock/new")({
  validateSearch: (search: Record<string, unknown>): NewItemSearch => ({
    qr: typeof search.qr === "string" ? search.qr : undefined,
  }),
  loader: async () => {
    const [allTags, locations, categoryTree] = await Promise.all([
      listTags(),
      getLocations(),
      getCategoryTree(),
    ])
    return { allTags, locations, categoryTree }
  },
})
