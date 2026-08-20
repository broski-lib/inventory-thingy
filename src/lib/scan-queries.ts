import { createServerFn } from "@tanstack/react-start"
import { authRequiredMiddleware } from "./auth-middleware"

export const loadScan = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }) => {
    const { loadScanImpl } = await import("./scan-queries.server")
    return loadScanImpl(context.orgId)
  })

export const lookupItem = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((code: string) => code)
  .handler(async ({ data: code, context }) => {
    const { lookupItemImpl } = await import("./scan-queries.server")
    return lookupItemImpl(context.orgId, code)
  })