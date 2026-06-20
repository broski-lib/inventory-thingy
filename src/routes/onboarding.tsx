import { createFileRoute } from "@tanstack/react-router"
import { OrganizationList } from "@clerk/tanstack-react-start"
import { Card, CardContent } from "@/components/ui/card"
import { requireAuthedNoOrg } from "@/lib/auth-middleware"

export const Route = createFileRoute("/onboarding")({
  server: {
    middleware: [requireAuthedNoOrg],
  },
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
