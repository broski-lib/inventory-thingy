import { SignIn } from "@clerk/tanstack-react-start"
import { createLazyFileRoute } from "@tanstack/react-router"

export const Route = createLazyFileRoute("/login/$")({
  component: Page,
})

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <SignIn forceRedirectUrl="/home" />
    </div>
  )
}
