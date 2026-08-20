import { createServerFn } from "@tanstack/react-start"
import type { activityLogs, ActivityAction } from "./schema.server"
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
  /** Units affected — bulk (batch) actions only. */
  quantity?: number | null
}

export type ActivityActor = {
  userId: string
  userName: string
  userEmail: string
  orgId: string
}

export const getItemActivity = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((itemId: string) => itemId)
  .handler(async ({ data: itemId, context }): Promise<ActivityLog[]> => {
    const { fetchItemActivity } = await import("./activity.server")
    return fetchItemActivity(context.orgId, itemId)
  })

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((limit: number | undefined) =>
    Math.max(1, Math.min(100, Math.floor(limit ?? 10)))
  )
  .handler(async ({ data: limit, context }): Promise<ActivityLog[]> => {
    const { fetchRecentActivity } = await import("./activity.server")
    return fetchRecentActivity(context.orgId, limit)
  })

type GetActivityPageArgs = {
  page: number
  pageSize: number
}

export const getActivityPage = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((args: GetActivityPageArgs) => args)
  .handler(async ({ data: args, context }) => {
    const { fetchActivityPage } = await import("./activity.server")
    return fetchActivityPage(context.orgId, args)
  })