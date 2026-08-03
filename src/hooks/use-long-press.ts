import { useCallback, useRef } from "react"
import type { TouchEvent as ReactTouchEvent, MouseEvent as ReactMouseEvent } from "react"

type LongPressOptions = {
  onLongPress: () => void
  delay?: number
  moveThreshold?: number
}

export function useLongPress({
  onLongPress,
  delay = 500,
  moveThreshold = 10,
}: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const onLongPressRef = useRef(onLongPress)
  onLongPressRef.current = onLongPress

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPosRef.current = null
  }, [])

  const onStart = useCallback(
    (x: number, y: number) => {
      firedRef.current = false
      startPosRef.current = { x, y }
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        onLongPressRef.current()
      }, delay)
    },
    [delay]
  )

  const onMove = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) return
      const dx = Math.abs(x - startPosRef.current.x)
      const dy = Math.abs(y - startPosRef.current.y)
      if (dx > moveThreshold || dy > moveThreshold) clear()
    },
    [clear, moveThreshold]
  )

  const onEnd = useCallback(() => {
    clear()
    const fired = firedRef.current
    firedRef.current = false
    return fired
  }, [clear])

  const handlers = {
    onTouchStart: (e: ReactTouchEvent) => {
      const t = e.touches[0]
      onStart(t.clientX, t.clientY)
    },
    onTouchMove: (e: ReactTouchEvent) => {
      const t = e.touches[0]
      onMove(t.clientX, t.clientY)
    },
    onTouchEnd: onEnd,
    onTouchCancel: onEnd,
    onMouseDown: (e: ReactMouseEvent) => {
      onStart(e.clientX, e.clientY)
    },
    onMouseUp: onEnd,
    onMouseLeave: clear,
  }

  const wasLongPress = useCallback(() => firedRef.current, [])

  return { handlers, wasLongPress }
}
