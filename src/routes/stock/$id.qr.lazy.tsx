import { createLazyFileRoute, Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { EditIcon } from "@hugeicons/core-free-icons"
import { QRTag } from "@/components/QRTag"
import { PageChrome } from "@/components/PageChrome"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createLazyFileRoute("/stock/$id/qr")({
  component: ItemQRPage,
})

function ItemQRPage() {
  const { item } = Route.useLoaderData()
  return (
    <PageChrome
      title={item.name}
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
      <QRTag qrCode={item.qrCode} itemName={item.name} itemId={item.id} />
    </PageChrome>
  )
}
