import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    // `intent` (hover/focus) never fires on touch devices — a mobile-first
    // app needs `viewport` so lazy route chunks + loader data are fetched
    // as links scroll into view, making navigation feel instant.
    defaultPreload: "viewport",
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
