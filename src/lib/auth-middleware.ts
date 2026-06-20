import { createMiddleware } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import { auth } from "@clerk/tanstack-react-start/server"

export type AuthContext = {
  userId: string
  orgId: string
}

export type AuthOnlyContext = {
  userId: string
}

/**
 * Function middleware for server fns that require an authenticated user
 * with an active organization. Resolves `auth()` once per request,
 * redirects unauthenticated callers to `/login` and org-less users to
 * `/onboarding`, and exposes `{ userId, orgId }` on the handler context.
 */
export const authRequiredMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const { isAuthenticated, userId, orgId } = await auth()
  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/login/$" })
  }
  if (!orgId) {
    throw redirect({ to: "/onboarding" })
  }
  return next({
    context: { userId, orgId } satisfies AuthContext,
  })
})

/**
 * Function middleware for server fns that require an authenticated user
 * but do not yet have an organization (e.g. onboarding). Exposes
 * `{ userId }` on the handler context.
 */
export const authOnlyMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/login/$" })
    }
    return next({
      context: { userId } satisfies AuthOnlyContext,
    })
  }
)
