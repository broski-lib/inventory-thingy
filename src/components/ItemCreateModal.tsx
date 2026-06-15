import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { CloseIcon } from "@/components/icons"
import { generateQrCode } from "@/lib/ids"

type ItemCreateModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (item: {
    qrCode: string
    name: string
    description: string
    condition: string
    location: string
    status: string
    imageUrl: string
  }) => Promise<void>
  initialQrCode?: string
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&auto=format&fit=crop&q=60"

export function ItemCreateModal({ open, onClose, onSubmit, initialQrCode }: ItemCreateModalProps) {
  const [qrCode, setQrCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCondition, setFormCondition] = useState("Good")
  const [formLocation, setFormLocation] = useState("")
  const [formStatus, setFormStatus] = useState("In Storage")
  const [formImageUrl, setFormImageUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQrCode(initialQrCode?.trim() || generateQrCode())
    setFormName("")
    setFormDescription("")
    setFormCondition("Good")
    setFormLocation("")
    setFormStatus("In Storage")
    setFormImageUrl("")
    setError(null)
    setBusy(false)
  }, [open, initialQrCode])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrCode.trim() || !formName.trim() || !formLocation.trim()) {
      setError("QR Code, Name, and Location are required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        qrCode: qrCode.trim(),
        name: formName.trim(),
        description: formDescription.trim(),
        condition: formCondition,
        location: formLocation.trim(),
        status: formStatus,
        imageUrl: formImageUrl.trim() || DEFAULT_IMAGE,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item.")
      setBusy(false)
    }
  }

  const handleReroll = () => setQrCode(generateQrCode())

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-[#dfe3dc] shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[#dfe3dc] flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base text-[#20231f]">Register New Item</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-[#6d7569] font-mono">{qrCode || "—"}</p>
              <button
                type="button"
                onClick={handleReroll}
                className="text-[10px] text-[#23312b] hover:underline cursor-pointer font-semibold uppercase tracking-wider"
              >
                Re-roll
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
            aria-label="Close create modal"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-100 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Nolan boucle sofa"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full min-h-20 px-3 py-2 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm resize-none"
              placeholder="Elegant cream-colored fabric sofa..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
              >
                <option value="Available">Available</option>
                <option value="In Storage">In Storage</option>
                <option value="Reserved">Reserved</option>
                <option value="Staged">Staged</option>
                <option value="Repair">Repair</option>
                <option value="Retired">Retired</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Condition</label>
              <select
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value)}
                className="w-full h-11 px-2 border border-[#dfe3dc] rounded-lg bg-white outline-none focus:border-[#23312b] transition-colors text-xs text-[#20231f]"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Worn">Worn</option>
                <option value="Repair">Repair</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Location</label>
            <input
              type="text"
              required
              placeholder="e.g. Warehouse B, Aisle 3"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6d7569]">Image URL</label>
            <input
              type="text"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              className="w-full h-11 px-3 border border-[#dfe3dc] rounded-lg bg-transparent outline-none focus:border-[#23312b] transition-colors text-sm text-[#20231f]"
              placeholder="https://images.unsplash.com/... (optional)"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
              className="flex-1 h-11 border-[#dfe3dc] text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="flex-1 h-11 bg-[#23312b] text-white hover:bg-[#1a2520] text-xs font-semibold rounded-lg cursor-pointer"
            >
              {busy ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
