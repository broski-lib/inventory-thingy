import { createServerFn } from "@tanstack/react-start"
import type { tags } from "./schema.server"
import { authRequiredMiddleware } from "./auth-middleware"

export type Tag = typeof tags.$inferSelect

export type CreateTagInput = {
  name: string
  color: string
}

export type UpdateTagInput = {
  id: string
  name?: string
  color?: string
}

export const listTags = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }): Promise<Tag[]> => {
    const { fetchTags } = await import("./tags.server")
    return fetchTags(context.orgId)
  })

export const createTag = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((input: CreateTagInput) => input)
  .handler(async ({ data: input, context }): Promise<Tag> => {
    const { insertTag } = await import("./tags.server")
    return insertTag(context.orgId, input)
  })

export const updateTag = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((input: UpdateTagInput) => input)
  .handler(async ({ data: input, context }): Promise<Tag> => {
    const { updateTagRow } = await import("./tags.server")
    return updateTagRow(context.orgId, input)
  })

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }): Promise<{ deleted: boolean }> => {
    const { deleteTagRow } = await import("./tags.server")
    return deleteTagRow(context.orgId, id)
  })

/**
 * Replace the tag set for one item. Tag ids outside the org are silently
 * dropped. Enforces the item's requiredRole, same as updateItem.
 */
export const setItemTags = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((input: { itemId: string; tagIds: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { setItemTagsForItem } = await import("./tags.server")
    return setItemTagsForItem(context.orgId, context.has, data)
  })