import { clerkClient } from "@clerk/tanstack-react-start/server"
import { desc, eq, and, sql } from "drizzle-orm"
import { getDb } from "./db.server"
import { activityLogs } from "./schema.server"
import type { ActivityLog, ActivityLogInput, ActivityActor } from "./activity"

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
  } catch {
    // Clerk lookup can fail (deleted user, downstream outage). The
    // activity log is best-effort — we still want to record the
    // event under the original userId rather than swallow it.
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
    quantity: input.quantity ?? null,
  })
}

export async function fetchItemActivity(
  orgId: string,
  itemId: string
): Promise<ActivityLog[]> {
  const db = getDb()
  return await db
    .select()
    .from(activityLogs)
    .where(and(eq(activityLogs.orgId, orgId), eq(activityLogs.itemId, itemId)))
    .orderBy(desc(activityLogs.createdAt))
    .limit(50)
}

export async function fetchRecentActivity(
  orgId: string,
  limit: number
): Promise<ActivityLog[]> {
  const db = getDb()
  return await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.orgId, orgId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
}

export async function fetchActivityPage(
  orgId: string,
  args: { page: number; pageSize: number }
): Promise<{
  logs: ActivityLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
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
}
