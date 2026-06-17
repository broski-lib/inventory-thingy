import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@clerk/tanstack-react-start/server"
import { getItemImage } from "@/lib/storage"

export const Route = createFileRoute("/api/images/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) {
          return new Response("Unauthorized", { status: 401 })
        }
        const key = params._splat
        if (!key || !key.startsWith(`orgs/${orgId}/`)) {
          return new Response("Forbidden", { status: 403 })
        }
        const object = await getItemImage(orgId, key)
        if (!object) {
          return new Response("Not Found", { status: 404 })
        }
        const headers = new Headers()
        if (object.httpMetadata?.contentType) {
          headers.set("Content-Type", object.httpMetadata.contentType)
        }
        headers.set("Cache-Control", "private, max-age=3600")
        headers.set("X-Content-Type-Options", "nosniff")
        return new Response(object.body, { headers })
      },
    },
  },
})
