import { createFileRoute } from "@tanstack/react-router"

const handler = async ({ request }: { request: Request }) => {
  const baseUrl = process.env.VITE_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL
  if (!baseUrl) {
    throw new Error("VITE_NEON_AUTH_URL or NEON_AUTH_BASE_URL is required")
  }

  const requestUrl = new URL(request.url)
  const pathPrefix = "/api/auth"
  const startIdx = requestUrl.pathname.indexOf(pathPrefix)
  const subPath = startIdx !== -1 ? requestUrl.pathname.slice(startIdx + pathPrefix.length) : ""

  const targetUrlStr =
    baseUrl.replace(/\/$/, "") +
    (subPath.startsWith("/") ? subPath : "/" + subPath) +
    requestUrl.search
  const targetUrl = new URL(targetUrlStr)

  const headers = new Headers(request.headers)
  headers.set("Host", targetUrl.host)

  let body: any = undefined
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    body = await request.clone().text()
  }

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body,
  })

  return response
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})

