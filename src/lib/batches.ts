import { createServerFn } from "@tanstack/react-start"
import type { itemBatches, ItemCondition, ItemStatus } from "./schema.server"
import { authRequiredMiddleware } from "./auth-middleware"

export type ItemBatch = typeof itemBatches.$inferSelect

export type BatchStateInput = {
  location: string
  status: ItemStatus
  condition: ItemCondition
}

/** Add a new batch of stock to a bulk item. */
export const addBatch = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator(
    (input: { itemId: string; qty: number } & BatchStateInput) => input
  )
  .handler(async ({ data: input, context }): Promise<ItemBatch> => {
    const { insertBatch } = await import("./batches.server")
    return insertBatch(input, context.userId, context.orgId, context.has)
  })

/**
 * Move `qty` units out of one batch into a (possibly new) batch described
 * by location/status/condition. Increments a matching target batch when one
 * exists. The source batch auto-deletes when it reaches 0.
 */
export const moveBatchQty = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator(
    (
      input: {
        itemId: string
        fromBatchId: string
        qty: number
      } & BatchStateInput
    ) => input
  )
  .handler(async ({ data: input, context }): Promise<{ moved: number }> => {
    const { moveBatchQtyImpl } = await import("./batches.server")
    return moveBatchQtyImpl(input, context.userId, context.orgId, context.has)
  })

/** Set a batch's absolute quantity (stock take / correction). 0 deletes. */
export const setBatchQty = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((input: { batchId: string; itemId: string; qty: number }) => input)
  .handler(async ({ data: input, context }): Promise<{ qty: number }> => {
    const { setBatchQtyImpl } = await import("./batches.server")
    return setBatchQtyImpl(input, context.userId, context.orgId, context.has)
  })

/** Delete a batch outright (write-off of its remaining quantity). */
export const deleteBatch = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((input: { batchId: string; itemId: string }) => input)
  .handler(async ({ data: input, context }): Promise<{ deleted: boolean }> => {
    const { deleteBatchImpl } = await import("./batches.server")
    return deleteBatchImpl(input, context.userId, context.orgId, context.has)
  })
