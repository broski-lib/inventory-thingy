import { and, asc, eq, inArray } from "drizzle-orm"
import { getDb } from "./db.server"
import { racks, rackItems, items } from "./schema.server"
import { generateUlid, generateQrCode } from "./ids"
import type {
  Rack,
  RackWithItems,
  CreateRackInput,
  UpdateRackInput,
} from "./racks"

/** Lightweight rack summary for filter pickers — id + name only. */
export async function fetchRackOptions(
  orgId: string
): Promise<{ id: string; name: string }[]> {
  const db = getDb()
  return db
    .select({ id: racks.id, name: racks.name })
    .from(racks)
    .where(eq(racks.orgId, orgId))
    .orderBy(asc(racks.name))
}

export async function fetchRacks(orgId: string): Promise<RackWithItems[]> {
  const db = getDb()
  const rackRows = await db
    .select()
    .from(racks)
    .where(eq(racks.orgId, orgId))
    .orderBy(asc(racks.name))

  if (rackRows.length === 0) return []

  const rackIds = rackRows.map((r) => r.id)
  const riRows = await db
    .select()
    .from(rackItems)
    .where(and(eq(rackItems.orgId, orgId), inArray(rackItems.rackId, rackIds)))

  if (riRows.length === 0) {
    return rackRows.map((r) => ({ ...r, items: [] }))
  }

  const itemIds = [...new Set(riRows.map((ri) => ri.itemId))]
  const itemRows = await db
    .select()
    .from(items)
    .where(and(eq(items.orgId, orgId), inArray(items.id, itemIds)))

  const itemMap = new Map(itemRows.map((i) => [i.id, i]))
  const riMap = new Map<string, Map<string, number>>()
  for (const ri of riRows) {
    if (!riMap.has(ri.rackId)) riMap.set(ri.rackId, new Map())
    riMap.get(ri.rackId)!.set(ri.itemId, ri.qty)
  }

  return rackRows.map((r) => {
    const rim = riMap.get(r.id)
    return {
      ...r,
      items: rim
        ? [...rim.entries()]
            .map(([itemId, rackQty]) => {
              const item = itemMap.get(itemId)
              return item ? { ...item, rackQty } : null
            })
            .filter((i): i is NonNullable<typeof i> => i !== null)
        : [],
    }
  })
}

export async function fetchRackByQrCode(
  orgId: string,
  qrCode: string
): Promise<Rack | null> {
  const db = getDb()
  const [rack] = await db
    .select()
    .from(racks)
    .where(and(eq(racks.orgId, orgId), eq(racks.qrCode, qrCode)))
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return rack ?? null
}

export async function fetchRackById(
  orgId: string,
  id: string
): Promise<RackWithItems | null> {
  const db = getDb()
  const rackRows = await db
    .select()
    .from(racks)
    .where(and(eq(racks.orgId, orgId), eq(racks.id, id)))
    .limit(1)
  if (!rackRows[0]) return null
  const rack = rackRows[0]

  const riRows = await db
    .select()
    .from(rackItems)
    .where(and(eq(rackItems.orgId, orgId), eq(rackItems.rackId, id)))

  if (riRows.length === 0) return { ...rack, items: [] }

  const itemIds = riRows.map((ri) => ri.itemId)
  const itemRows = await db
    .select()
    .from(items)
    .where(and(eq(items.orgId, orgId), inArray(items.id, itemIds)))

  const itemMap = new Map(itemRows.map((i) => [i.id, i]))
  const riMap = new Map(riRows.map((ri) => [ri.itemId, ri.qty]))

  return {
    ...rack,
    items: [...riMap.entries()]
      .map(([itemId, rackQty]) => {
        const item = itemMap.get(itemId)
        return item ? { ...item, rackQty } : null
      })
      .filter((i): i is NonNullable<typeof i> => i !== null),
  }
}

export async function insertRack(
  orgId: string,
  data: CreateRackInput
): Promise<{ id: string; qrCode: string }> {
  const db = getDb()
  const id = generateUlid()
  const qrCode = generateQrCode()
  const now = new Date()

  await db.insert(racks).values({
    id,
    orgId,
    name: data.name.trim(),
    location: data.location.trim(),
    qrCode,
    createdAt: now,
    updatedAt: now,
  })

  if (data.items.length > 0) {
    await db.insert(rackItems).values(
      data.items.map((it) => ({
        rackId: id,
        orgId,
        itemId: it.itemId,
        qty: Math.max(1, Math.floor(it.qty)),
      }))
    )
  }

  return { id, qrCode }
}

export async function updateRackRow(
  orgId: string,
  data: UpdateRackInput
): Promise<void> {
  const db = getDb()
  const existingRows = await db
    .select({ id: racks.id })
    .from(racks)
    .where(and(eq(racks.orgId, orgId), eq(racks.id, data.id)))
    .limit(1)
  if (!existingRows[0]) throw new Error("Rack not found")

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (data.name !== undefined) patch.name = data.name.trim()
  if (data.location !== undefined) patch.location = data.location.trim()

  await db
    .update(racks)
    .set(patch)
    .where(and(eq(racks.orgId, orgId), eq(racks.id, data.id)))

  if (data.items !== undefined) {
    await db
      .delete(rackItems)
      .where(and(eq(rackItems.orgId, orgId), eq(rackItems.rackId, data.id)))
    if (data.items.length > 0) {
      await db.insert(rackItems).values(
        data.items.map((it) => ({
          rackId: data.id,
          orgId,
          itemId: it.itemId,
          qty: Math.max(1, Math.floor(it.qty)),
        }))
      )
    }
  }
}

export async function deleteRackRow(orgId: string, id: string): Promise<void> {
  const db = getDb()
  await db
    .delete(rackItems)
    .where(and(eq(rackItems.orgId, orgId), eq(rackItems.rackId, id)))
  await db.delete(racks).where(and(eq(racks.orgId, orgId), eq(racks.id, id)))
}
