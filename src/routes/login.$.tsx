import { SignIn } from "@clerk/tanstack-react-start"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { auth } from "@clerk/tanstack-react-start/server"

const loadLogin = createServerFn({ method: "GET" }).handler(async () => {
  // If the user is already signed in, don't show the sign-in form.
  // Users with an org go to /home; users without one still need to
  // pick a workspace, so we send them to /onboarding.
  const { isAuthenticated, orgId } = await auth()
  if (!isAuthenticated) return { ok: true as const }
  throw redirect({ to: orgId ? "/home" : "/onboarding" })
})

export const Route = createFileRoute("/login/$")({
  loader: async () => loadLogin(),
  component: Page,
})

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <SignIn forceRedirectUrl="/onboarding" />
    </div>
  )
}
