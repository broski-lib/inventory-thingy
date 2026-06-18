import { createFileRoute, notFound, Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { EditIcon, QrCodeIcon } from "@hugeicons/core-free-icons"
import { getItemById } from "@/lib/inventory"
import { ItemHistory } from "@/components/ItemHistory"
import { PageChrome } from "@/components/PageChrome"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/stock/$id/history")({
  loader: async ({ params }) => {
    const item = await getItemById({ data: params.id })
    if (!item) throw notFound()
    return { item }
  },
  component: ItemHistoryPage,
})

function ItemHistoryPage() {
  const { item } = Route.useLoaderData()
  return (
    <PageChrome
      title={item.name}
      backTo="/stock"
      subtitle={<span className="font-mono tracking-wider">{item.qrCode}</span>}
      aside={
        <div className="flex items-center gap-1">
          <Link
            to="/stock/$id/qr"
            params={{ id: item.id }}
            aria-label="Show QR"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-9 text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={QrCodeIcon} size={18} strokeWidth={1.7} />
          </Link>
          <Link
            to="/stock/$id/edit"
            params={{ id: item.id }}
            aria-label="Edit item"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-9 text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={EditIcon} size={18} strokeWidth={1.7} />
          </Link>
        </div>
      }
    >
      <ItemHistory itemId={item.id} />
    </PageChrome>
  )
}
