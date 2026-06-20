import { SignIn } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"
import { redirectIfAuthed } from "@/lib/auth-middleware"

export const Route = createFileRoute("/login/$")({
  server: {
    middleware: [redirectIfAuthed],
  },
  component: Page,
})

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <SignIn forceRedirectUrl="/onboarding" />
    </div>
  )
}
