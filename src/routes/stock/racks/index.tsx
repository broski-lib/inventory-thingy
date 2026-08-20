import { createFileRoute } from "@tanstack/react-router"
import { listRacks } from "@/lib/racks"

export const Route = createFileRoute("/stock/racks/")({
  preload: false,
  loader: async () => listRacks(),
})
