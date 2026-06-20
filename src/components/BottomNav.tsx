import { Link, useLocation } from "@tanstack/react-router"
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
  /**
   * Force a tab to look active regardless of the current pathname.
   * Useful for sibling routes that should highlight the same tab
   * (e.g. `/activity` highlights "home").
   */
  active?: Tab
}

/**
 * Resolve the active tab from the current pathname. `/activity` lives
 * under the home dashboard; everything else under `/stock` (and
 * children) belongs to the Stock tab.
 */
function tabForPath(pathname: string): Tab {
  if (pathname.startsWith("/stock")) return "stock"
  if (pathname.startsWith("/scan")) return "scan"
  return "home"
}

const ghostTabClass = "h-12 w-full flex-col gap-1 text-xs"
const activeTabClass = "font-bold text-primary"
const inactiveTabClass = "text-muted-foreground"

// Scan is the primary CTA in the bottom bar — rendered as a filled
// button when active and outlined when inactive so it visually pops
// out from the two ghost-styled tabs beside it.
const scanActiveClass = "h-12 w-full"
const scanInactiveClass =
  "h-12 w-full border border-border bg-transparent text-muted-foreground hover:bg-secondary"

export function BottomNav({ active: forcedActive }: BottomNavProps) {
  const { pathname } = useLocation()
  const derived = tabForPath(pathname)
  const active = forcedActive ?? derived

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/95 px-4 pt-2 pb-4 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        <Link to="/home">
          {({ isActive }) => {
            const isOn = isActive || active === "home"
            return (
              <Button
                variant="ghost"
                className={cn(
                  ghostTabClass,
                  isOn ? activeTabClass : inactiveTabClass
                )}
              >
                <HugeiconsIcon icon={Home01Icon} size={20} strokeWidth={1.7} />
                Home
              </Button>
            )
          }}
        </Link>
        <Link to="/scan">
          {({ isActive }) => {
            const isOn = isActive || active === "scan"
            return (
              <Button className={isOn ? scanActiveClass : scanInactiveClass}>
                <HugeiconsIcon
                  icon={BarcodeScanIcon}
                  size={20}
                  strokeWidth={1.8}
                />
                Scan
              </Button>
            )
          }}
        </Link>
        <Link to="/stock">
          {({ isActive }) => {
            const isOn = isActive || active === "stock"
            return (
              <Button
                variant="ghost"
                className={cn(
                  ghostTabClass,
                  isOn ? activeTabClass : inactiveTabClass
                )}
              >
                <HugeiconsIcon icon={BoxIcon} size={20} strokeWidth={1.7} />
                Stock
              </Button>
            )
          }}
        </Link>
      </div>
    </nav>
  )
}
