import { createFileRoute } from "@tanstack/react-router"
import { loadScan } from "@/lib/scan-queries"
import { getLocations } from "@/lib/inventory"

export const Route = createFileRoute("/scan/bulk")({
  loader: async () => {
    const [scan, locations] = await Promise.all([loadScan(), getLocations()])
    return { recent: scan.recent, locations }
  },
})