import { createServerFn } from "@tanstack/react-start"
import { and, asc, eq } from "drizzle-orm"
import { getDb } from "./db"
import { categories, items } from "./schema"
import { authRequiredMiddleware } from "./auth-middleware"
import { generateUlid } from "./ids"

export type Category = typeof categories.$inferSelect

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[]
}

async function buildTree(orgId: string): Promise<CategoryTreeNode[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.orgId, orgId))
    .orderBy(asc(categories.name))

  const byParent = new Map<string | null, Category[]>()
  for (const row of rows) {
    const key = row.parentId ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(row)
  }

  function build(parentId: string | null): CategoryTreeNode[] {
    const children = byParent.get(parentId) ?? []
    return children.map((c) => ({
      ...c,
      children: build(c.id),
    }))
  }

  return build(null)
}

export const getCategoryTree = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }): Promise<CategoryTreeNode[]> => {
    return buildTree(context.orgId)
  })

export const createCategory = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((input: { name: string; parentId: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { orgId } = context
    const db = getDb()
    const id = generateUlid()
    const name = data.name.trim()
    if (!name) throw new Error("Category name is required")
    await db.insert(categories).values({
      id,
      orgId,
      name,
      parentId: data.parentId || null,
    })
    return { id, name }
  })

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    const { orgId } = context
    const db = getDb()

    const [cat, itemCount, childCount] = await Promise.all([
      db.select({ id: categories.id }).from(categories).where(and(eq(categories.orgId, orgId), eq(categories.id, id))).limit(1),
      db.$count(items, and(eq(items.orgId, orgId), eq(items.categoryId, id))),
      db.$count(categories, and(eq(categories.orgId, orgId), eq(categories.parentId, id))),
    ])

    if (cat.length === 0) throw new Error("Category not found")
    if (itemCount > 0 || childCount > 0) {
      throw new Error("Cannot delete a category that still has items or subcategories")
    }

    await db.delete(categories).where(and(eq(categories.orgId, orgId), eq(categories.id, id)))
  })
