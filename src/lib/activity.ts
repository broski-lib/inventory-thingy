import { clerkClient } from "@clerk/tanstack-react-start/server"
import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"
import { getDb } from "./db"
import { activityLogs } from "./schema"
import type { ActivityAction } from "./schema"
import { requireUser } from "./inventory"

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
}

const FALLBACK_ACTOR: ActivityActor = {
  userId: "",
  userName: "Unknown user",
  userEmail: "",
}

export async function resolveActor(userId: string): Promise<ActivityActor> {
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
    return { ...FALLBACK_ACTOR, userId }
  }
}

export async function logActivity(
  actor: ActivityActor,
  input: ActivityLogInput
): Promise<void> {
  if (!actor.userId) return
  const db = getDb()
  await db.insert(activityLogs).values({
    itemId: input.itemId,
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
  .validator((itemId: string) => itemId)
  .handler(async ({ data: itemId }): Promise<ActivityLog[]> => {
    await requireUser()
    const db = getDb()
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.itemId, itemId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(50)
  })

export const getRecentActivity = createServerFn({ method: "GET" })
  .validator((limit: number | undefined) =>
    Math.max(1, Math.min(100, Math.floor(limit ?? 10)))
  )
  .handler(async ({ data: limit }): Promise<ActivityLog[]> => {
    await requireUser()
    const db = getDb()
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
  })
