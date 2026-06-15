import { createServerFn } from "@tanstack/react-start"
import { auth } from "@clerk/tanstack-react-start/server"
import { getDb } from "./db"
import { items } from "./schema"
import { eq, ilike, or, desc, sql } from "drizzle-orm"

async function requireUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }
  return userId
}

export const getItems = createServerFn({ method: "GET" })
  .validator((search: string | undefined) => search)
  .handler(async ({ data: search }) => {
    await requireUser()
    const db = getDb()

    if (search && search.trim() !== "") {
      const normalizedSearch = `%${search.trim()}%`
      return await db
        .select()
        .from(items)
        .where(
          or(
            ilike(items.name, normalizedSearch),
            ilike(items.qrCode, normalizedSearch),
            ilike(items.location, normalizedSearch),
            ilike(items.status, normalizedSearch),
            ilike(items.description, normalizedSearch)
          )
        )
        .orderBy(desc(items.updatedAt))
    }

    return await db.select().from(items).orderBy(desc(items.updatedAt))
  })

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser()
  const db = getDb()

  const statusCounts = await db
    .select({
      status: items.status,
      count: sql<number>`count(*)::int`,
    })
    .from(items)
    .groupBy(items.status)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const movesTodayResult = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(items)
    .where(sql`${items.updatedAt} >= ${today}`)

  return {
    statusCounts,
    movesToday: movesTodayResult[0]?.count || 0,
  }
})

export const getItemByQrCode = createServerFn({ method: "GET" })
  .validator((qrCode: string) => qrCode)
  .handler(async ({ data: qrCode }): Promise<(typeof items.$inferSelect) | null> => {
    await requireUser()
    const db = getDb()
    const result = await db.select().from(items).where(eq(items.qrCode, qrCode)).limit(1)
    return result[0] ?? null
  })

export const createItem = createServerFn({ method: "POST" })
  .validator((item: Omit<typeof items.$inferInsert, "id" | "createdAt" | "updatedAt">) => item)
  .handler(async ({ data: item }) => {
    const userId = await requireUser()
    const db = getDb()

    const [inserted] = await db
      .insert(items)
      .values({
        ...item,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return inserted
  })

export const updateItem = createServerFn({ method: "POST" })
  .validator((data: { id: string; item: Partial<typeof items.$inferInsert> }) => data)
  .handler(async ({ data: { id, item } }) => {
    await requireUser()
    const db = getDb()

    const updateData: Partial<typeof items.$inferInsert> = {
      ...item,
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
      .where(eq(items.id, id))
      .returning()

    return updated
  })

export const deleteItem = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    await requireUser()
    const db = getDb()
    const [deleted] = await db.delete(items).where(eq(items.id, id)).returning()
    return deleted
  })
