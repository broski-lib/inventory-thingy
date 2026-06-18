import { useEffect, useRef } from "react"

type EdgeSwipeOptions = {
  /** Action to invoke on a successful swipe-back. */
  onSwipe: () => void
  /** Width of the edge activation zone in pixels. Default 24. */
  edgeWidth?: number
  /**
   * Minimum horizontal distance (in px) the finger must travel before
   * the gesture is considered a swipe-back. Default 80.
   */
  threshold?: number
  /**
   * If true, ignore touches that started on a form control (input,
   * textarea, select, button, [role=button], [data-slot]). Default true.
   */
  ignoreInteractive?: boolean
}

/**
 * Returns a ref to attach to the page wrapper. Triggers `onSwipe` when
 * the user swipes horizontally inward from either screen edge.
 *
 * - Only touches starting within `edgeWidth` of the screen edge count.
 * - Vertical movement aborts the gesture so vertical scroll still works.
 * - Touches that begin on form controls are ignored so users can
 *   interact with inputs without accidentally navigating back.
 */
export function useEdgeSwipe({
  onSwipe,
  edgeWidth = 24,
  threshold = 80,
  ignoreInteractive = true,
}: EdgeSwipeOptions) {
  const onSwipeRef = useRef(onSwipe)

  useEffect(() => {
    onSwipeRef.current = onSwipe
  }, [onSwipe])

  useEffect(() => {
    let startX = 0
    let startY = 0
    let startEdge: "left" | "right" | null = null
    let active = false

    const isInteractive = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false
      if (target.closest("input, textarea, select")) return true
      if (target.closest("button, [role='button'], a")) return true
      if (target.closest("[data-slot]")) return true
      return false
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      const w = window.innerWidth
      if (ignoreInteractive && isInteractive(e.target)) return
      if (touch.clientX <= edgeWidth) startEdge = "left"
      else if (touch.clientX >= w - edgeWidth) startEdge = "right"
      else return
      startX = touch.clientX
      startY = touch.clientY
      active = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!active || !startEdge) return
      const touch = e.touches[0]
      const dx = touch.clientX - startX
      const dy = Math.abs(touch.clientY - startY)
      // Vertical scroll wins. Abort the back gesture if the user is
      // scrolling up/down by more than the threshold.
      if (dy > 12 && dy > Math.abs(dx)) {
        active = false
        startEdge = null
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!active || !startEdge) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX
      const dy = Math.abs(touch.clientY - startY)
      active = false
      const edge = startEdge
      startEdge = null
      // Direction must be inward and large enough.
      const inward = edge === "left" ? dx > threshold : -dx > threshold
      if (!inward || dy > 60) return
      onSwipeRef.current()
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("touchcancel", onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [edgeWidth, threshold, ignoreInteractive])
}
