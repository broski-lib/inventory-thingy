import { SignUp } from "@clerk/tanstack-react-start"
import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/sign-up/$")({
  component: Page,
})

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <SignUp forceRedirectUrl="/home" />
    </div>
  )
}
