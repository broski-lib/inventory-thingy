import { createFileRoute, notFound } from "@tanstack/react-router"
import { getItemWithHistory } from "@/lib/inventory"

export const Route = createFileRoute("/stock/$id/history")({
  preload: false,
  loader: async ({ params }) => {
    const result = await getItemWithHistory({ data: params.id })
    if (!result) throw notFound()
    return result
  },
})
