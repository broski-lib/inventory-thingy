import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { getLocations, getCategories } from "@/lib/inventory"
import { listTags } from "@/lib/tags"
import { useCreateItem, useSetItemTags } from "@/lib/queries"
import { ItemForm, EMPTY_ITEM_FORM } from "@/components/ItemForm"
import { PageChrome } from "@/components/PageChrome"
import { generateQrCode } from "@/lib/ids"

type NewItemSearch = {
  qr?: string
}

export const Route = createFileRoute("/stock/new")({
  validateSearch: (search: Record<string, unknown>): NewItemSearch => ({
    qr: typeof search.qr === "string" ? search.qr : undefined,
  }),
  loader: async () => {
    const [allTags, locations, categories] = await Promise.all([listTags(), getLocations(), getCategories()])
    return { allTags, locations, categories }
  },
  component: NewItemPage,
})

function NewItemPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { allTags, locations, categories } = Route.useLoaderData()
  const { has } = useAuth()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const submittingRef = useRef(false)
  const createItemMutation = useCreateItem()
  const setItemTagsMutation = useSetItemTags()

  const handleSubmit = async (
    data: Parameters<typeof createItemMutation.mutateAsync>[0] & {
      tagIds: string[]
    }
  ) => {
    submittingRef.current = true
    setBusy(true)
    try {
      const { tagIds, ...item } = data
      const created = await createItemMutation.mutateAsync(item)
      if (tagIds.length > 0) {
        await setItemTagsMutation.mutateAsync({ itemId: created.id, tagIds })
      }
      navigate({ to: "/stock" })
    } catch (err) {
      submittingRef.current = false
      setBusy(false)
      throw err
    }
  }

  return (
    <PageChrome
      title="Register New Item"
      backTo="/stock"
      dirty={dirty}
      submittingRef={submittingRef}
    >
      <ItemForm
        initial={{
          ...EMPTY_ITEM_FORM,
          qrCode: search.qr?.trim() || generateQrCode(),
        }}
        availableTags={allTags}
        locationSuggestions={locations}
        categories={categories}
        canSetRequiredRole={has({ role: "org:admin" })}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
        busy={busy}
        submitLabel="Create Item"
      />
    </PageChrome>
  )
}
