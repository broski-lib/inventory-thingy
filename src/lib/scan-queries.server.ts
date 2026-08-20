import { desc, eq } from "drizzle-orm"
import { getDb } from "./db.server"
import { items } from "./schema.server"
import type { ItemBatch } from "./batches"
import type { Rack } from "./racks"

export async function loadScanImpl(orgId: string): Promise<{
  recent: {
    id: string
    qrCode: string
    name: string
    imageUrl: string
    status: typeof items.$inferSelect["status"]
  }[]
}> {
  const db = getDb()
  const recent = await db
    .select({
      id: items.id,
      qrCode: items.qrCode,
      name: items.name,
      imageUrl: items.imageUrl,
      status: items.status,
    })
    .from(items)
    .where(eq(items.orgId, orgId))
    .orderBy(desc(items.updatedAt))
    .limit(8)
  return { recent }
}

export async function lookupItemImpl(
  orgId: string,
  code: string
): Promise<{
  code: string
  item: typeof items.$inferSelect | null
  batches: ItemBatch[]
  rack: Rack | null
}> {
  const { fetchItemByQrCode } = await import("./inventory.server")
  const { fetchRackByQrCode } = await import("./racks.server")
  const { getBatchesForItems } = await import("./batches.server")
  const found = await fetchItemByQrCode(orgId, code)
  if (!found) {
    const rack = await fetchRackByQrCode(orgId, code)
    return { code, item: null, batches: [], rack }
  }
  if (found.kind !== "bulk") return { code, item: found, batches: [], rack: null }
  const batchesByItem = await getBatchesForItems(orgId, [found.id])
  return {
    code,
    item: found,
    batches: batchesByItem.get(found.id) ?? [],
    rack: null,
  }
}