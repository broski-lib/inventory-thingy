import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined

export function getDb() {
  if (cachedDb) return cachedDb

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Add it to .env before DB tests.")
  }

  const sql = neon(connectionString)
  cachedDb = drizzle(sql, { schema })

  return cachedDb
}
