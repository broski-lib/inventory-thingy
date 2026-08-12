import { neon } from "@neondatabase/serverless"
import type { NeonQueryFunction } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

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

export function runInTransaction<T>(
  fn: (
    tx: NeonQueryFunction<true, false>
  ) => Promise<T>
): Promise<T> {
  const sql = getSql()
  return sql.transaction(fn as any) as Promise<T>
}
