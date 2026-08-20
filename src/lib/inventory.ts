import { createServerFn } from "@tanstack/react-start"
import type { items } from "./schema.server"
import type {
  ItemCondition,
  ItemKind,
  ItemStatus,
  StockSort,
  StockStatusFilter,
} from "./constants"
import type { Tag } from "./tags"
import type { ItemBatch } from "./batches"
import type { ActivityLog } from "./activity"
import { authRequiredMiddleware } from "./auth-middleware"

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
  categoryIds?: string[]
  rackIds?: string[]
  sort?: StockSort
  kinds?: ItemKind[]
}

export const getItemsPage = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((args: GetItemsPageArgs) => args)
  .handler(async ({ data: args, context }): Promise<ItemsPage> => {
    const { queryItemsPage } = await import("./inventory.server")
    return queryItemsPage(context.orgId, args)
  })

export const getLocations = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }): Promise<string[]> => {
    const { queryLocations } = await import("./inventory.server")
    return queryLocations(context.orgId)
  })

/**
 * Most-frequent location across items and batches, for use as a
 * sensible default (e.g. bulk-scan page).
 */
export const getMostCommonLocation = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }): Promise<string | null> => {
    const { fetchMostCommonLocation } = await import("./inventory.server")
    return fetchMostCommonLocation(context.orgId)
  })

export const getStats = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }) => {
    const { fetchStats } = await import("./inventory.server")
    return fetchStats(context.orgId)
  })

export const getItemByQrCode = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((qrCode: string) => qrCode)
  .handler(
    async ({
      data: qrCode,
      context,
    }): Promise<typeof items.$inferSelect | null> => {
      const { fetchItemByQrCode } = await import("./inventory.server")
      return fetchItemByQrCode(context.orgId, qrCode)
    }
  )

export const createItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((item: CreateItemInput) => item)
  .handler(async ({ data: item, context }) => {
    const { insertItem } = await import("./inventory.server")
    return insertItem(item, context.userId, context.orgId, context.has)
  })

export const updateItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((data: UpdateItemInput) => data)
  .handler(async ({ data, context }) => {
    const { updateItemRow } = await import("./inventory.server")
    return updateItemRow(data, context.userId, context.orgId, context.has)
  })

export const deleteItem = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    const { deleteItemRow } = await import("./inventory.server")
    return deleteItemRow(id, context.userId, context.orgId, context.has)
  })

export const uploadItemImage = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((form: FormData) => form)
  .handler(async ({ data: form, context }) => {
    const { uploadItemImageImpl } = await import("./inventory.server")
    return uploadItemImageImpl(form, context.orgId)
  })

/**
 * Fetch a single item by id (org-scoped). Returns undefined if not found.
 */
export const getItemById = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(
    async ({
      data: id,
      context,
    }): Promise<InventoryItemWithTags | undefined> => {
      const { fetchItemById } = await import("./inventory.server")
      return fetchItemById(context.orgId, id)
    }
  )

export const getItemsByIds = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((ids: string[]) => ids)
  .handler(async ({ data: ids, context }): Promise<InventoryItem[]> => {
    const { fetchItemsByIds } = await import("./inventory.server")
    return fetchItemsByIds(context.orgId, ids)
  })

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
      const { fetchItemWithHistory } = await import("./inventory.server")
      return fetchItemWithHistory(context.orgId, id)
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
      const { bulkDeleteItemsImpl } = await import("./inventory.server")
      return bulkDeleteItemsImpl(
        ids,
        context.userId,
        context.orgId,
        context.has
      )
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
      const { bulkUpdateStatusImpl } = await import("./inventory.server")
      return bulkUpdateStatusImpl(
        ids,
        status,
        context.userId,
        context.orgId,
        context.has
      )
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
      const { bulkUpdateLocationImpl } = await import("./inventory.server")
      return bulkUpdateLocationImpl(
        ids,
        location,
        context.userId,
        context.orgId,
        context.has
      )
    }
  )