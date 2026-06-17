import { createServerFn } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import { auth } from "@clerk/tanstack-react-start/server"

export const requireAuth = createServerFn({ method: "GET" }).handler(
  async () => {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/" })
    }
    return { userId }
  }
)

export const requireOrg = createServerFn({ method: "GET" }).handler(
  async () => {
    const { isAuthenticated, userId, orgId } = await auth()
    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/" })
    }
    if (!orgId) {
      throw redirect({ to: "/onboarding" })
    }
    return { userId, orgId }
  }
)
