import {
  createFileRoute,
  notFound,
  useNavigate,
  Link,
} from "@tanstack/react-router"
import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { QrCodeIcon } from "@hugeicons/core-free-icons"
import { TrashIcon } from "@/components/icons"
import { getItemById, updateItem, deleteItem } from "@/lib/inventory"
import { ItemForm } from "@/components/ItemForm"
import { PageChrome } from "@/components/PageChrome"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/stock/$id/edit")({
  loader: async ({ params }) => {
    const item = await getItemById({ data: params.id })
    if (!item) throw notFound()
    return { item }
  },
  component: EditItemPage,
})

function EditItemPage() {
  const { item } = Route.useLoaderData()
  const navigate = useNavigate()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const submittingRef = useRef(false)

  const handleSubmit = async (
    data: Parameters<typeof updateItem>[0]["data"]["item"]
  ) => {
    submittingRef.current = true
    setBusy(true)
    try {
      await updateItem({ data: { id: item.id, item: data } })
      navigate({ to: "/stock" })
    } catch {
      submittingRef.current = false
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    submittingRef.current = true
    setBusy(true)
    try {
      await deleteItem({ data: item.id })
      navigate({ to: "/stock" })
    } catch {
      submittingRef.current = false
      setBusy(false)
    }
  }

  return (
    <PageChrome
      title={item.name}
      backTo="/stock"
      dirty={dirty}
      submittingRef={submittingRef}
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
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Delete item"
            className="inline-flex size-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <TrashIcon className="size-4" />
          </button>
        </div>
      }
    >
      <ItemForm
        initial={{
          qrCode: item.qrCode,
          name: item.name,
          description: item.description,
          condition: item.condition,
          location: item.location,
          status: item.status,
        }}
        initialImageKey={item.imageKey}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
        busy={busy}
        submitLabel="Save Changes"
        hideQrCode
      />
    </PageChrome>
  )
}
