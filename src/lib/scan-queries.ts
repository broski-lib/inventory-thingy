import { createServerFn } from "@tanstack/react-start"
import { desc, eq } from "drizzle-orm"
import { getDb } from "./db"
import { items } from "./schema"
import { authRequiredMiddleware } from "./auth-middleware"
import { getItemByQrCode } from "./inventory"
import { getBatchesForItems } from "./batches"
import { getRackByQrCode } from "./racks"

export const loadScan = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }) => {
    const { orgId } = context
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
  })

export const lookupItem = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((code: string) => code)
  .handler(async ({ data: code, context }) => {
    const found = await getItemByQrCode({ data: code })
    if (!found) {
      const rack = await getRackByQrCode({ data: code })
      return { code, item: null, batches: [], rack }
    }
    if (found.kind !== "bulk") return { code, item: found, batches: [] }
    const batchesByItem = await getBatchesForItems(context.orgId, [found.id])
    return { code, item: found, batches: batchesByItem.get(found.id) ?? [] }
  })
