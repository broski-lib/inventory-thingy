import type { InventoryItem } from "@/components/ItemEditModal"
import { LocationIcon, ShieldIcon, EditIcon, QrIcon } from "@/components/icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { BoxIcon } from "@hugeicons/core-free-icons"

export function getStatusStyle(status: string): string {
  switch (status) {
    case "Available":
    case "In Storage":
      return "bg-emerald-50 text-emerald-700 border-emerald-100"
    case "Staged":
    case "Reserved":
      return "bg-amber-50 text-amber-700 border-amber-100"
    case "Repair":
      return "bg-rose-50 text-rose-700 border-rose-100"
    default:
      return "bg-slate-50 text-slate-700 border-slate-100"
  }
}

type ItemCardProps = {
  item: InventoryItem
  onClick: (item: InventoryItem) => void
  onLongPress?: (item: InventoryItem) => void
  size?: "sm" | "md"
}

export function ItemCard({ item, onClick, onLongPress, size = "md" }: ItemCardProps) {
  const dim = size === "sm" ? "size-14" : "size-16"
  return (
    <article
      onClick={() => onClick(item)}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress?.(item)
      }}
      className="rounded-xl border border-[#dfe3dc] bg-white p-3 shadow-xs hover:border-[#23312b] transition-all cursor-pointer flex gap-3"
    >
      <div className={`${dim} shrink-0 items-center justify-center rounded-lg bg-[#eef2ea] overflow-hidden flex border border-[#dfe3dc]`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
        ) : (
          <HugeiconsIcon icon={BoxIcon} size={size === "sm" ? 24 : 26} strokeWidth={1.5} className="text-[#23312b]" />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#20231f]">{item.name}</p>
            <p className="text-[10px] text-[#6d7569] font-mono mt-0.5">{item.qrCode}</p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${getStatusStyle(item.status)}`}>
            {item.status}
          </span>
        </div>
        {size === "md" && item.description && (
          <p className="text-[10px] text-[#6d7569] line-clamp-1 mt-1 font-light italic">
            {item.description}
          </p>
        )}
        <div className="flex justify-between items-center text-[10px] text-[#6d7569] mt-2 pt-1 border-t border-dashed border-[#f2f4f0]">
          <span className="truncate">
            <LocationIcon />
            {item.location}
          </span>
          <span className="font-semibold text-[#20231f]">
            <ShieldIcon />
            {item.condition}
          </span>
        </div>
        {onLongPress && (
          <div className="flex gap-1 mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClick(item)
              }}
              className="flex-1 h-7 text-[10px] font-semibold uppercase tracking-wider border border-[#dfe3dc] rounded text-[#20231f] hover:bg-neutral-50 cursor-pointer inline-flex items-center justify-center"
            >
              <EditIcon />
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onLongPress(item)
              }}
              className="flex-1 h-7 text-[10px] font-semibold uppercase tracking-wider border border-[#dfe3dc] rounded text-[#20231f] hover:bg-neutral-50 cursor-pointer inline-flex items-center justify-center"
            >
              <QrIcon className="size-3 mr-1" />
              QR
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
