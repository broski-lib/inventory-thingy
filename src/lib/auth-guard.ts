import { createServerFn } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import { auth } from "@clerk/tanstack-react-start/server"

/**
 * Route guard used in `beforeLoad` of protected routes. Runs as a
 * server function so the Clerk `auth` import stays server-side.
 * Throws a redirect to `/login` for unauthenticated users and to
 * `/onboarding` for org-less users. Returns the auth context on success.
 */
export const requireOrg = createServerFn({ method: "GET" }).handler(
  async () => {
    const { isAuthenticated, userId, orgId } = await auth()
    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/login/$" })
    }
    if (!orgId) {
      throw redirect({ to: "/onboarding" })
    }
    return { userId, orgId }
  }
)
