import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useAuth } from "@clerk/tanstack-react-start"
import { createItem } from "@/lib/inventory"
import { listTags, setItemTags } from "@/lib/tags"
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
    const allTags = await listTags()
    return { allTags }
  },
  component: NewItemPage,
})

function NewItemPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { allTags } = Route.useLoaderData()
  const { has } = useAuth()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (
    data: Parameters<typeof createItem>[0]["data"] & { tagIds: string[] }
  ) => {
    setBusy(true)
    try {
      const { tagIds, ...item } = data
      const created = await createItem({ data: item })
      if (tagIds.length > 0) {
        await setItemTags({ data: { itemId: created.id, tagIds } })
      }
      navigate({ to: "/stock" })
    } catch (err) {
      setBusy(false)
      throw err
    }
  }

  return (
    <PageChrome title="Register New Item" backTo="/stock" dirty={dirty}>
      <ItemForm
        initial={{
          ...EMPTY_ITEM_FORM,
          qrCode: search.qr?.trim() || generateQrCode(),
        }}
        availableTags={allTags}
        canSetRequiredRole={has({ role: "org:admin" })}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
        busy={busy}
        submitLabel="Create Item"
      />
    </PageChrome>
  )
}
