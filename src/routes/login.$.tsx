import { createFileRoute } from "@tanstack/react-router"
import { redirectIfAuthed } from "@/lib/auth-middleware"

export const Route = createFileRoute("/login/$")({
  server: {
    middleware: [redirectIfAuthed],
  },
})