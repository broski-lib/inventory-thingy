import { clerkClient } from "@clerk/tanstack-react-start/server"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq, and, sql } from "drizzle-orm"
import { getDb } from "./db"
import { activityLogs } from "./schema"
import type { ActivityAction } from "./schema"
import { authRequiredMiddleware } from "./auth-middleware"

export type ActivityLog = typeof activityLogs.$inferSelect

export type ActivityLogInput = {
  itemId: string | null
  itemName: string
  itemQrCode: string
  action: ActivityAction
  fromLocation?: string | null
  toLocation?: string | null
  fromCondition?: ActivityLog["fromCondition"]
  toCondition?: ActivityLog["toCondition"]
}

export type ActivityActor = {
  userId: string
  userName: string
  userEmail: string
  orgId: string
}

const FALLBACK_ACTOR: Omit<ActivityActor, "orgId"> = {
  userId: "",
  userName: "Unknown user",
  userEmail: "",
}

export async function resolveActor(
  userId: string
): Promise<Omit<ActivityActor, "orgId">> {
  if (!userId) return FALLBACK_ACTOR
  try {
    const user = await clerkClient().users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress ?? ""
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      user.firstName ||
      email.split("@")[0] ||
      "Unknown user"
    return { userId, userName: name, userEmail: email }
  } catch (err) {
    console.error("Failed to resolve actor from Clerk:", err)
    return { userId, userName: "Unknown user", userEmail: "" }
  }
}

export async function logActivity(
  actor: ActivityActor,
  input: ActivityLogInput
): Promise<void> {
  if (!actor.userId || !actor.orgId) return
  const db = getDb()
  await db.insert(activityLogs).values({
    itemId: input.itemId,
    orgId: actor.orgId,
    userId: actor.userId,
    userName: actor.userName,
    userEmail: actor.userEmail,
    action: input.action,
    itemName: input.itemName,
    itemQrCode: input.itemQrCode,
    fromLocation: input.fromLocation ?? null,
    toLocation: input.toLocation ?? null,
    fromCondition: input.fromCondition ?? null,
    toCondition: input.toCondition ?? null,
  })
}

export const getItemActivity = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((itemId: string) => itemId)
  .handler(async ({ data: itemId, context }): Promise<ActivityLog[]> => {
    const { orgId } = context
    const db = getDb()
    return await db
      .select()
      .from(activityLogs)
      .where(
        and(eq(activityLogs.orgId, orgId), eq(activityLogs.itemId, itemId))
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(50)
  })

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((limit: number | undefined) =>
    Math.max(1, Math.min(100, Math.floor(limit ?? 10)))
  )
  .handler(async ({ data: limit, context }): Promise<ActivityLog[]> => {
    const { orgId } = context
    const db = getDb()
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.orgId, orgId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
  })

type GetActivityPageArgs = {
  page: number
  pageSize: number
}

export const getActivityPage = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((args: GetActivityPageArgs) => args)
  .handler(async ({ data: args, context }) => {
    const { orgId } = context
    const db = getDb()
    const page = Math.max(1, Math.floor(args.page))
    const pageSize = Math.max(1, Math.min(100, Math.floor(args.pageSize)))
    const offset = (page - 1) * pageSize

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.orgId, orgId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityLogs)
        .where(eq(activityLogs.orgId, orgId)),
    ])

    const total = totalResult[0]?.count ?? 0
    return {
      logs: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  })
