import { SignUp } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"
import { redirectIfAuthed } from "@/lib/auth-middleware"

export const Route = createFileRoute("/sign-up/$")({
  server: {
    middleware: [redirectIfAuthed],
  },
  component: Page,
})

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <SignUp forceRedirectUrl="/onboarding" />
    </div>
  )
}
