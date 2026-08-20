import { and, asc, eq, inArray } from "drizzle-orm"
import { getDb } from "./db.server"
import { items, itemTags, tags } from "./schema.server"
import { generateUlid } from "./ids"
import { assertCanEditItem } from "./auth-middleware"
import type { HasFn } from "./auth-middleware"
import type { Tag, CreateTagInput, UpdateTagInput } from "./tags"

function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

/**
 * Fetch tags for a set of items in one query. Returns a Map of
 * itemId → tags (ordered by tag name).
 */
export async function getTagsForItems(
  orgId: string,
  itemIds: string[]
): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>()
  if (itemIds.length === 0) return map
  const db = getDb()
  const rows = await db
    .select({ itemId: itemTags.itemId, tag: tags })
    .from(itemTags)
    .innerJoin(
      tags,
      and(eq(itemTags.tagId, tags.id), eq(tags.orgId, orgId))
    )
    .where(and(eq(itemTags.orgId, orgId), inArray(itemTags.itemId, itemIds)))
    .orderBy(asc(tags.name))
  for (const row of rows) {
    const list = map.get(row.itemId)
    if (list) list.push(row.tag)
    else map.set(row.itemId, [row.tag])
  }
  return map
}

/** All tags in an org (ordered by name). */
export async function fetchTags(orgId: string): Promise<Tag[]> {
  const db = getDb()
  return db
    .select()
    .from(tags)
    .where(eq(tags.orgId, orgId))
    .orderBy(asc(tags.name))
}

export async function insertTag(
  orgId: string,
  input: CreateTagInput
): Promise<Tag> {
  const db = getDb()
  const name = normalizeTagName(input.name)
  if (!name) throw new Error("Tag name is required")
  if (name.length > 50) throw new Error("Tag name too long (max 50)")
  const color = input.color.trim().toLowerCase()
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new Error("Invalid tag color")

  // Case-insensitive dupe check — the unique index is case-sensitive.
  const existing = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.orgId, orgId), eq(tags.name, name)))
    .limit(1)
  if (existing.length > 0) throw new Error(`Tag "${name}" already exists`)

  const [inserted] = await db
    .insert(tags)
    .values({ id: generateUlid(), orgId, name, color })
    .returning()
  return inserted
}

export async function updateTagRow(
  orgId: string,
  input: UpdateTagInput
): Promise<Tag> {
  const db = getDb()
  const patch: Partial<typeof tags.$inferInsert> = {}
  if (input.name !== undefined) {
    const name = normalizeTagName(input.name)
    if (!name) throw new Error("Tag name is required")
    if (name.length > 50) throw new Error("Tag name too long (max 50)")
    patch.name = name
  }
  if (input.color !== undefined) {
    const color = input.color.trim().toLowerCase()
    if (!/^#[0-9a-f]{6}$/.test(color)) throw new Error("Invalid tag color")
    patch.color = color
  }
  if (Object.keys(patch).length === 0) {
    throw new Error("Nothing to update")
  }
  const [updated] = await db
    .update(tags)
    .set(patch)
    .where(and(eq(tags.orgId, orgId), eq(tags.id, input.id)))
    .returning()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!updated) throw new Error("Tag not found")
  return updated
}

export async function deleteTagRow(
  orgId: string,
  id: string
): Promise<{ deleted: boolean }> {
  const db = getDb()
  const [deleted] = await db
    .delete(tags)
    .where(and(eq(tags.orgId, orgId), eq(tags.id, id)))
    .returning()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!deleted) throw new Error("Tag not found")
  await db
    .delete(itemTags)
    .where(and(eq(itemTags.orgId, orgId), eq(itemTags.tagId, id)))
  return { deleted: true }
}

/**
 * Replace the tag set for one item. Tag ids outside the org are silently
 * dropped. Enforces the item's requiredRole, same as updateItem.
 */
export async function setItemTagsForItem(
  orgId: string,
  has: HasFn,
  input: { itemId: string; tagIds: string[] }
): Promise<{ tagIds: string[] }> {
  const { itemId, tagIds } = input
  const db = getDb()

  const itemRows = await db
    .select({ id: items.id, requiredRole: items.requiredRole })
    .from(items)
    .where(and(eq(items.orgId, orgId), eq(items.id, itemId)))
    .limit(1)
  if (itemRows.length === 0) throw new Error("Item not found")
  assertCanEditItem(has, itemRows[0].requiredRole)

  const uniqueIds = [...new Set(tagIds)]
  let validIds: string[] = []
  if (uniqueIds.length > 0) {
    const rows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.orgId, orgId), inArray(tags.id, uniqueIds)))
    validIds = rows.map((r) => r.id)
  }

  await db
    .delete(itemTags)
    .where(and(eq(itemTags.orgId, orgId), eq(itemTags.itemId, itemId)))
  if (validIds.length > 0) {
    await db
      .insert(itemTags)
      .values(validIds.map((tagId) => ({ orgId, itemId, tagId })))
  }
  return { tagIds: validIds }
}