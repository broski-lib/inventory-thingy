import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { auth } from "@clerk/tanstack-react-start/server"

const loadLanding = createServerFn({ method: "GET" }).handler(async () => {
  // landing must be reachable for signed-out users, but if a user is
  // already authenticated, push them straight to /home so the marketing
  // page doesn't get in the way of the app.
  const { isAuthenticated } = await auth()
  if (isAuthenticated) {
    throw redirect({ to: "/home" })
  }
  return { ok: true as const }
})

export const Route = createFileRoute("/")({
  loader: async () => loadLanding(),
  head: () => ({
    meta: [
      {
        title: "Inventory Thingy",
      },
      {
        name: "description",
        content:
          "Tag, scan, and track every piece in your furniture inventory. Built for staging teams who need to know where a sofa is right now.",
      },
    ],
  }),
})