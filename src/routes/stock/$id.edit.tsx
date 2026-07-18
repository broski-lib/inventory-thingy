import {
  createFileRoute,
  notFound,
  useNavigate,
  Link,
} from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { HugeiconsIcon } from "@hugeicons/react"
import { QrCodeIcon } from "@hugeicons/core-free-icons"
import { TrashIcon } from "@/components/icons"
import { getItemById, updateItem, deleteItem } from "@/lib/inventory"
import { listTags, setItemTags } from "@/lib/tags"
import { ItemForm } from "@/components/ItemForm"
import { PageChrome } from "@/components/PageChrome"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/stock/$id/edit")({
  loader: async ({ params }) => {
    const [item, allTags] = await Promise.all([
      getItemById({ data: params.id }),
      listTags(),
    ])
    if (!item) throw notFound()
    return { item, allTags }
  },
  component: EditItemPage,
})

function EditItemPage() {
  const { item, allTags } = Route.useLoaderData()
  const navigate = useNavigate()
  const { has } = useAuth()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const submittingRef = useRef(false)

  const handleSubmit = async (
    data: Parameters<typeof updateItem>[0]["data"]["item"] & {
      tagIds: string[]
    }
  ) => {
    submittingRef.current = true
    setBusy(true)
    try {
      const { tagIds, ...patch } = data
      await updateItem({ data: { id: item.id, item: patch } })
      await setItemTags({ data: { itemId: item.id, tagIds } })
      navigate({ to: "/stock" })
    } catch (err) {
      submittingRef.current = false
      setBusy(false)
      throw err
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    submittingRef.current = true
    setBusy(true)
    try {
      await deleteItem({ data: item.id })
      navigate({ to: "/stock" })
    } catch (err) {
      submittingRef.current = false
      setBusy(false)
      alert(err instanceof Error ? err.message : "Could not delete item.")
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
          requiredRole: item.requiredRole,
        }}
        initialImageKey={item.imageKey}
        availableTags={allTags}
        initialTagIds={item.tags.map((t) => t.id)}
        canSetRequiredRole={has({ role: "org:admin" })}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
        busy={busy}
        submitLabel="Save Changes"
        hideQrCode
      />
    </PageChrome>
  )
}
