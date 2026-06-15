import { Link } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BarcodeScanIcon,
  BoxIcon,
  Home01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type Tab = "home" | "scan" | "stock"

type BottomNavProps = {
  active?: Tab
}

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/95 px-4 pt-2 pb-4 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        <Link to="/" search={{ focus: undefined }}>
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "h-12 w-full flex-col gap-1 text-xs",
                isActive || active === "home"
                  ? "font-bold text-primary"
                  : "text-muted-foreground"
              )}
            >
              <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={1.7} />
              Home
            </Button>
          )}
        </Link>
        <Link to="/scan">
          {({ isActive }) => (
            <Button
              className={cn(
                "h-12 w-full",
                isActive || active === "scan"
                  ? ""
                  : "border border-border bg-transparent text-muted-foreground hover:bg-secondary"
              )}
            >
              <HugeiconsIcon
                icon={BarcodeScanIcon}
                size={20}
                strokeWidth={1.8}
              />
              Scan
            </Button>
          )}
        </Link>
        <Link to="/stock">
          {({ isActive }) => (
            <Button
              variant="ghost"
              className={cn(
                "h-12 w-full flex-col gap-1 text-xs",
                isActive || active === "stock"
                  ? "font-bold text-primary"
                  : "text-muted-foreground"
              )}
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
