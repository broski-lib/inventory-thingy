import { createFileRoute, redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { auth } from "@clerk/tanstack-react-start/server"
import { OrganizationList } from "@clerk/tanstack-react-start"
import { Card, CardContent } from "@/components/ui/card"
import { authOnlyMiddleware } from "@/lib/auth-middleware"

const loadOnboarding = createServerFn({ method: "GET" })
  .middleware([authOnlyMiddleware])
  .handler(async ({ context }) => {
    const { orgId } = await auth()
    if (orgId) {
      throw redirect({ to: "/home" })
    }
    return { userId: context.userId }
  })

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => loadOnboarding(),
  component: OnboardingRoute,
})

function OnboardingRoute() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-secondary p-4 text-foreground">
      <Card className="w-full max-w-lg gap-6 p-6">
        <CardContent className="gap-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Join your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              Accept an invitation below, or create a new inventory workspace
              for your staging company.
            </p>
          </div>
          <OrganizationList
            hidePersonal
            skipInvitationScreen
            afterSelectOrganizationUrl="/home"
            afterCreateOrganizationUrl="/home"
          />
        </CardContent>
      </Card>
    </main>
  )
}
