import { createFileRoute } from "@tanstack/react-router"
import { loadScan, lookupItem } from "@/lib/scan-queries"
import { getMostCommonLocation } from "@/lib/inventory"

type ScanSearch = {
  code?: string
}

export const Route = createFileRoute("/scan/")({
  validateSearch: (search: Record<string, unknown>): ScanSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  // Scan data is cheap; preloaded data can be reused for a few minutes.
  preloadStaleTime: 300_000,
  loader: async ({ deps }) => {
    const [{ recent }, lookup, defaultLocation] = await Promise.all([
      loadScan(),
      deps.code ? lookupItem({ data: deps.code }) : Promise.resolve(null),
      getMostCommonLocation(),
    ])
    return { recent, lookup, defaultLocation }
  },
})
