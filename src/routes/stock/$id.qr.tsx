import { createFileRoute, notFound, Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { EditIcon } from "@hugeicons/core-free-icons"
import { getItemById } from "@/lib/inventory"
import { QRTag } from "@/components/QRTag"
import { PageChrome } from "@/components/PageChrome"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/stock/$id/qr")({
  loader: async ({ params }) => {
    const item = await getItemById({ data: params.id })
    if (!item) throw notFound()
    return { item }
  },
  component: ItemQRPage,
})

function ItemQRPage() {
  const { item } = Route.useLoaderData()
  return (
    <PageChrome
      title={item.name}
      backTo="/stock/$id/edit"
      backToParams={{ id: item.id }}
      subtitle={<span className="font-mono tracking-wider">{item.qrCode}</span>}
      aside={
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
      }
    >
      <QRTag qrCode={item.qrCode} itemName={item.name} />
    </PageChrome>
  )
}
