import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { createItem } from "@/lib/inventory"
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
  component: NewItemPage,
})

function NewItemPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (
    data: Parameters<typeof createItem>[0]["data"]
  ) => {
    setBusy(true)
    try {
      await createItem({ data })
      navigate({ to: "/stock" })
    } catch {
      setBusy(false)
    }
  }

  return (
    <PageChrome title="Register New Item" backTo="/stock" dirty={dirty}>
      <ItemForm
        initial={{
          ...EMPTY_ITEM_FORM,
          qrCode: search.qr?.trim() || generateQrCode(),
        }}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
        busy={busy}
        submitLabel="Create Item"
      />
    </PageChrome>
  )
}
