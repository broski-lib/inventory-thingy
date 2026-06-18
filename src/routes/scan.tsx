import { createFileRoute, Outlet } from "@tanstack/react-router"
import { requireOrg } from "@/lib/auth-guard"

export const Route = createFileRoute("/scan")({
  beforeLoad: async () => {
    await requireOrg()
  },
  component: ScanLayout,
})

function ScanLayout() {
  return <Outlet />
}
