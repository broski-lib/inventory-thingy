import {
  createFileRoute,
  notFound,
  useNavigate,
  Link,
} from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { HugeiconsIcon } from "@hugeicons/react"
import { QrCodeIcon, TransactionHistoryIcon } from "@hugeicons/core-free-icons"
import { TrashIcon, BoltIcon } from "@/components/icons"
import { getItemById, getLocations, getCategories } from "@/lib/inventory"
import { listTags } from "@/lib/tags"
import { useUpdateItem, useDeleteItem, useSetItemTags } from "@/lib/queries"
import { ItemForm } from "@/components/ItemForm"
import { BatchManager } from "@/components/BatchManager"
import { PageChrome } from "@/components/PageChrome"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/stock/$id/edit")({
  staleTime: 0,
  loader: async ({ params }) => {
    const [item, allTags, locations, categories] = await Promise.all([
      getItemById({ data: params.id }),
      listTags(),
      getLocations(),
      getCategories(),
    ])
    if (!item) throw notFound()
    return { item, allTags, locations, categories }
  },
  component: EditItemPage,
})

function EditItemPage() {
  const { item, allTags, locations, categories } = Route.useLoaderData()
  const navigate = useNavigate()
  const { has } = useAuth()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const submittingRef = useRef(false)
  const updateItemMutation = useUpdateItem()
  const deleteItemMutation = useDeleteItem()
  const setItemTagsMutation = useSetItemTags()

  const handleSubmit = async (
    data: Parameters<typeof updateItemMutation.mutateAsync>[0]["item"] & {
      tagIds: string[]
    }
  ) => {
    submittingRef.current = true
    setBusy(true)
    try {
      const { tagIds, ...patch } = data
      await updateItemMutation.mutateAsync({ id: item.id, item: patch })
      await setItemTagsMutation.mutateAsync({ itemId: item.id, tagIds })
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
      await deleteItemMutation.mutateAsync(item.id)
      navigate({ to: "/stock" })
    } catch (err) {
      submittingRef.current = false
      setBusy(false)
      alert(err instanceof Error ? err.message : "Could not delete item.")
    }
  }

  const handleConvertToBulk = async () => {
    if (!confirm(`Convert "${item.name}" to bulk stock? Its current location, status and condition will become the initial batch. You can manage batches after converting.`)) return
    submittingRef.current = true
    setBusy(true)
    try {
      await updateItemMutation.mutateAsync({
        id: item.id,
        item: { kind: "bulk" },
      })
      navigate({ to: "/stock" })
    } catch (err) {
      submittingRef.current = false
      setBusy(false)
      alert(err instanceof Error ? err.message : "Could not convert item.")
    }
  }

  return (
    <PageChrome
      title={item.name}
      dirty={dirty}
      submittingRef={submittingRef}
      subtitle={<span className="font-mono tracking-wider">{item.qrCode}</span>}
      aside={
        <div className="flex items-center gap-1">
          {item.kind === "unit" && (
            <button
              type="button"
              onClick={handleConvertToBulk}
              disabled={busy}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <BoltIcon />
              To bulk
            </button>
          )}
          <Link
            to="/stock/$id/history"
            params={{ id: item.id }}
            aria-label="View history"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "size-9 text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={TransactionHistoryIcon} size={18} strokeWidth={1.7} />
          </Link>
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
        key={item.id}
        initial={{
          qrCode: item.qrCode,
          name: item.name,
          description: item.description,
          condition: item.condition,
          location: item.location,
          category: item.category ?? "",
          status: item.status,
          kind: item.kind,
          quantity: 1,
          requiredRole: item.requiredRole,
          printSize: item.printSize,
          tagged: item.tagged,
        }}
        initialImageKey={item.imageKey}
        availableTags={allTags}
        locationSuggestions={locations}
        categories={categories}
        initialTagIds={item.tags.map((t) => t.id)}
        canSetRequiredRole={has({ role: "org:admin" })}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
        busy={busy}
        submitLabel="Save Changes"
        hideQrCode
      />
      {item.kind === "bulk" && (
        <BatchManager
          itemId={item.id}
          batches={item.batches}
          locationSuggestions={locations}
        />
      )}
    </PageChrome>
  )
}
