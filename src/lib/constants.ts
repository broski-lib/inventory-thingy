/**
 * App-wide constants with NO drizzle or server-only imports.
 * Import this file freely from client components — it won't pull
 * `@neondatabase/serverless` or `drizzle-orm` into the client bundle.
 */
export const ITEM_STATUSES = [
  "Available",
  "In Storage",
  "Reserved",
  "Staged",
  "Repair",
  "Retired",
  "Pending Tag",
] as const

export const ITEM_CONDITIONS = ["Excellent", "Good", "Worn", "Repair"] as const

export type ItemStatus = (typeof ITEM_STATUSES)[number]
export type ItemCondition = (typeof ITEM_CONDITIONS)[number]

export const ITEM_KINDS = ["unit", "bulk"] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

export const PRINT_SIZES = ["small", "medium", "large"] as const
export type PrintSize = (typeof PRINT_SIZES)[number]

export const TAG_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
] as const

export type TagColor = (typeof TAG_COLORS)[number]["value"]

export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "checked_out",
  "checked_in",
  "reported_damaged",
  "moved",
  "condition_changed",
] as const

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

export const STOCK_STATUS_FILTERS = [
  "All",
  "Available",
  "Staged",
  "Repair",
  "Pending Tag",
] as const
export type StockStatusFilter = (typeof STOCK_STATUS_FILTERS)[number]

export const STOCK_SORTS = [
  { id: "updated_desc", label: "Recently updated" },
  { id: "updated_asc", label: "Least recently updated" },
  { id: "created_desc", label: "Newest first" },
  { id: "created_asc", label: "Oldest first" },
  { id: "name_asc", label: "Name A–Z" },
  { id: "name_desc", label: "Name Z–A" },
  { id: "location_asc", label: "Location A–Z" },
  { id: "location_desc", label: "Location Z–A" },
] as const
export type StockSort = (typeof STOCK_SORTS)[number]["id"]
export const DEFAULT_STOCK_SORT: StockSort = "updated_desc"

