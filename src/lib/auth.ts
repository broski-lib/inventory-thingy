import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  let cookie: string
  try {
    const headers = getRequestHeaders()
    cookie = headers.get("cookie") || ""
  } catch {
    return null
  }

  if (!cookie) return null

  const hasSessionToken = cookie.includes("session_token")
  if (!hasSessionToken) return null

  try {
    const baseUrl = process.env.VITE_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL
    if (!baseUrl) {
      console.warn("VITE_NEON_AUTH_URL or NEON_AUTH_BASE_URL not set")
      return null
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/get-session`, {
      headers: {
        Cookie: cookie,
      },
    })

    if (!response.ok) return null
    const data = await response.json()
    return data as {
      session: {
        id: string
        expiresAt: string
        token: string
        createdAt: string
        updatedAt: string
        userId: string
      }
      user: {
        id: string
        name: string
        email: string
        emailVerified: boolean
        image?: string
        createdAt: string
        updatedAt: string
      }
    } | null
  } catch (error) {
    console.error("Failed to fetch session from Neon Auth:", error)
    return null
  }
})


