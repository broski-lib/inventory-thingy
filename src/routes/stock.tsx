import { createFileRoute, Outlet } from "@tanstack/react-router"
import { requireOrg } from "@/lib/auth-guard"

export const Route = createFileRoute("/stock")({
  beforeLoad: async (ctx) => {
    // Preload only fetches the route shell — skip the auth round trip
    // until the user actually navigates.
    if (ctx.preload) return
    await requireOrg()
  },
  component: StockLayout,
})

function StockLayout() {
  return <Outlet />
}
