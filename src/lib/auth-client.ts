import { createAuthClient } from "@neondatabase/auth"
import { BetterAuthReactAdapter } from "@neondatabase/auth/react"
import { magicLinkClient } from "better-auth/client/plugins"
import { passkeyClient } from "@better-auth/passkey/client"

export const authClient = createAuthClient(
  import.meta.env.VITE_NEON_AUTH_URL || import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:3000",
  {
    adapter: BetterAuthReactAdapter({
      plugins: [
        magicLinkClient(),
        passkeyClient()
      ]
    } as any),
  }
)



