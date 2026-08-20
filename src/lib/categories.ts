import { createServerFn } from "@tanstack/react-start"
import type { categories } from "./schema.server"
import { authRequiredMiddleware } from "./auth-middleware"

export type Category = typeof categories.$inferSelect

export type CategoryTreeNode = Category & {
  children: CategoryTreeNode[]
}

export const getCategoryTree = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }): Promise<CategoryTreeNode[]> => {
    const { buildTree } = await import("./categories.server")
    return buildTree(context.orgId)
  })

export const createCategory = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((input: { name: string; parentId: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { insertCategory } = await import("./categories.server")
    return insertCategory(context.orgId, data)
  })

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    const { deleteCategoryById } = await import("./categories.server")
    return deleteCategoryById(context.orgId, id)
  })