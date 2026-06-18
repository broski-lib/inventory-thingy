import * as React from "react"
import { useNavigate, useBlocker } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { useEdgeSwipe } from "@/hooks/use-edge-swipe"

type PageChromeProps = {
  title: string
  backTo: string
  /** When true, navigation away from this page triggers a confirm dialog
   *  and the browser beforeunload prompt. */
  dirty?: boolean
  /**
   * Mutable ref the parent sets to `true` while a form is submitting.
   * When true, the navigation blocker is bypassed so the user isn't
   * prompted "unsaved changes" after pressing Save. The ref is used
   * instead of state so the value is updated synchronously before
   * the parent calls `navigate(...)`.
   */
  submittingRef?: React.MutableRefObject<boolean>
  /** Optional content rendered below the title (e.g. QR code + status).
   *  Use for context that disambiguates which entity this page is for. */
  subtitle?: React.ReactNode
  /** Optional content rendered on the right side of the header
   *  (e.g. an Edit link, status badge). Kept distinct from subtitle so
   *  the title row stays semantically clear. */
  aside?: React.ReactNode
  children: React.ReactNode
}

/**
 * Shared page layout for form-style pages. Renders a sticky header
 * (back arrow + title), a content area that fills the rest of the
 * viewport, and an optional sticky footer inside the form body.
 *
 * Mobile: full-screen, everything below the header is part of the
 * scrolling body. Desktop (>= 768px): content is constrained to
 * max-w-2xl and centered.
 */
export function PageChrome({
  title,
  backTo,
  dirty = false,
  submittingRef,
  subtitle,
  aside,
  children,
}: PageChromeProps) {
  const navigate = useNavigate()

  // In-app navigation guard. useBlocker runs the predicate before any
  // router navigation (Link click, navigate(), back/forward) and
  // blocks it when the predicate returns true. The submitting ref
  // lets a form's Save handler bypass the guard so the user isn't
  // prompted "unsaved changes" after a successful save.
  useBlocker({
    shouldBlockFn: () => {
      if (submittingRef?.current) return false
      if (!dirty) return false
      return !window.confirm("You have unsaved changes. Leave anyway?")
    },
  })

  // Browser tab close / refresh guard. The beforeunload prompt is
  // browser-native and can't be styled, but it prevents accidental
  // data loss.
  React.useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const handleBack = React.useCallback(() => {
    navigate({ to: backTo })
  }, [navigate, backTo])

  // Edge-swipe back: swipe right from the left edge, or swipe left
  // from the right edge, to go back. Reachable by either thumb.
  useEdgeSwipe({ onSwipe: handleBack })

  return (
    <main className="bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
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
      <div className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-2xl pb-24">
        {children}
      </div>
    </main>
  )
}
