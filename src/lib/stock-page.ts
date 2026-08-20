import { createServerFn } from "@tanstack/react-start"
import { authRequiredMiddleware } from "./auth-middleware"
import type { GetItemsPageArgs } from "./inventory"

/**
 * Consolidated `/stock` page data: item page + filter reference data
 * (tags, locations, category tree, rack options) in a single server fn
 * and a single auth pass. The heavy query modules are imported
 * dynamically inside the handler so they stay out of the client bundle.
 */
export const getStockPageData = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .validator((args: GetItemsPageArgs) => args)
  .handler(async ({ data: args, context }) => {
    const { orgId } = context
    const [
      { queryItemsPage, queryLocations },
      { fetchTags },
      { buildTree },
      { fetchRackOptions },
    ] = await Promise.all([
      import("./inventory.server"),
      import("./tags.server"),
      import("./categories.server"),
      import("./racks.server"),
    ])
    const [page, allTags, locations, categoryTree, racks] = await Promise.all([
      queryItemsPage(orgId, args),
      fetchTags(orgId),
      queryLocations(orgId),
      buildTree(orgId),
      fetchRackOptions(orgId),
    ])
    return { page, allTags, locations, categoryTree, racks }
  })