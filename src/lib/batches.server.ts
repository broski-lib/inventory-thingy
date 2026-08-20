import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { getDb } from "./db.server"
import { itemBatches, items } from "./schema.server"
import type { ItemCondition, ItemStatus } from "./schema.server"
import { generateUlid } from "./ids"
import { logActivity, resolveActor } from "./activity.server"
import { assertCanEditItem } from "./auth-middleware"
import type { HasFn } from "./auth-middleware"
import type { ItemBatch, BatchStateInput } from "./batches"

/**
 * Fetch batches for a set of items in one query. Returns a Map of
 * itemId → batches (oldest first).
 */
export async function getBatchesForItems(
  orgId: string,
  itemIds: string[]
): Promise<Map<string, ItemBatch[]>> {
  const map = new Map<string, ItemBatch[]>()
  if (itemIds.length === 0) return map
  const db = getDb()
  const rows = await db
    .select()
    .from(itemBatches)
    .where(
      and(eq(itemBatches.orgId, orgId), inArray(itemBatches.itemId, itemIds))
    )
    .orderBy(asc(itemBatches.createdAt))
  for (const row of rows) {
    const list = map.get(row.itemId)
    if (list) list.push(row)
    else map.set(row.itemId, [row])
  }
  return map
}

function batchAction(
  from: { location: string; status: ItemStatus; condition: ItemCondition },
  to: { location: string; status: ItemStatus; condition: ItemCondition }
):
  | "checked_out"
  | "checked_in"
  | "reported_damaged"
  | "moved"
  | "condition_changed"
  | "updated" {
  if (to.status !== from.status) {
    if (to.status === "Reserved" || to.status === "Staged") return "checked_out"
    if (to.status === "In Storage" || to.status === "Available")
      return "checked_in"
    if (to.status === "Repair") return "reported_damaged"
    return "updated"
  }
  if (to.location !== from.location) return "moved"
  if (to.condition !== from.condition) return "condition_changed"
  return "updated"
}

/** Fetch a bulk item + enforce its requiredRole. Internal helper. */
async function requireBulkItem(
  orgId: string,
  has: HasFn,
  itemId: string
): Promise<typeof items.$inferSelect> {
  const db = getDb()
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.orgId, orgId), eq(items.id, itemId)))
    .limit(1)
  if (rows.length === 0) throw new Error("Item not found")
  const item = rows[0]
  assertCanEditItem(has, item.requiredRole)
  if (item.kind !== "bulk") throw new Error("Item is not a bulk item")
  return item
}

function validateQty(qty: number): number {
  const n = Math.floor(qty)
  if (!Number.isFinite(n) || n < 1)
    throw new Error("Quantity must be at least 1")
  if (n > 1_000_000) throw new Error("Quantity too large")
  return n
}

function validateState(state: BatchStateInput): BatchStateInput {
  const location = state.location.trim()
  if (!location) throw new Error("Location is required")
  return { location, status: state.status, condition: state.condition }
}

/** Add a new batch of stock to a bulk item. */
export async function insertBatch(
  input: { itemId: string; qty: number } & BatchStateInput,
  userId: string,
  orgId: string,
  has: HasFn
): Promise<ItemBatch> {
  const item = await requireBulkItem(orgId, has, input.itemId)
  const qty = validateQty(input.qty)
  const state = validateState(input)
  const db = getDb()

  const [inserted] = await db
    .insert(itemBatches)
    .values({
      id: generateUlid(),
      orgId,
      itemId: item.id,
      qty,
      ...state,
    })
    .returning()

  const actor = { ...(await resolveActor(userId)), orgId }
  await logActivity(actor, {
    itemId: item.id,
    itemName: item.name,
    itemQrCode: item.qrCode,
    action: "created",
    toLocation: state.location,
    toCondition: state.condition,
    quantity: qty,
  })
  return inserted
}

/**
 * Move `qty` units out of one batch into a (possibly new) batch described
 * by location/status/condition. Increments a matching target batch when one
 * exists. The source batch auto-deletes when it reaches 0.
 */
export async function moveBatchQtyImpl(
  input: { itemId: string; fromBatchId: string; qty: number } & BatchStateInput,
  userId: string,
  orgId: string,
  has: HasFn
): Promise<{ moved: number }> {
  const item = await requireBulkItem(orgId, has, input.itemId)
  const qty = validateQty(input.qty)
  const state = validateState(input)
  const db = getDb()

  const sourceRows = await db
    .select()
    .from(itemBatches)
    .where(
      and(
        eq(itemBatches.orgId, orgId),
        eq(itemBatches.itemId, item.id),
        eq(itemBatches.id, input.fromBatchId)
      )
    )
    .limit(1)
  if (sourceRows.length === 0) throw new Error("Batch not found")
  const source = sourceRows[0]
  if (qty > source.qty) {
    throw new Error(`Only ${source.qty} in this batch`)
  }

  const sameState =
    source.location === state.location &&
    source.status === state.status &&
    source.condition === state.condition
  if (sameState) return { moved: 0 }

  // Find or create the target batch.
  const targetRows = await db
    .select()
    .from(itemBatches)
    .where(
      and(
        eq(itemBatches.orgId, orgId),
        eq(itemBatches.itemId, item.id),
        eq(itemBatches.location, state.location),
        eq(itemBatches.status, state.status),
        eq(itemBatches.condition, state.condition)
      )
    )
    .limit(1)

  if (targetRows.length > 0) {
    await db
      .update(itemBatches)
      .set({ qty: sql`${itemBatches.qty} + ${qty}`, updatedAt: new Date() })
      .where(eq(itemBatches.id, targetRows[0].id))
  } else {
    await db.insert(itemBatches).values({
      id: generateUlid(),
      orgId,
      itemId: item.id,
      qty,
      ...state,
    })
  }

  const remaining = source.qty - qty
  if (remaining === 0) {
    await db.delete(itemBatches).where(eq(itemBatches.id, source.id))
  } else {
    await db
      .update(itemBatches)
      .set({ qty: remaining, updatedAt: new Date() })
      .where(eq(itemBatches.id, source.id))
  }

  const actor = { ...(await resolveActor(userId)), orgId }
  await logActivity(actor, {
    itemId: item.id,
    itemName: item.name,
    itemQrCode: item.qrCode,
    action: batchAction(source, state),
    fromLocation: source.location,
    toLocation: state.location,
    fromCondition: source.condition,
    toCondition: state.condition,
    quantity: qty,
  })
  return { moved: qty }
}

/** Set a batch's absolute quantity (stock take / correction). 0 deletes. */
export async function setBatchQtyImpl(
  input: { batchId: string; itemId: string; qty: number },
  userId: string,
  orgId: string,
  has: HasFn
): Promise<{ qty: number }> {
  const item = await requireBulkItem(orgId, has, input.itemId)
  const db = getDb()

  const n = Math.floor(input.qty)
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid quantity")

  const rows = await db
    .select()
    .from(itemBatches)
    .where(
      and(
        eq(itemBatches.orgId, orgId),
        eq(itemBatches.itemId, item.id),
        eq(itemBatches.id, input.batchId)
      )
    )
    .limit(1)
  if (rows.length === 0) throw new Error("Batch not found")
  const batch = rows[0]
  if (n === batch.qty) return { qty: n }

  if (n === 0) {
    await db.delete(itemBatches).where(eq(itemBatches.id, batch.id))
  } else {
    await db
      .update(itemBatches)
      .set({ qty: n, updatedAt: new Date() })
      .where(eq(itemBatches.id, batch.id))
  }

  const actor = { ...(await resolveActor(userId)), orgId }
  await logActivity(actor, {
    itemId: item.id,
    itemName: item.name,
    itemQrCode: item.qrCode,
    action: "updated",
    fromLocation: batch.location,
    toLocation: batch.location,
    fromCondition: batch.condition,
    toCondition: batch.condition,
    quantity: n,
  })
  return { qty: n }
}

/** Delete a batch outright (write-off of its remaining quantity). */
export async function deleteBatchImpl(
  input: { batchId: string; itemId: string },
  userId: string,
  orgId: string,
  has: HasFn
): Promise<{ deleted: boolean }> {
  const item = await requireBulkItem(orgId, has, input.itemId)
  const db = getDb()

  const [deleted] = await db
    .delete(itemBatches)
    .where(
      and(
        eq(itemBatches.orgId, orgId),
        eq(itemBatches.itemId, item.id),
        eq(itemBatches.id, input.batchId)
      )
    )
    .returning()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!deleted) throw new Error("Batch not found")

  const actor = { ...(await resolveActor(userId)), orgId }
  await logActivity(actor, {
    itemId: item.id,
    itemName: item.name,
    itemQrCode: item.qrCode,
    action: "deleted",
    fromLocation: deleted.location,
    fromCondition: deleted.condition,
    quantity: deleted.qty,
  })
  return { deleted: true }
}
