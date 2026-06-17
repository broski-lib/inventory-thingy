import { createServerFn } from "@tanstack/react-start"
import { and, eq, ilike, or, desc, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { getDb } from "./db"
import { items } from "./schema"
import { generateUlid } from "./ids"
import { logActivity, resolveActor } from "./activity"
import type { ActivityActor } from "./activity"
import {
  buildImageUrl,
  deleteItemImage,
  ImageUploadError,
  putItemImage,
} from "./storage"
import { authRequiredMiddleware } from "./auth-middleware"

export type CreateItemInput = Omit<
  typeof items.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "orgId" | "imageUrl"
> & {
  imageKey?: string | null
}

export type UpdateItemInput = {
  id: string
  item: Partial<
    Omit<typeof items.$inferInsert, "id" | "orgId" | "imageUrl" | "imageKey">
  > & {
    imageKey?: string | null
  }
}

export const STOCK_STATUS_FILTERS = [
  "All",
  "Available",
  "Staged",
  "Repair",
] as const
export type StockStatusFilter = (typeof STOCK_STATUS_FILTERS)[number]

export type ItemsPage = {
  items: (typeof items.$inferSelect)[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type GetItemsPageArgs = {
  page: number
  pageSize: number
  search?: string
  statusFilter?: StockStatusFilter
}

function buildItemsWhere(
  orgId: string,
  search: string | undefined,
  statusFilter: StockStatusFilter | undefined
): SQL | undefined {
  const conditions: SQL[] = [eq(items.orgId, orgId)]
  if (search && search.trim() !== "") {
    const s = `%${search.trim()}%`
    // Cast enum column to text so ilike works on it.
    conditions.push(
      or(
        ilike(items.name, s),
        ilike(items.qrCode, s),
        ilike(items.location, s),
        sql`${items.status}::text ILIKE ${s}`,
        ilike(items.description, s)
      )!
    )
  }
  if (statusFilter && statusFilter !== "All") {
    if (statusFilter === "Available") {
      conditions.push(
        or(eq(items.status, "Available"), eq(items.status, "In Storage"))!
      )
    } else if (statusFilter === "Staged") {
      conditions.push(
        or(eq(items.status, "Staged"), eq(items.status, "Reserved"))!
      )
    } else {
      conditions.push(eq(items.status, statusFilter))
    }
  }
  return conditions.length > 0 ? and(...conditions) : undefined
}

export const getItemsPage = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((args: GetItemsPageArgs) => args)
  .handler(async ({ data: args, context }): Promise<ItemsPage> => {
    const { orgId } = context
    const db = getDb()
    const page = Math.max(1, Math.floor(args.page))
    const pageSize = Math.max(1, Math.min(100, Math.floor(args.pageSize)))
    const where = buildItemsWhere(orgId, args.search, args.statusFilter)
    const offset = (page - 1) * pageSize

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(items)
        .where(where)
        .orderBy(desc(items.updatedAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(items)
        .where(where),
    ])

    const total = totalResult[0]?.count ?? 0
    return {
      items: rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  })

export const getStats = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }) => {
    const { orgId } = context
    const db = getDb()

    const statusCounts = await db
      .select({
        status: items.status,
        count: sql<number>`count(*)::int`,
      })
      .from(items)
      .where(eq(items.orgId, orgId))
      .groupBy(items.status)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const movesTodayResult = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(items)
      .where(and(eq(items.orgId, orgId), sql`${items.updatedAt} >= ${today}`))

    return {
      statusCounts,
      movesToday: movesTodayResult[0]?.count || 0,
    }
  })

function statusAction(
  toStatus: typeof items.$inferSelect.status
): "checked_out" | "checked_in" | "reported_damaged" | "updated" {
  if (toStatus === "Reserved" || toStatus === "Staged") return "checked_out"
  if (toStatus === "In Storage" || toStatus === "Available") return "checked_in"
  if (toStatus === "Repair") return "reported_damaged"
  return "updated"
}

async function logItemDiff(
  actor: ActivityActor,
  current: typeof items.$inferSelect,
  updated: typeof items.$inferSelect,
  patch: Partial<typeof items.$inferInsert>
): Promise<void> {
  const statusChanged =
    patch.status !== undefined && patch.status !== current.status
  const locationChanged =
    patch.location !== undefined && patch.location !== current.location
  const conditionChanged =
    patch.condition !== undefined && patch.condition !== current.condition

  if (statusChanged) {
    await logActivity(actor, {
      itemId: updated.id,
      itemName: updated.name,
      itemQrCode: updated.qrCode,
      action: statusAction(updated.status),
      fromLocation: current.location,
      toLocation: updated.location,
      fromCondition: current.condition,
      toCondition: updated.condition,
    })
    return
  }

  if (locationChanged) {
    await logActivity(actor, {
      itemId: updated.id,
      itemName: updated.name,
      itemQrCode: updated.qrCode,
      action: "moved",
      fromLocation: current.location,
      toLocation: updated.location,
      fromCondition: current.condition,
      toCondition: updated.condition,
    })
    return
  }

  if (conditionChanged) {
    await logActivity(actor, {
      itemId: updated.id,
      itemName: updated.name,
      itemQrCode: updated.qrCode,
      action: "condition_changed",
      fromLocation: current.location,
      toLocation: updated.location,
      fromCondition: current.condition,
      toCondition: updated.condition,
    })
    return
  }

  // Other field changes (name, description, image, qrCode) — log as a
  // generic update so the change is still visible in the activity feed.
  await logActivity(actor, {
    itemId: updated.id,
    itemName: updated.name,
    itemQrCode: updated.qrCode,
    action: "updated",
    fromLocation: current.location,
    toLocation: updated.location,
    fromCondition: current.condition,
    toCondition: updated.condition,
  })
}

export const getItemByQrCode = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((qrCode: string) => qrCode)
  .handler(
    async ({
      data: qrCode,
      context,
    }): Promise<typeof items.$inferSelect | null> => {
      const { orgId } = context
      const db = getDb()
      const result = await db
        .select()
        .from(items)
        .where(and(eq(items.orgId, orgId), eq(items.qrCode, qrCode)))
        .limit(1)
      return result[0] ?? null
    }
  )

export const createItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((item: CreateItemInput) => item)
  .handler(async ({ data: item, context }) => {
    const { userId, orgId } = context
    const db = getDb()
    const id = generateUlid()

    const imageKey = item.imageKey ?? null
    const imageUrl = imageKey ? buildImageUrl(imageKey) : ""

    const [inserted] = await db
      .insert(items)
      .values({
        id,
        orgId,
        qrCode: item.qrCode,
        name: item.name,
        description: item.description,
        condition: item.condition,
        location: item.location,
        status: item.status,
        imageUrl,
        imageKey,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    const actor = { ...(await resolveActor(userId)), orgId }
    await logActivity(actor, {
      itemId: inserted.id,
      itemName: inserted.name,
      itemQrCode: inserted.qrCode,
      action: "created",
      toLocation: inserted.location,
      toCondition: inserted.condition,
    })

    return inserted
  })

export const updateItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((data: UpdateItemInput) => data)
  .handler(async ({ data: { id, item }, context }) => {
    const { userId, orgId } = context
    const db = getDb()

    const currentRows = await db
      .select()
      .from(items)
      .where(and(eq(items.orgId, orgId), eq(items.id, id)))
      .limit(1)
    if (currentRows.length === 0) throw new Error("Item not found")
    const current = currentRows[0]

    const patch: Partial<typeof items.$inferInsert> = {
      qrCode: item.qrCode,
      name: item.name,
      description: item.description,
      condition: item.condition,
      location: item.location,
      status: item.status,
    }
    for (const [k, v] of Object.entries(item)) {
      if (k === "imageKey") continue
      if (k === "imageUrl") continue
      if (k === "orgId" || k === "id" || k === "createdBy") continue
      ;(patch as Record<string, unknown>)[k] = v
    }
    let nextImageKey = current.imageKey
    let nextImageUrl = current.imageUrl
    let oldKeyToDelete: string | null = null
    if (item.imageKey !== undefined) {
      if (item.imageKey === null) {
        nextImageKey = null
        nextImageUrl = ""
        if (current.imageKey) oldKeyToDelete = current.imageKey
      } else if (item.imageKey !== current.imageKey) {
        nextImageKey = item.imageKey
        nextImageUrl = buildImageUrl(item.imageKey)
        if (current.imageKey) oldKeyToDelete = current.imageKey
      }
    }

    const updateData: Partial<typeof items.$inferInsert> = {
      ...patch,
      imageKey: nextImageKey,
      imageUrl: nextImageUrl,
      updatedAt: new Date(),
    }
    delete (updateData as { orgId?: unknown }).orgId

    if (item.status) {
      if (item.status !== "In Storage" && item.status !== "Available") {
        updateData.takenOutAt = new Date()
      } else {
        updateData.takenOutAt = null
      }
    }

    const [updated] = await db
      .update(items)
      .set(updateData)
      .where(and(eq(items.orgId, orgId), eq(items.id, id)))
      .returning()

    if (oldKeyToDelete) {
      await deleteItemImage(orgId, oldKeyToDelete)
    }

    const actor = { ...(await resolveActor(userId)), orgId }
    await logItemDiff(actor, current, updated, item)

    return updated
  })

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    const { userId, orgId } = context
    const db = getDb()
    const [deleted] = await db
      .delete(items)
      .where(and(eq(items.orgId, orgId), eq(items.id, id)))
      .returning()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!deleted) throw new Error("Item not found")

    if (deleted.imageKey) {
      await deleteItemImage(orgId, deleted.imageKey)
    }

    const actor = { ...(await resolveActor(userId)), orgId }
    await logActivity(actor, {
      itemId: deleted.id,
      itemName: deleted.name,
      itemQrCode: deleted.qrCode,
      action: "deleted",
      fromLocation: deleted.location,
      fromCondition: deleted.condition,
    })

    return deleted
  })

export const uploadItemImage = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((form: FormData) => form)
  .handler(async ({ data: form, context }) => {
    const { orgId } = context
    const file = form.get("file")
    if (!(file instanceof File)) {
      throw new ImageUploadError("Missing 'file' part in form data.", 400)
    }
    const buf = await file.arrayBuffer()
    const tempId = `upload-${crypto.randomUUID()}`
    const uploaded = await putItemImage(
      orgId,
      tempId,
      buf,
      file.type || "application/octet-stream"
    )
    return {
      imageKey: uploaded.key,
      contentType: uploaded.contentType,
      size: uploaded.size,
    }
  })
