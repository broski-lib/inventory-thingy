import { useUser, UserButton } from "@clerk/tanstack-react-start"
import { HugeiconsIcon } from "@hugeicons/react"
import { BarcodeScanIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"

type AppHeaderProps = {
  onScanClick?: () => void
}

export function AppHeader({ onScanClick }: AppHeaderProps) {
  const { user } = useUser()
  const displayName = user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "User"
  const displayEmail = user?.emailAddresses[0]?.emailAddress || ""

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-[0.18em] text-[#6d7569] uppercase">{displayEmail}</p>
        <h1 className="truncate text-2xl font-semibold tracking-normal">Hi, {displayName}</h1>
      </div>
      <div className="flex gap-2 items-center">
        <UserButton />
        {onScanClick && (
          <Button
            size="icon"
            className="size-11 rounded-lg bg-[#23312b] text-white hover:bg-[#1a2520] cursor-pointer"
            aria-label="Scan QR"
            onClick={onScanClick}
          >
            <HugeiconsIcon icon={BarcodeScanIcon} size={22} strokeWidth={1.8} />
          </Button>
        )}
      </div>
    </header>
  )
}
