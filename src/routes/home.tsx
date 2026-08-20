import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { authRequiredMiddleware } from "@/lib/auth-middleware"
import { Skeleton } from "@/components/ui/skeleton"
import { AppHeader } from "@/components/AppHeader"
import { BottomNav } from "@/components/BottomNav"

const loadHome = createServerFn({ method: "GET" })
  .middleware([authRequiredMiddleware])
  .handler(async ({ context }) => {
    const { queryHomeData } = await import("@/lib/inventory")
    return queryHomeData(context.orgId)
  })

export const Route = createFileRoute("/home")({
  loader: async () => loadHome(),
  pendingComponent: HomeSkeleton,
})

function HomeSkeleton() {
  return (
    <main className="min-h-svh bg-secondary pb-24 text-foreground">
      <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <AppHeader />
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </section>
      <BottomNav />
    </main>
  )
}