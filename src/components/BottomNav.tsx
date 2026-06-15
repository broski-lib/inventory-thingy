import { Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { BarcodeScanIcon, BoxIcon, Home01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

export type Tab = "home" | "scan" | "stock"

type BottomNavProps = {
  active?: Tab
}

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-[#dfe3dc] bg-white/95 px-4 pt-2 pb-4 backdrop-blur z-40">
      <div className="grid grid-cols-3 gap-2">
        <Link to="/" search={{ focus: undefined }}>
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={`h-12 flex-col gap-1 rounded-lg text-xs cursor-pointer w-full ${
                isActive || active === "home" ? "text-[#23312b] font-bold" : "text-[#6d7569]"
              }`}
            >
              <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={1.7} />
              Home
            </Button>
          )}
        </Link>
        <Link to="/scan">
          {({ isActive }) => (
            <Button
              className={`h-12 rounded-lg cursor-pointer w-full ${
                isActive || active === "scan"
                  ? "bg-[#23312b] text-white hover:bg-[#1a2520]"
                  : "bg-transparent text-[#6d7569] border border-[#dfe3dc] hover:bg-neutral-50"
              }`}
            >
              <HugeiconsIcon icon={BarcodeScanIcon} size={20} strokeWidth={1.8} />
              Scan
            </Button>
          )}
        </Link>
        <Link to="/stock">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={`h-12 flex-col gap-1 rounded-lg text-xs cursor-pointer w-full ${
                isActive || active === "stock" ? "text-[#23312b] font-bold" : "text-[#6d7569]"
              }`}
            >
              <HugeiconsIcon icon={BoxIcon} size={20} strokeWidth={1.7} />
              Stock
            </Button>
          )}
        </Link>
      </div>
    </nav>
  )
}
