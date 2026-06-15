import { useUser, UserButton } from "@clerk/tanstack-react-start"
import { HugeiconsIcon } from "@hugeicons/react"
import { BarcodeScanIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

type AppHeaderProps = {
  onScanClick?: () => void
}

export function AppHeader({ onScanClick }: AppHeaderProps) {
  const { user } = useUser()
  const displayName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "User"
  const displayEmail = user?.emailAddresses[0]?.emailAddress || ""

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {displayEmail}
        </p>
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
          Hi, {displayName}
        </h1>
      </div>
      <div className="flex items-center gap-2">
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
