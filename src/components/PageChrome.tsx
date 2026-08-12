import { useCallback, useRef } from "react"
import type { ReactNode } from "react"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { useEdgeSwipe } from "@/hooks/use-edge-swipe"

type PageChromeProps = {
  title: string
  backTo?: string | null
  backToParams?: Record<string, string>
  subtitle?: ReactNode
  aside?: ReactNode
  children: ReactNode
}

export function PageChrome({
  title,
  backTo,
  backToParams,
  subtitle,
  aside,
  children,
}: PageChromeProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const lastBack = useRef(0)

  const handleBack = useCallback(() => {
    const now = Date.now()
    if (now - lastBack.current < 500) return
    lastBack.current = now
    if (backTo) {
      navigate({ to: backTo, params: backToParams, replace: true } as never)
    } else {
      router.history.back()
    }
  }, [navigate, router, backTo, backToParams])

  useEdgeSwipe({ onSwipe: handleBack })

  return (
    <main className="bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-secondary">
        <div className="mx-auto h-[env(safe-area-inset-top)]" />
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.8} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {subtitle && (
              <div className="-mt-0.5 truncate text-[11px] text-muted-foreground">
                {subtitle}
              </div>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </header>
      <div className="mx-auto min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] max-w-2xl pb-24">
        {children}
      </div>
    </main>
  )
}
