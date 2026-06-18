import { createFileRoute, Outlet } from "@tanstack/react-router"
import { requireOrg } from "@/lib/auth-guard"

export const Route = createFileRoute("/stock")({
  beforeLoad: async () => {
    await requireOrg()
  },
  component: StockLayout,
})

function StockLayout() {
  return <Outlet />
}
