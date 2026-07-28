import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq, ilike, inArray, ne, or, desc, sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { getDb } from "./db"
import { items, activityLogs, itemBatches, itemTags, tags } from "./schema"
import type { ItemCondition, ItemStatus } from "./schema"
import { generateUlid } from "./ids"
import { logActivity, resolveActor } from "./activity"
import type { ActivityActor, ActivityLog } from "./activity"
import {
  buildImageUrl,
  deleteItemImage,
  ImageUploadError,
  putItemImage,
} from "./storage"
import {
  assertCanEditItem,
  authRequiredMiddleware,
  canEditItem,
  RESTRICTABLE_ROLES,
} from "./auth-middleware"
import type { HasFn } from "./auth-middleware"
import { getTagsForItems } from "./tags"
import type { Tag } from "./tags"
import { getBatchesForItems } from "./batches"
import type { ItemBatch } from "./batches"

/** Shape of a row in the `items` table. */
export type InventoryItem = typeof items.$inferSelect

/** Item row plus its resolved tags + batches (bulk items). */
export type InventoryItemWithTags = InventoryItem & {
  tags: Tag[]
  batches: ItemBatch[]
}

export type CreateItemInput = Omit<
  typeof items.$inferInsert,
  "id" | "createdAt" | "updatedAt" | "orgId" | "imageUrl"
> & {
  imageKey?: string | null
  /** Bulk items only: starting quantity for the initial batch. */
  quantity?: number
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
  "Pending Tag",
] as const
export type StockStatusFilter = (typeof STOCK_STATUS_FILTERS)[number]

export const STOCK_SORTS = [
  { id: "updated_desc", label: "Recently updated" },
  { id: "updated_asc", label: "Least recently updated" },
  { id: "created_desc", label: "Newest first" },
  { id: "created_asc", label: "Oldest first" },
  { id: "name_asc", label: "Name A–Z" },
  { id: "name_desc", label: "Name Z–A" },
  { id: "location_asc", label: "Location A–Z" },
  { id: "location_desc", label: "Location Z–A" },
] as const
export type StockSort = (typeof STOCK_SORTS)[number]["id"]
export const DEFAULT_STOCK_SORT: StockSort = "updated_desc"

export type ItemsPage = {
  items: InventoryItemWithTags[]
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
  statuses?: ItemStatus[]
  conditions?: ItemCondition[]
  locations?: string[]
  tagIds?: string[]
  sort?: StockSort
}

function statusGroupList(filter: StockStatusFilter): ItemStatus[] {
  if (filter === "Available") return ["Available", "In Storage"]
  if (filter === "Staged") return ["Staged", "Reserved"]
  if (filter === "All") return []
  if (filter === "Pending Tag") return ["Pending Tag"]
  return [filter]
}

/**
 * Kind-aware state filter: unit items match on their own columns, bulk
 * items match when ANY of their batches matches. `col` picks the batch
 * column to compare against `values`.
 */
function stateFilter(
  orgId: string,
  db: ReturnType<typeof getDb>,
  col: "status" | "condition" | "location",
  unitCondition: SQL,
  values: string[]
): SQL {
  const batchMatch = db
    .select({ itemId: itemBatches.itemId })
    .from(itemBatches)
    .where(
      and(
        eq(itemBatches.orgId, orgId),
        inArray(itemBatches[col], values)
      )
    )
  return or(
    and(ne(items.kind, "bulk"), unitCondition),
    inArray(items.id, batchMatch)
  )!
}

function buildItemsWhere(
  orgId: string,
  args: GetItemsPageArgs,
  db: ReturnType<typeof getDb>
): SQL {
  const conditions: SQL[] = [eq(items.orgId, orgId)]

  const search = args.search?.trim()
  if (search) {
    const s = `%${search}%`
    // Items carrying a tag whose name matches the search text.
    const tagMatch = db
      .select({ itemId: itemTags.itemId })
      .from(itemTags)
      .innerJoin(
        tags,
        and(eq(itemTags.tagId, tags.id), eq(tags.orgId, orgId))
      )
      .where(and(eq(itemTags.orgId, orgId), ilike(tags.name, s)))
    // Bulk items with a batch in a matching location.
    const batchLocationMatch = db
      .select({ itemId: itemBatches.itemId })
      .from(itemBatches)
      .where(and(eq(itemBatches.orgId, orgId), ilike(itemBatches.location, s)))
    // Cast enum column to text so ilike works on it.
    conditions.push(
      or(
        ilike(items.name, s),
        ilike(items.qrCode, s),
        ilike(items.location, s),
        sql`${items.status}::text ILIKE ${s}`,
        ilike(items.description, s),
        inArray(items.id, tagMatch),
        inArray(items.id, batchLocationMatch)
      )!
    )
  }

  if (args.statusFilter && args.statusFilter !== "All") {
    const list = statusGroupList(args.statusFilter)
    conditions.push(
      stateFilter(
        orgId,
        db,
        "status",
        inArray(items.status, list),
        list
      )
    )
  }
  if (args.statuses && args.statuses.length > 0) {
    conditions.push(
      stateFilter(
        orgId,
        db,
        "status",
        inArray(items.status, args.statuses),
        args.statuses
      )
    )
  }
  if (args.conditions && args.conditions.length > 0) {
    conditions.push(
      stateFilter(
        orgId,
        db,
        "condition",
        inArray(items.condition, args.conditions),
        args.conditions
      )
    )
  }
  if (args.locations && args.locations.length > 0) {
    conditions.push(
      stateFilter(
        orgId,
        db,
        "location",
        inArray(items.location, args.locations),
        args.locations
      )
    )
  }
  if (args.tagIds && args.tagIds.length > 0) {
    // Match items carrying ANY of the selected tags.
    const tagFilter = db
      .select({ itemId: itemTags.itemId })
      .from(itemTags)
      .where(
        and(eq(itemTags.orgId, orgId), inArray(itemTags.tagId, args.tagIds))
      )
    conditions.push(inArray(items.id, tagFilter))
  }
  return and(...conditions)!
}

function buildItemsOrderBy(sort: StockSort | undefined) {
  switch (sort) {
    case "updated_asc":
      return [asc(items.updatedAt)]
    case "created_desc":
      return [desc(items.createdAt)]
    case "created_asc":
      return [asc(items.createdAt)]
    case "name_asc":
      return [asc(items.name)]
    case "name_desc":
      return [desc(items.name)]
    case "location_asc":
      return [asc(items.location), asc(items.name)]
    case "location_desc":
      return [desc(items.location), asc(items.name)]
    case "updated_desc":
    default:
      return [desc(items.updatedAt)]
  }
}

export const getItemsPage = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((args: GetItemsPageArgs) => args)
  .handler(async ({ data: args, context }): Promise<ItemsPage> => {
    const { orgId } = context
    const db = getDb()
    const page = Math.max(1, Math.floor(args.page))
    const pageSize = Math.max(1, Math.min(100, Math.floor(args.pageSize)))
    const where = buildItemsWhere(orgId, args, db)
    const offset = (page - 1) * pageSize

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(items)
        .where(where)
        .orderBy(...buildItemsOrderBy(args.sort))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(items)
        .where(where),
    ])

    const ids = rows.map((r) => r.id)
    const [tagsByItem, batchesByItem] = await Promise.all([
      getTagsForItems(orgId, ids),
      getBatchesForItems(
        orgId,
        rows.filter((r) => r.kind === "bulk").map((r) => r.id)
      ),
    ])
    const total = totalResult[0]?.count ?? 0
    return {
      items: rows.map((row) => ({
        ...row,
        tags: tagsByItem.get(row.id) ?? [],
        batches: batchesByItem.get(row.id) ?? [],
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  })

/**
 * Distinct location values for the org, for the stock filter UI.
 * Union of unit-item locations and bulk-batch locations.
 */
export const getLocations = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }): Promise<string[]> => {
    const { orgId } = context
    const db = getDb()
    const [itemRows, batchRows] = await Promise.all([
      db
        .selectDistinct({ location: items.location })
        .from(items)
        .where(and(eq(items.orgId, orgId), ne(items.kind, "bulk"))),
      db
        .selectDistinct({ location: itemBatches.location })
        .from(itemBatches)
        .where(eq(itemBatches.orgId, orgId)),
    ])
    const set = new Set<string>()
    for (const r of itemRows) set.add(r.location)
    for (const r of batchRows) set.add(r.location)
    return [...set].sort((a, b) => a.localeCompare(b))
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
  if (toStatus === "Pending Tag") return "updated"
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

/** Validate a requiredRole change. Only org admins may restrict items. */
function assertValidRequiredRole(
  has: HasFn,
  requiredRole: string | null | undefined
): void {
  if (requiredRole === undefined || requiredRole === null) return
  if (!has({ role: "org:admin" })) {
    throw new Error("Only org admins can restrict items")
  }
  if (!(RESTRICTABLE_ROLES as readonly string[]).includes(requiredRole)) {
    throw new Error(`Unknown role: ${requiredRole}`)
  }
}

export const createItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((item: CreateItemInput) => item)
  .handler(async ({ data: item, context }) => {
    const { userId, orgId, has } = context
    const db = getDb()
    const id = generateUlid()

    assertValidRequiredRole(has, item.requiredRole)

    const kind = item.kind ?? "unit"
    const quantity =
      kind === "bulk" ? Math.max(1, Math.floor(item.quantity ?? 1)) : null

    const imageKey = item.imageKey ?? null
    const imageUrl = imageKey ? buildImageUrl(imageKey) : ""

    const [inserted] = await db
      .insert(items)
      .values({
        id,
        orgId,
        kind,
        qrCode: item.qrCode,
        name: item.name,
        description: item.description,
        condition: item.condition,
        location: item.location,
        status: item.status,
        imageUrl,
        imageKey,
        printSize: item.printSize ?? "medium",
        requiredRole: item.requiredRole ?? null,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Bulk items get their starting stock as the initial batch.
    if (kind === "bulk" && quantity !== null) {
      await db.insert(itemBatches).values({
        id: generateUlid(),
        orgId,
        itemId: id,
        qty: quantity,
        location: inserted.location,
        status: inserted.status,
        condition: inserted.condition,
      })
    }

    const actor = { ...(await resolveActor(userId)), orgId }
    await logActivity(actor, {
      itemId: inserted.id,
      itemName: inserted.name,
      itemQrCode: inserted.qrCode,
      action: "created",
      toLocation: inserted.location,
      toCondition: inserted.condition,
      quantity,
    })

    return inserted
  })

export const updateItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((data: UpdateItemInput) => data)
  .handler(async ({ data: { id, item }, context }) => {
    const { userId, orgId, has } = context
    const db = getDb()

    const currentRows = await db
      .select()
      .from(items)
      .where(and(eq(items.orgId, orgId), eq(items.id, id)))
      .limit(1)
    if (currentRows.length === 0) throw new Error("Item not found")
    const current = currentRows[0]
    // Drizzle types `limit(1)` as `T[]` not `[T]`, so we need a single
    // narrowing above. `current` is always defined here.

    assertCanEditItem(has, current.requiredRole)
    assertValidRequiredRole(has, item.requiredRole)

    const patch: Partial<typeof items.$inferInsert> = {
      qrCode: item.qrCode,
      name: item.name,
      description: item.description,
      condition: item.condition,
      location: item.location,
      status: item.status,
    }
    if (item.requiredRole !== undefined) {
      patch.requiredRole = item.requiredRole
    }
    for (const [k, v] of Object.entries(item)) {
      if (k === "imageKey") continue
      if (k === "imageUrl") continue
      if (k === "requiredRole") continue
      // `quantity` is form-only (initial batch on create) — not a column.
      if (k === "quantity") continue
      if (k === "orgId" || k === "id" || k === "createdBy") continue
      ;(patch as Record<string, unknown>)[k] = v
    }
    // Bulk items: location/status/condition live on batches, not the item
    // row. Strip them so the mirror columns never drift.
    if (current.kind === "bulk") {
      delete patch.location
      delete patch.status
      delete patch.condition
      delete patch.takenOutAt
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
    const { userId, orgId, has } = context
    const db = getDb()

    const currentRows = await db
      .select({ requiredRole: items.requiredRole })
      .from(items)
      .where(and(eq(items.orgId, orgId), eq(items.id, id)))
      .limit(1)
    if (currentRows.length === 0) throw new Error("Item not found")
    assertCanEditItem(has, currentRows[0].requiredRole)

    const [deleted] = await db
      .delete(items)
      .where(and(eq(items.orgId, orgId), eq(items.id, id)))
      .returning()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!deleted) throw new Error("Item not found")

    // Clean up join rows — no FKs, so they don't cascade on their own.
    await db
      .delete(itemBatches)
      .where(and(eq(itemBatches.orgId, orgId), eq(itemBatches.itemId, id)))
    await db
      .delete(itemTags)
      .where(and(eq(itemTags.orgId, orgId), eq(itemTags.itemId, id)))

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

/**
 * Fetch a single item by id (org-scoped). Returns null if not found.
 * Returns the full row — callers that only need a subset should project on
 * the client.
 */
export const getItemById = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(
    async ({
      data: id,
      context,
    }): Promise<InventoryItemWithTags | undefined> => {
      const { orgId } = context
      const db = getDb()
      const [row] = await db
        .select()
        .from(items)
        .where(and(eq(items.orgId, orgId), eq(items.id, id)))
        .limit(1)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!row) return undefined
      const [tagsByItem, batchesByItem] = await Promise.all([
        getTagsForItems(orgId, [id]),
        getBatchesForItems(orgId, row.kind === "bulk" ? [id] : []),
      ])
      return {
        ...row,
        tags: tagsByItem.get(id) ?? [],
        batches: batchesByItem.get(id) ?? [],
      }
    }
  )

export const getItemsByIds = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((ids: string[]) => ids)
  .handler(
    async ({
      data: ids,
      context,
    }): Promise<InventoryItem[]> => {
      const { orgId } = context
      const db = getDb()
      return db
        .select()
        .from(items)
        .where(and(eq(items.orgId, orgId), inArray(items.id, ids)))
    }
  )

/**
 * Fetch a single item + its full activity log in one round-trip.
 * Both queries run in parallel inside the handler. Returns null if
 * the item is not found in the org (callers should use `notFound()`
 * to surface a 404).
 */
export const getItemWithHistory = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(
    async ({
      data: id,
      context,
    }): Promise<{
      item: typeof items.$inferSelect
      logs: ActivityLog[]
    } | null> => {
      const { orgId } = context
      const db = getDb()
      const [itemRows, logs] = await Promise.all([
        db
          .select()
          .from(items)
          .where(and(eq(items.orgId, orgId), eq(items.id, id)))
          .limit(1),
        db
          .select()
          .from(activityLogs)
          .where(
            and(eq(activityLogs.orgId, orgId), eq(activityLogs.itemId, id))
          )
          .orderBy(desc(activityLogs.createdAt))
          .limit(50),
      ])
      if (itemRows.length === 0) return null
      return { item: itemRows[0], logs }
    }
  )

/**
 * Bulk-delete items by id. Org-scoped: any id that doesn't belong to
 * the caller's org is silently ignored. Cleans up R2 images and
 * logs a "deleted" activity per item.
 */
export const bulkDeleteItems = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((ids: string[]) => ids)
  .handler(
    async ({
      data: ids,
      context,
    }): Promise<{ deleted: number; skipped: number }> => {
      const { userId, orgId, has } = context
      if (ids.length === 0) return { deleted: 0, skipped: 0 }
      const db = getDb()

      // Fetch first so we can clean up R2 images + log per item.
      const found = await db
        .select()
        .from(items)
        .where(and(eq(items.orgId, orgId), inArray(items.id, ids)))

      // Items the caller's role can't touch are skipped, not deleted.
      const toDelete = found.filter((row) =>
        canEditItem(has, row.requiredRole)
      )
      const skipped = found.length - toDelete.length
      if (toDelete.length === 0) return { deleted: 0, skipped }
      const allowedIds = toDelete.map((row) => row.id)

      await db
        .delete(items)
        .where(and(eq(items.orgId, orgId), inArray(items.id, allowedIds)))

      // Clean up join rows — no FKs, so they don't cascade on their own.
      await db
        .delete(itemBatches)
        .where(
          and(
            eq(itemBatches.orgId, orgId),
            inArray(itemBatches.itemId, allowedIds)
          )
        )
      await db
        .delete(itemTags)
        .where(
          and(eq(itemTags.orgId, orgId), inArray(itemTags.itemId, allowedIds))
        )

      await Promise.all(
        toDelete
          .map((row) =>
            row.imageKey ? deleteItemImage(orgId, row.imageKey) : null
          )
          .filter((p): p is Promise<void> => p !== null)
      )

      const actor = { ...(await resolveActor(userId)), orgId }
      await Promise.all(
        toDelete.map((row) =>
          logActivity(actor, {
            itemId: row.id,
            itemName: row.name,
            itemQrCode: row.qrCode,
            action: "deleted",
            fromLocation: row.location,
            fromCondition: row.condition,
          })
        )
      )

      return { deleted: toDelete.length, skipped }
    }
  )

/**
 * Bulk-update the status of multiple items. Org-scoped. Logs an
 * activity per item whose status actually changes.
 */
export const bulkUpdateStatus = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator(
    (data: {
      ids: string[]
      status: ItemStatus
    }): {
      ids: string[]
      status: ItemStatus
    } => data
  )
  .handler(
    async ({
      data: { ids, status },
      context,
    }): Promise<{ updated: number; skipped: number }> => {
      const { userId, orgId, has } = context
      if (ids.length === 0) return { updated: 0, skipped: 0 }
      const db = getDb()

      const found = await db
        .select()
        .from(items)
        .where(and(eq(items.orgId, orgId), inArray(items.id, ids)))

      // Items the caller's role can't touch are skipped, not updated.
      const current = found.filter((row) => canEditItem(has, row.requiredRole))
      const skipped = found.length - current.length
      if (current.length === 0) return { updated: 0, skipped }
      const allowedIds = current.map((row) => row.id)

      const updatedAt = new Date()
      await db
        .update(items)
        .set({
          status,
          // Checked-out items get a fresh takenOutAt; returned items clear it.
          takenOutAt:
            status === "In Storage" || status === "Available"
              ? null
              : new Date(),
          updatedAt,
        })
        .where(and(eq(items.orgId, orgId), inArray(items.id, allowedIds)))

      const actor = { ...(await resolveActor(userId)), orgId }
      const changed = current.filter((row) => row.status !== status)
      await Promise.all(
        changed.map((row) =>
          logActivity(actor, {
            itemId: row.id,
            itemName: row.name,
            itemQrCode: row.qrCode,
            action: statusAction(status),
            fromLocation: row.location,
            toLocation: row.location,
            fromCondition: row.condition,
            toCondition: row.condition,
          })
        )
      )

      return { updated: changed.length, skipped }
    }
  )

/**
 * Bulk-update the location of multiple items. Org-scoped. Logs a
 * "moved" activity per item whose location actually changes.
 */
export const bulkUpdateLocation = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator(
    (data: {
      ids: string[]
      location: string
    }): {
      ids: string[]
      location: string
    } => data
  )
  .handler(
    async ({
      data: { ids, location },
      context,
    }): Promise<{ updated: number; skipped: number }> => {
      const { userId, orgId, has } = context
      if (ids.length === 0) return { updated: 0, skipped: 0 }
      const db = getDb()

      const trimmed = location.trim()
      const found = await db
        .select()
        .from(items)
        .where(and(eq(items.orgId, orgId), inArray(items.id, ids)))

      // Items the caller's role can't touch are skipped, not updated.
      const current = found.filter((row) => canEditItem(has, row.requiredRole))
      const skipped = found.length - current.length
      if (current.length === 0) return { updated: 0, skipped }
      const allowedIds = current.map((row) => row.id)

      await db
        .update(items)
        .set({ location: trimmed, updatedAt: new Date() })
        .where(and(eq(items.orgId, orgId), inArray(items.id, allowedIds)))

      const actor = { ...(await resolveActor(userId)), orgId }
      const changed = current.filter((row) => row.location !== trimmed)
      await Promise.all(
        changed.map((row) =>
          logActivity(actor, {
            itemId: row.id,
            itemName: row.name,
            itemQrCode: row.qrCode,
            action: "moved",
            fromLocation: row.location,
            toLocation: trimmed,
            fromCondition: row.condition,
            toCondition: row.condition,
          })
        )
      )

      return { updated: changed.length, skipped }
    }
  )
