import { createFileRoute, notFound } from "@tanstack/react-router"
import { getRack } from "@/lib/racks"
import { getLocations } from "@/lib/inventory"

export const Route = createFileRoute("/stock/racks/$id")({
  preload: false,
  loader: async ({ params }) => {
    const [rack, locations] = await Promise.all([
      getRack({ data: params.id }),
      getLocations(),
    ])
    if (!rack) throw notFound()
    return { rack, locations }
  },
})
