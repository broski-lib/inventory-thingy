import { createMiddleware } from "@tanstack/react-start"
import { redirect } from "@tanstack/react-router"
import { auth } from "@clerk/tanstack-react-start/server"

/** Clerk `auth().has` — role/permission check for the active org. */
export type HasFn = Awaited<ReturnType<typeof auth>>["has"]

export type AuthContext = {
  userId: string
  orgId: string
  orgRole: string | undefined
  has: HasFn
}

/**
 * Role slugs selectable for item-level update restriction. The matching
 * roles must exist in the Clerk dashboard. Keep this in sync with the
 * instance's configured roles.
 */
export const RESTRICTABLE_ROLES = ["org:admin"] as const
export type RestrictableRole = (typeof RESTRICTABLE_ROLES)[number]

/** True when the user may update/delete an item with the given requiredRole. */
export function canEditItem(
  has: HasFn,
  requiredRole: string | null | undefined
): boolean {
  if (!requiredRole) return true
  return has({ role: requiredRole })
}

/** Throws when the user may not update/delete the item. */
export function assertCanEditItem(
  has: HasFn,
  requiredRole: string | null | undefined
): void {
  if (!canEditItem(has, requiredRole)) {
    throw new Error(`This item can only be updated by ${requiredRole}`)
  }
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
  const { isAuthenticated, userId, orgId, orgRole, has } = await auth()
  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/login/$" })
  }
  if (!orgId) {
    throw redirect({ to: "/onboarding" })
  }
  return next({
    context: { userId, orgId, orgRole, has } satisfies AuthContext,
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

/**
 * Request middleware for routes that should bounce already-authenticated
 * users past the sign-in form. Authed users with an org go to `/home`;
 * authed users without one are sent to `/onboarding` to pick a workspace.
 * Signed-out users pass through normally.
 */
export const redirectIfAuthed = createMiddleware({
  type: "request",
}).server(async ({ next }) => {
  const { isAuthenticated, orgId } = await auth()
  if (!isAuthenticated) return next()
  throw redirect({ to: orgId ? "/home" : "/onboarding" })
})

/**
 * Request middleware for `/onboarding`. Requires an authed user; if
 * they already have an org, send them straight to `/home`. Used at
 * the request level so the whole route stays a plain UI component.
 */
export const requireAuthedNoOrg = createMiddleware({
  type: "request",
}).server(async ({ next }) => {
  const { isAuthenticated, userId, orgId } = await auth()
  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/login/$" })
  }
  if (orgId) {
    throw redirect({ to: "/home" })
  }
  return next()
})
