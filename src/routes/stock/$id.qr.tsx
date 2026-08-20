import { createFileRoute, notFound } from "@tanstack/react-router"
import { getItemById } from "@/lib/inventory"

export const Route = createFileRoute("/stock/$id/qr")({
  preload: false,
  loader: async ({ params }) => {
    const item = await getItemById({ data: params.id })
    if (!item) throw notFound()
    return { item }
  },
})
