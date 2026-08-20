import {
  createLazyFileRoute,
  Link,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import { useDeleteRack } from "@/lib/queries"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PageChrome } from "@/components/PageChrome"
import { BottomNav } from "@/components/BottomNav"
import { PlusIcon, TrashIcon } from "@/components/icons"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

export const Route = createLazyFileRoute("/stock/racks/")({
  component: RacksListPage,
})

function RacksListPage() {
  const racks = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const deleteMutation = useDeleteRack()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete rack "${name}"? Items are not affected.`)) return
    setDeleting(id)
    try {
      await deleteMutation.mutateAsync(id)
      router.invalidate()
    } catch {
      setDeleting(null)
    }
  }

  return (
    <PageChrome title="Racks" backTo="/home">
      <div className="flex flex-col gap-4 p-4">
        <Link
          to="/stock/racks/new"
          className={cn(
            buttonVariants({ variant: "default" }),
            "h-11 w-full justify-center gap-2"
          )}
        >
          <PlusIcon />
          New rack
        </Link>

        {racks.length === 0 ? (
          <Card>
            <CardContent className="text-center">
              <p className="text-xs text-muted-foreground">
                No racks yet. Create one to start building rack sheets for your
                bulk items.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {racks.map((rack) => {
              const totalQty = rack.items.reduce((s, i) => s + i.rackQty, 0)
              return (
                <button
                  key={rack.id}
                  type="button"
                  disabled={deleting === rack.id}
                  onClick={() =>
                    navigate({
                      to: "/stock/racks/$id",
                      params: { id: rack.id },
                    })
                  }
                  className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">
                        {rack.name}
                      </h3>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {rack.location || "No location"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(rack.id, rack.name)
                      }}
                      disabled={deleting === rack.id}
                      aria-label={`Delete ${rack.name}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {rack.qrCode}
                    </span>
                    <Badge variant="neutral" className="text-[9px]">
                      {totalQty} {totalQty === 1 ? "unit" : "units"}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {rack.items.length}{" "}
                      {rack.items.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </PageChrome>
  )
}
