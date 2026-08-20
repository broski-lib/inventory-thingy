import { createServerFn } from "@tanstack/react-start"
import type { racks, items } from "./schema.server"
import { authRequiredMiddleware } from "./auth-middleware"

export type Rack = typeof racks.$inferSelect

export type RackWithItems = Rack & {
  items: (typeof items.$inferSelect & { rackQty: number })[]
}

export const getRackByQrCode = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((qrCode: string) => qrCode)
  .handler(async ({ data: qrCode, context }): Promise<Rack | null> => {
    const { fetchRackByQrCode } = await import("./racks.server")
    return fetchRackByQrCode(context.orgId, qrCode)
  })

export const listRacks = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }): Promise<RackWithItems[]> => {
    const { fetchRacks } = await import("./racks.server")
    return fetchRacks(context.orgId)
  })

export const getRack = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }): Promise<RackWithItems | null> => {
    const { fetchRackById } = await import("./racks.server")
    return fetchRackById(context.orgId, id)
  })

export type CreateRackInput = {
  name: string
  location: string
  items: { itemId: string; qty: number }[]
}

export const createRack = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((data: CreateRackInput) => data)
  .handler(async ({ data, context }) => {
    const { insertRack } = await import("./racks.server")
    return insertRack(context.orgId, data)
  })

export type UpdateRackInput = {
  id: string
  name?: string
  location?: string
  items?: { itemId: string; qty: number }[]
}

export const updateRack = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((data: UpdateRackInput) => data)
  .handler(async ({ data, context }) => {
    const { updateRackRow } = await import("./racks.server")
    return updateRackRow(context.orgId, data)
  })

export const deleteRack = createServerFn({ method: "POST" })
  .middleware([authRequiredMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    const { deleteRackRow } = await import("./racks.server")
    return deleteRackRow(context.orgId, id)
  })