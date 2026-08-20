import { neon } from "@neondatabase/serverless"
import type { NeonQueryFunction } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema.server"

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined
let cachedSql: NeonQueryFunction<false, false> | undefined

function getSql() {
  if (cachedSql) return cachedSql

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Add it to .env before DB tests.")
  }

  cachedSql = neon(connectionString)
  return cachedSql
}

export function getDb() {
  if (cachedDb) return cachedDb

  cachedDb = drizzle(getSql(), { schema })
  return cachedDb
}
