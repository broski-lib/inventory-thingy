import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const itemStatus = pgEnum("item_status", [
  "available",
  "reserved",
  "staged",
  "repair",
  "retired",
])

export const condition = pgEnum("condition", [
  "excellent",
  "good",
  "worn",
  "repair",
])

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    qrCode: text("qr_code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    condition: text("condition").notNull().default("Good"),
    location: text("location").notNull(),
    status: text("status").notNull().default("In Storage"),
    takenOutAt: timestamp("taken_out_at", { withTimezone: true }),
    imageUrl: text("image_url").notNull().default(""),
    createdBy: text("created_by").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_items_qr_code").on(table.qrCode),
    index("idx_items_status").on(table.status),
    index("idx_items_name").on(table.name),
  ]
)
