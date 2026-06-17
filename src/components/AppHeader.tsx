import { UserButton, OrganizationSwitcher } from "@clerk/tanstack-react-start"
import { HugeiconsIcon } from "@hugeicons/react"
import { BarcodeScanIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

type AppHeaderProps = {
  onScanClick?: () => void
}

export function AppHeader({ onScanClick }: AppHeaderProps) {
  return (
    <header className="flex gap-3">
      <OrganizationSwitcher hidePersonal />
      <div className="ml-auto flex items-center gap-2">
        <UserButton />
        {onScanClick && (
          <Button size="icon-lg" aria-label="Scan QR" onClick={onScanClick}>
            <HugeiconsIcon icon={BarcodeScanIcon} size={22} strokeWidth={1.8} />
          </Button>
        )}
      </div>
    </header>
  )
}
